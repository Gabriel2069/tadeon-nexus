-- R2 completion attestation.
--
-- The browser reserves an upload with its own JWT. After a direct R2 upload,
-- the Cloudflare Worker verifies the object and writes a short-lived
-- confirmation with a server-only Supabase secret. The normal user JWT then
-- registers the asset and this trigger consumes the confirmation.

CREATE TABLE IF NOT EXISTS public.r2_asset_confirmations (
  session_id uuid PRIMARY KEY
    REFERENCES public.asset_upload_sessions(id)
    ON DELETE CASCADE,
  asset_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  object_key text NOT NULL,
  mime_type text NOT NULL,
  extension text NOT NULL,
  size_bytes bigint NOT NULL,
  etag text,
  confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '10 minutes'),
  CONSTRAINT r2_asset_confirmations_expiry_valid CHECK (
    expires_at > confirmed_at
    AND expires_at <= confirmed_at + interval '15 minutes'
  ),
  CONSTRAINT r2_asset_confirmations_size_valid CHECK (
    size_bytes > 0
    AND size_bytes <= 104857600
  ),
  CONSTRAINT r2_asset_confirmations_key_safe CHECK (
    length(object_key) BETWEEN 1 AND 512
    AND object_key !~ '(^|/)\\.\\.(/|$)'
    AND object_key !~ '[\\\\]'
    AND object_key !~ '^/'
  )
);

CREATE INDEX IF NOT EXISTS r2_asset_confirmations_expires_idx
  ON public.r2_asset_confirmations (expires_at);
CREATE INDEX IF NOT EXISTS r2_asset_confirmations_user_idx
  ON public.r2_asset_confirmations (user_id);
CREATE INDEX IF NOT EXISTS r2_asset_confirmations_workspace_idx
  ON public.r2_asset_confirmations (workspace_id);

ALTER TABLE public.r2_asset_confirmations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.r2_asset_confirmations
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.r2_asset_confirmations
  TO service_role;

CREATE OR REPLACE FUNCTION private.finalize_asset_from_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  upload_session public.asset_upload_sessions%ROWTYPE;
  stored_object storage.objects%ROWTYPE;
  r2_confirmation public.r2_asset_confirmations%ROWTYPE;
  actual_size bigint;
  actual_mime text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NEW.created_by <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_CREATE_UNAUTHORIZED';
  END IF;

  SELECT session.*
  INTO upload_session
  FROM public.asset_upload_sessions session
  WHERE session.expected_asset_id = NEW.id
    AND session.user_id = (SELECT auth.uid())
    AND session.workspace_id = NEW.workspace_id
    AND session.campaign_id IS NOT DISTINCT FROM NEW.campaign_id
    AND session.expected_provider = NEW.provider
    AND session.expected_bucket = NEW.bucket
    AND session.expected_key = NEW.object_key
    AND session.expected_mime = NEW.mime_type
    AND session.expected_extension = NEW.extension
    AND session.expected_size = NEW.size_bytes
    AND session.status IN (
      'initiated'::public.asset_upload_status,
      'uploading'::public.asset_upload_status
    )
    AND session.expires_at > clock_timestamp()
  FOR UPDATE;

  IF upload_session.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_SESSION_NOT_FOUND';
  END IF;

  IF NEW.provider = 'supabase'::public.asset_provider THEN
    SELECT object.*
    INTO stored_object
    FROM storage.objects object
    WHERE object.bucket_id = NEW.bucket
      AND object.name = NEW.object_key
    LIMIT 1;

    IF stored_object.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_OBJECT_NOT_FOUND';
    END IF;

    actual_size := CASE
      WHEN coalesce(stored_object.metadata->>'size', '') ~ '^[0-9]+$'
        THEN (stored_object.metadata->>'size')::bigint
      ELSE -1
    END;
    actual_mime := lower(coalesce(stored_object.metadata->>'mimetype', ''));

    IF actual_size <> NEW.size_bytes THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_SIZE_MISMATCH';
    END IF;

    IF actual_mime <> lower(NEW.mime_type)
      OR NOT private.asset_mime_matches_extension(NEW.mime_type, NEW.extension)
    THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_TYPE_MISMATCH';
    END IF;
  ELSIF NEW.provider = 'r2'::public.asset_provider THEN
    SELECT confirmation.*
    INTO r2_confirmation
    FROM public.r2_asset_confirmations confirmation
    WHERE confirmation.session_id = upload_session.id
      AND confirmation.asset_id = NEW.id
      AND confirmation.user_id = (SELECT auth.uid())
      AND confirmation.workspace_id = NEW.workspace_id
      AND confirmation.bucket = NEW.bucket
      AND confirmation.object_key = NEW.object_key
      AND confirmation.mime_type = NEW.mime_type
      AND confirmation.extension = NEW.extension
      AND confirmation.size_bytes = NEW.size_bytes
      AND confirmation.expires_at > clock_timestamp()
    FOR UPDATE;

    IF r2_confirmation.session_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'ASSET_R2_CONFIRMATION_REQUIRED';
    END IF;

    IF NOT private.asset_mime_matches_extension(NEW.mime_type, NEW.extension) THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_TYPE_MISMATCH';
    END IF;

    DELETE FROM public.r2_asset_confirmations confirmation
    WHERE confirmation.session_id = r2_confirmation.session_id;
  ELSE
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_PROVIDER_NOT_READY';
  END IF;

  NEW.status := 'ready'::public.asset_status;
  NEW.created_at := clock_timestamp();
  NEW.updated_at := NEW.created_at;

  PERFORM set_config('nexus.asset_finalizing', 'true', true);
  UPDATE public.asset_upload_sessions
  SET
    status = 'completed'::public.asset_upload_status,
    completed_at = clock_timestamp(),
    error_code = NULL
  WHERE id = upload_session.id;

  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION private.finalize_asset_from_upload()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.r2_asset_confirmations IS
  'Short-lived R2 HEAD attestations written only by the Cloudflare Worker service credential.';
