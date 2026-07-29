-- Nexus Assets: provider-neutral metadata, private Supabase Storage adapter,
-- quotas, upload reservations and strict authorization.
--
-- This migration is additive. The feature remains disabled by default through
-- nexus_assets_v2_enabled and no existing object is moved.

DO $$
BEGIN
  CREATE TYPE public.asset_provider AS ENUM ('supabase', 'r2');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.asset_visibility AS ENUM ('private', 'workspace', 'campaign');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.asset_status AS ENUM ('pending', 'ready', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.asset_upload_status AS ENUM (
    'initiated',
    'uploading',
    'completed',
    'cancelled',
    'failed',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.campaigns'::regclass
      AND conname = 'campaigns_id_workspace_id_key'
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_id_workspace_id_key UNIQUE (id, workspace_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  campaign_id uuid,
  provider public.asset_provider NOT NULL DEFAULT 'supabase',
  bucket text NOT NULL,
  object_key text NOT NULL,
  original_name text NOT NULL,
  display_name text NOT NULL,
  mime_type text NOT NULL,
  extension text NOT NULL,
  size_bytes bigint NOT NULL,
  checksum text,
  width integer,
  height integer,
  duration_seconds numeric(12, 3),
  thumbnail_asset_id uuid,
  visibility public.asset_visibility NOT NULL DEFAULT 'private',
  status public.asset_status NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT assets_campaign_workspace_fkey
    FOREIGN KEY (campaign_id, workspace_id)
    REFERENCES public.campaigns(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT assets_provider_object_key_key UNIQUE (provider, bucket, object_key),
  CONSTRAINT assets_bucket_safe CHECK (
    bucket ~ '^[a-z0-9][a-z0-9._-]{1,62}$'
  ),
  CONSTRAINT assets_object_key_safe CHECK (
    length(object_key) BETWEEN 1 AND 512
    AND object_key !~ '(^|/)\\.\\.(/|$)'
    AND object_key !~ '[\\\\]'
    AND object_key !~ '^/'
  ),
  CONSTRAINT assets_names_safe CHECK (
    length(original_name) BETWEEN 1 AND 255
    AND length(display_name) BETWEEN 1 AND 255
  ),
  CONSTRAINT assets_extension_safe CHECK (
    extension = lower(extension)
    AND extension ~ '^[a-z0-9]{1,10}$'
  ),
  CONSTRAINT assets_size_valid CHECK (
    size_bytes > 0
    AND size_bytes <= 104857600
  ),
  CONSTRAINT assets_checksum_valid CHECK (
    checksum IS NULL OR checksum ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT assets_dimensions_valid CHECK (
    (width IS NULL OR width > 0)
    AND (height IS NULL OR height > 0)
    AND (duration_seconds IS NULL OR duration_seconds >= 0)
  ),
  CONSTRAINT assets_campaign_visibility_valid CHECK (
    visibility <> 'campaign'::public.asset_visibility OR campaign_id IS NOT NULL
  ),
  CONSTRAINT assets_metadata_object CHECK (jsonb_typeof(metadata) = 'object')
);

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_thumbnail_asset_id_fkey;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_thumbnail_asset_id_fkey
  FOREIGN KEY (thumbnail_asset_id)
  REFERENCES public.assets(id)
  ON DELETE SET NULL;

ALTER TABLE public.assets
  DROP CONSTRAINT IF EXISTS assets_thumbnail_not_self;
ALTER TABLE public.assets
  ADD CONSTRAINT assets_thumbnail_not_self
  CHECK (thumbnail_asset_id IS NULL OR thumbnail_asset_id <> id);

CREATE TABLE IF NOT EXISTS public.asset_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'attachment',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT asset_links_entity_type_valid CHECK (
    entity_type ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  CONSTRAINT asset_links_role_valid CHECK (
    role ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  CONSTRAINT asset_links_sort_order_valid CHECK (
    sort_order BETWEEN -100000 AND 100000
  ),
  CONSTRAINT asset_links_unique_usage UNIQUE (asset_id, entity_type, entity_id, role)
);

CREATE TABLE IF NOT EXISTS public.asset_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  variant_asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  variant_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT asset_variants_not_self CHECK (source_asset_id <> variant_asset_id),
  CONSTRAINT asset_variants_type_valid CHECK (
    variant_type ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  CONSTRAINT asset_variants_unique UNIQUE (source_asset_id, variant_asset_id, variant_type)
);

CREATE TABLE IF NOT EXISTS public.asset_workspace_quotas (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  provider public.asset_provider NOT NULL,
  max_total_bytes bigint NOT NULL,
  max_file_size_bytes bigint NOT NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, provider),
  CONSTRAINT asset_workspace_quotas_total_valid CHECK (
    max_total_bytes BETWEEN 1048576 AND 107374182400
  ),
  CONSTRAINT asset_workspace_quotas_file_valid CHECK (
    max_file_size_bytes BETWEEN 1024 AND 104857600
    AND max_file_size_bytes <= max_total_bytes
  )
);

CREATE TABLE IF NOT EXISTS public.asset_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expected_asset_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid,
  expected_provider public.asset_provider NOT NULL DEFAULT 'supabase',
  expected_bucket text NOT NULL,
  expected_key text NOT NULL,
  expected_mime text NOT NULL,
  expected_extension text NOT NULL,
  expected_size bigint NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '1 hour'),
  completed_at timestamptz,
  status public.asset_upload_status NOT NULL DEFAULT 'initiated',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  error_code text,
  CONSTRAINT asset_upload_sessions_campaign_workspace_fkey
    FOREIGN KEY (campaign_id, workspace_id)
    REFERENCES public.campaigns(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT asset_upload_sessions_expected_object_key_key
    UNIQUE (expected_provider, expected_bucket, expected_key),
  CONSTRAINT asset_upload_sessions_extension_safe CHECK (
    expected_extension = lower(expected_extension)
    AND expected_extension ~ '^[a-z0-9]{1,10}$'
  ),
  CONSTRAINT asset_upload_sessions_size_valid CHECK (
    expected_size > 0
    AND expected_size <= 104857600
  ),
  CONSTRAINT asset_upload_sessions_error_code_safe CHECK (
    error_code IS NULL OR error_code ~ '^[A-Z0-9_]{1,64}$'
  )
);

CREATE INDEX IF NOT EXISTS assets_workspace_created_idx
  ON public.assets (workspace_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS assets_campaign_created_idx
  ON public.assets (campaign_id, created_at DESC)
  WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS assets_creator_created_idx
  ON public.assets (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS assets_provider_status_idx
  ON public.assets (workspace_id, provider, status)
  INCLUDE (size_bytes);
CREATE INDEX IF NOT EXISTS assets_display_name_search_idx
  ON public.assets (workspace_id, lower(display_name) text_pattern_ops);
CREATE INDEX IF NOT EXISTS assets_thumbnail_asset_id_idx
  ON public.assets (thumbnail_asset_id)
  WHERE thumbnail_asset_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS asset_links_entity_idx
  ON public.asset_links (entity_type, entity_id, sort_order);
CREATE INDEX IF NOT EXISTS asset_links_asset_idx
  ON public.asset_links (asset_id);
CREATE INDEX IF NOT EXISTS asset_variants_variant_idx
  ON public.asset_variants (variant_asset_id);
CREATE INDEX IF NOT EXISTS asset_workspace_quotas_updated_by_idx
  ON public.asset_workspace_quotas (updated_by)
  WHERE updated_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS asset_upload_sessions_active_idx
  ON public.asset_upload_sessions (workspace_id, expected_provider, expires_at)
  INCLUDE (expected_size)
  WHERE status IN ('initiated', 'uploading');
CREATE INDEX IF NOT EXISTS asset_upload_sessions_user_created_idx
  ON public.asset_upload_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS asset_upload_sessions_campaign_idx
  ON public.asset_upload_sessions (campaign_id)
  WHERE campaign_id IS NOT NULL;

INSERT INTO public.asset_workspace_quotas (
  workspace_id,
  provider,
  max_total_bytes,
  max_file_size_bytes
)
SELECT
  workspace.id,
  provider.value,
  CASE provider.value
    WHEN 'r2'::public.asset_provider THEN 8589934592
    ELSE 536870912
  END,
  26214400
FROM public.workspaces workspace
CROSS JOIN (
  VALUES
    ('supabase'::public.asset_provider),
    ('r2'::public.asset_provider)
) AS provider(value)
ON CONFLICT (workspace_id, provider) DO NOTHING;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'nexus-assets',
  'nexus-assets',
  false,
  26214400,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/avif',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'video/mp4',
    'video/webm',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION private.asset_mime_matches_extension(
  target_mime text,
  target_extension text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT CASE lower(target_mime)
    WHEN 'image/png' THEN lower(target_extension) = 'png'
    WHEN 'image/jpeg' THEN lower(target_extension) IN ('jpg', 'jpeg')
    WHEN 'image/webp' THEN lower(target_extension) = 'webp'
    WHEN 'image/gif' THEN lower(target_extension) = 'gif'
    WHEN 'image/avif' THEN lower(target_extension) = 'avif'
    WHEN 'application/pdf' THEN lower(target_extension) = 'pdf'
    WHEN 'text/plain' THEN lower(target_extension) IN ('txt', 'log')
    WHEN 'text/markdown' THEN lower(target_extension) IN ('md', 'markdown')
    WHEN 'text/csv' THEN lower(target_extension) = 'csv'
    WHEN 'application/json' THEN lower(target_extension) = 'json'
    WHEN 'audio/mpeg' THEN lower(target_extension) IN ('mp3', 'mpeg')
    WHEN 'audio/ogg' THEN lower(target_extension) IN ('ogg', 'oga')
    WHEN 'audio/wav' THEN lower(target_extension) = 'wav'
    WHEN 'audio/webm' THEN lower(target_extension) = 'webm'
    WHEN 'video/mp4' THEN lower(target_extension) = 'mp4'
    WHEN 'video/webm' THEN lower(target_extension) = 'webm'
    WHEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      THEN lower(target_extension) = 'docx'
    WHEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      THEN lower(target_extension) = 'xlsx'
    WHEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      THEN lower(target_extension) = 'pptx'
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION private.can_read_asset(target_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assets asset
      WHERE asset.id = target_asset_id
        AND (
          private.is_app_admin()
          OR asset.created_by = (SELECT auth.uid())
          OR private.can_manage_workspace(asset.workspace_id)
          OR (
            asset.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(asset.campaign_id)
          )
          OR (
            asset.visibility = 'workspace'::public.asset_visibility
            AND private.can_access_workspace(asset.workspace_id)
          )
          OR (
            asset.visibility = 'campaign'::public.asset_visibility
            AND asset.campaign_id IS NOT NULL
            AND private.can_access_campaign(asset.campaign_id)
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_asset(target_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assets asset
      WHERE asset.id = target_asset_id
        AND (
          private.is_app_admin()
          OR asset.created_by = (SELECT auth.uid())
          OR private.can_manage_workspace(asset.workspace_id)
          OR (
            asset.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(asset.campaign_id)
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_curate_asset(target_asset_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.assets asset
      WHERE asset.id = target_asset_id
        AND (
          private.is_app_admin()
          OR private.can_manage_workspace(asset.workspace_id)
          OR (
            asset.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(asset.campaign_id)
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.validate_asset_upload_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  quota public.asset_workspace_quotas%ROWTYPE;
  used_bytes bigint;
  reserved_bytes bigint;
  expected_path text;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NEW.user_id <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_SESSION_UNAUTHORIZED';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.feature_flags flag
    WHERE flag.key = 'nexus_assets_v2_enabled'
      AND flag.enabled
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_FEATURE_DISABLED';
  END IF;

  IF NOT private.can_access_workspace(NEW.workspace_id) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_WORKSPACE_DENIED';
  END IF;

  IF NEW.campaign_id IS NOT NULL
    AND NOT private.can_access_campaign(NEW.campaign_id)
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_CAMPAIGN_DENIED';
  END IF;

  IF NEW.expected_provider = 'r2'::public.asset_provider
    AND NOT EXISTS (
      SELECT 1
      FROM public.feature_flags flag
      WHERE flag.key = 'nexus_r2_enabled'
        AND flag.enabled
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_R2_DISABLED';
  END IF;

  NEW.expected_extension := lower(NEW.expected_extension);
  expected_path :=
    NEW.workspace_id::text || '/' ||
    NEW.user_id::text || '/' ||
    NEW.expected_asset_id::text || '.' ||
    NEW.expected_extension;

  IF NEW.expected_key <> expected_path
    OR NEW.expected_key ~ '(^|/)\\.\\.(/|$)'
    OR NEW.expected_key ~ '[\\\\]'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_KEY_INVALID';
  END IF;

  IF NEW.expected_provider = 'supabase'::public.asset_provider
    AND NEW.expected_bucket <> 'nexus-assets'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_BUCKET_INVALID';
  END IF;

  IF NOT private.asset_mime_matches_extension(
    NEW.expected_mime,
    NEW.expected_extension
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_TYPE_INVALID';
  END IF;

  INSERT INTO public.asset_workspace_quotas (
    workspace_id,
    provider,
    max_total_bytes,
    max_file_size_bytes
  )
  VALUES (
    NEW.workspace_id,
    NEW.expected_provider,
    CASE NEW.expected_provider
      WHEN 'r2'::public.asset_provider THEN 8589934592
      ELSE 536870912
    END,
    26214400
  )
  ON CONFLICT (workspace_id, provider) DO NOTHING;

  SELECT *
  INTO quota
  FROM public.asset_workspace_quotas
  WHERE workspace_id = NEW.workspace_id
    AND provider = NEW.expected_provider
  FOR UPDATE;

  IF NEW.expected_size > quota.max_file_size_bytes THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_FILE_TOO_LARGE';
  END IF;

  SELECT coalesce(sum(asset.size_bytes), 0)
  INTO used_bytes
  FROM public.assets asset
  WHERE asset.workspace_id = NEW.workspace_id
    AND asset.provider = NEW.expected_provider
    AND asset.status = 'ready'::public.asset_status;

  SELECT coalesce(sum(session.expected_size), 0)
  INTO reserved_bytes
  FROM public.asset_upload_sessions session
  WHERE session.workspace_id = NEW.workspace_id
    AND session.expected_provider = NEW.expected_provider
    AND session.status IN (
      'initiated'::public.asset_upload_status,
      'uploading'::public.asset_upload_status
    )
    AND session.expires_at > clock_timestamp();

  IF used_bytes + reserved_bytes + NEW.expected_size > quota.max_total_bytes THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_WORKSPACE_QUOTA_EXCEEDED';
  END IF;

  NEW.status := 'initiated'::public.asset_upload_status;
  NEW.completed_at := NULL;
  NEW.error_code := NULL;
  NEW.expires_at := clock_timestamp() + interval '1 hour';
  NEW.created_at := clock_timestamp();
  NEW.updated_at := NEW.created_at;
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.guard_asset_upload_session_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed'::public.asset_upload_status
    AND OLD.status <> 'completed'::public.asset_upload_status
    AND coalesce(current_setting('nexus.asset_finalizing', true), '') <> 'true'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_SESSION_COMPLETION_DENIED';
  END IF;

  IF coalesce(current_setting('nexus.asset_finalizing', true), '') <> 'true'
    AND NEW.status NOT IN (
      'uploading'::public.asset_upload_status,
      'cancelled'::public.asset_upload_status,
      'failed'::public.asset_upload_status
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_SESSION_STATUS_INVALID';
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.finalize_asset_from_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  upload_session public.asset_upload_sessions%ROWTYPE;
  stored_object storage.objects%ROWTYPE;
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

  IF NEW.provider <> 'supabase'::public.asset_provider THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_PROVIDER_NOT_READY';
  END IF;

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

CREATE OR REPLACE FUNCTION private.guard_asset_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (
    NEW.workspace_id,
    NEW.campaign_id,
    NEW.provider,
    NEW.bucket,
    NEW.object_key,
    NEW.original_name,
    NEW.mime_type,
    NEW.extension,
    NEW.size_bytes,
    NEW.created_by,
    NEW.created_at,
    NEW.status
  ) IS DISTINCT FROM (
    OLD.workspace_id,
    OLD.campaign_id,
    OLD.provider,
    OLD.bucket,
    OLD.object_key,
    OLD.original_name,
    OLD.mime_type,
    OLD.extension,
    OLD.size_bytes,
    OLD.created_by,
    OLD.created_at,
    OLD.status
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_IMMUTABLE_FIELDS';
  END IF;

  IF OLD.deleted_at IS NULL
    AND NEW.deleted_at IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.asset_links link
      WHERE link.asset_id = OLD.id
    )
    AND coalesce(current_setting('nexus.asset_force_delete', true), '') <> 'true'
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_IN_USE';
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION private.validate_asset_variant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_workspace_id uuid;
  variant_workspace_id uuid;
BEGIN
  SELECT workspace_id
  INTO source_workspace_id
  FROM public.assets
  WHERE id = NEW.source_asset_id;

  SELECT workspace_id
  INTO variant_workspace_id
  FROM public.assets
  WHERE id = NEW.variant_asset_id;

  IF source_workspace_id IS NULL
    OR variant_workspace_id IS NULL
    OR source_workspace_id <> variant_workspace_id
  THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_VARIANT_SCOPE_MISMATCH';
  END IF;

  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.soft_delete_asset(
  target_asset_id uuid,
  force_delete boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  changed_id uuid;
BEGIN
  PERFORM set_config(
    'nexus.asset_force_delete',
    CASE WHEN force_delete THEN 'true' ELSE 'false' END,
    true
  );

  UPDATE public.assets
  SET deleted_at = clock_timestamp()
  WHERE id = target_asset_id
    AND deleted_at IS NULL
  RETURNING id INTO changed_id;

  RETURN changed_id IS NOT NULL;
END
$$;

CREATE OR REPLACE FUNCTION public.restore_asset(target_asset_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  changed_id uuid;
BEGIN
  UPDATE public.assets
  SET deleted_at = NULL
  WHERE id = target_asset_id
    AND deleted_at IS NOT NULL
  RETURNING id INTO changed_id;

  RETURN changed_id IS NOT NULL;
END
$$;

DROP TRIGGER IF EXISTS validate_asset_upload_session_trigger
  ON public.asset_upload_sessions;
CREATE TRIGGER validate_asset_upload_session_trigger
  BEFORE INSERT ON public.asset_upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_asset_upload_session();

DROP TRIGGER IF EXISTS guard_asset_upload_session_update_trigger
  ON public.asset_upload_sessions;
CREATE TRIGGER guard_asset_upload_session_update_trigger
  BEFORE UPDATE ON public.asset_upload_sessions
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_asset_upload_session_update();

DROP TRIGGER IF EXISTS finalize_asset_from_upload_trigger
  ON public.assets;
CREATE TRIGGER finalize_asset_from_upload_trigger
  BEFORE INSERT ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION private.finalize_asset_from_upload();

DROP TRIGGER IF EXISTS guard_asset_update_trigger
  ON public.assets;
CREATE TRIGGER guard_asset_update_trigger
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_asset_update();

DROP TRIGGER IF EXISTS validate_asset_variant_trigger
  ON public.asset_variants;
CREATE TRIGGER validate_asset_variant_trigger
  BEFORE INSERT OR UPDATE ON public.asset_variants
  FOR EACH ROW
  EXECUTE FUNCTION private.validate_asset_variant();

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_workspace_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_upload_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Assets: authorized read" ON public.assets;
CREATE POLICY "Assets: authorized read"
  ON public.assets FOR SELECT
  TO authenticated
  USING ((SELECT private.can_read_asset(id)));

DROP POLICY IF EXISTS "Assets: verified upload insert" ON public.assets;
CREATE POLICY "Assets: verified upload insert"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND status = 'ready'::public.asset_status
    AND EXISTS (
      SELECT 1
      FROM public.asset_upload_sessions session
      WHERE session.expected_asset_id = id
        AND session.user_id = (SELECT auth.uid())
        AND session.status = 'completed'::public.asset_upload_status
    )
  );

DROP POLICY IF EXISTS "Assets: authorized update" ON public.assets;
CREATE POLICY "Assets: authorized update"
  ON public.assets FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_asset(id)))
  WITH CHECK ((SELECT private.can_manage_asset(id)));

DROP POLICY IF EXISTS "Asset links: authorized read" ON public.asset_links;
CREATE POLICY "Asset links: authorized read"
  ON public.asset_links FOR SELECT
  TO authenticated
  USING ((SELECT private.can_read_asset(asset_id)));

DROP POLICY IF EXISTS "Asset links: curators insert" ON public.asset_links;
CREATE POLICY "Asset links: curators insert"
  ON public.asset_links FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_curate_asset(asset_id)));

DROP POLICY IF EXISTS "Asset links: curators update" ON public.asset_links;
CREATE POLICY "Asset links: curators update"
  ON public.asset_links FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_curate_asset(asset_id)))
  WITH CHECK ((SELECT private.can_curate_asset(asset_id)));

DROP POLICY IF EXISTS "Asset links: curators delete" ON public.asset_links;
CREATE POLICY "Asset links: curators delete"
  ON public.asset_links FOR DELETE
  TO authenticated
  USING ((SELECT private.can_curate_asset(asset_id)));

DROP POLICY IF EXISTS "Asset variants: authorized read" ON public.asset_variants;
CREATE POLICY "Asset variants: authorized read"
  ON public.asset_variants FOR SELECT
  TO authenticated
  USING (
    (SELECT private.can_read_asset(source_asset_id))
    AND (SELECT private.can_read_asset(variant_asset_id))
  );

DROP POLICY IF EXISTS "Asset variants: curators insert" ON public.asset_variants;
CREATE POLICY "Asset variants: curators insert"
  ON public.asset_variants FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.can_curate_asset(source_asset_id))
    AND (SELECT private.can_read_asset(variant_asset_id))
  );

DROP POLICY IF EXISTS "Asset variants: curators delete" ON public.asset_variants;
CREATE POLICY "Asset variants: curators delete"
  ON public.asset_variants FOR DELETE
  TO authenticated
  USING ((SELECT private.can_curate_asset(source_asset_id)));

DROP POLICY IF EXISTS "Asset quotas: workspace members read"
  ON public.asset_workspace_quotas;
CREATE POLICY "Asset quotas: workspace members read"
  ON public.asset_workspace_quotas FOR SELECT
  TO authenticated
  USING ((SELECT private.can_access_workspace(workspace_id)));

DROP POLICY IF EXISTS "Asset quotas: workspace managers update"
  ON public.asset_workspace_quotas;
CREATE POLICY "Asset quotas: workspace managers update"
  ON public.asset_workspace_quotas FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_workspace(workspace_id)))
  WITH CHECK ((SELECT private.can_manage_workspace(workspace_id)));

DROP POLICY IF EXISTS "Asset sessions: own or managers read"
  ON public.asset_upload_sessions;
CREATE POLICY "Asset sessions: own or managers read"
  ON public.asset_upload_sessions FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.can_manage_workspace(workspace_id))
  );

DROP POLICY IF EXISTS "Asset sessions: members reserve"
  ON public.asset_upload_sessions;
CREATE POLICY "Asset sessions: members reserve"
  ON public.asset_upload_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (SELECT private.can_access_workspace(workspace_id))
    AND (
      campaign_id IS NULL
      OR (SELECT private.can_access_campaign(campaign_id))
    )
  );

DROP POLICY IF EXISTS "Asset sessions: owners update"
  ON public.asset_upload_sessions;
CREATE POLICY "Asset sessions: owners update"
  ON public.asset_upload_sessions FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Nexus assets: reserved uploads" ON storage.objects;
CREATE POLICY "Nexus assets: reserved uploads"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'nexus-assets'
    AND EXISTS (
      SELECT 1
      FROM public.asset_upload_sessions session
      WHERE session.expected_provider = 'supabase'::public.asset_provider
        AND session.expected_bucket = bucket_id
        AND session.expected_key = name
        AND session.user_id = (SELECT auth.uid())
        AND session.status IN (
          'initiated'::public.asset_upload_status,
          'uploading'::public.asset_upload_status
        )
        AND session.expires_at > clock_timestamp()
    )
  );

DROP POLICY IF EXISTS "Nexus assets: authorized downloads" ON storage.objects;
CREATE POLICY "Nexus assets: authorized downloads"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'nexus-assets'
    AND (
      EXISTS (
        SELECT 1
        FROM public.assets asset
        WHERE asset.provider = 'supabase'::public.asset_provider
          AND asset.bucket = bucket_id
          AND asset.object_key = name
          AND asset.status = 'ready'::public.asset_status
          AND asset.deleted_at IS NULL
          AND (SELECT private.can_read_asset(asset.id))
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        WHERE workspace.id::text = (storage.foldername(name))[1]
          AND (SELECT private.can_manage_workspace(workspace.id))
      )
    )
  );

DROP POLICY IF EXISTS "Nexus assets: confirmed removals" ON storage.objects;
CREATE POLICY "Nexus assets: confirmed removals"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'nexus-assets'
    AND EXISTS (
      SELECT 1
      FROM public.assets asset
      WHERE asset.provider = 'supabase'::public.asset_provider
        AND asset.bucket = bucket_id
        AND asset.object_key = name
        AND asset.deleted_at IS NOT NULL
        AND (SELECT private.can_manage_asset(asset.id))
    )
  );

CREATE OR REPLACE VIEW public.asset_workspace_usage
WITH (security_invoker = true)
AS
SELECT
  asset.workspace_id,
  asset.provider,
  count(*) FILTER (
    WHERE asset.status = 'ready'::public.asset_status
      AND asset.deleted_at IS NULL
  )::bigint AS active_file_count,
  coalesce(sum(asset.size_bytes) FILTER (
    WHERE asset.status = 'ready'::public.asset_status
      AND asset.deleted_at IS NULL
  ), 0)::bigint AS active_bytes,
  count(*) FILTER (
    WHERE asset.status = 'ready'::public.asset_status
      AND asset.deleted_at IS NOT NULL
  )::bigint AS deleted_file_count,
  coalesce(sum(asset.size_bytes) FILTER (
    WHERE asset.status = 'ready'::public.asset_status
      AND asset.deleted_at IS NOT NULL
  ), 0)::bigint AS deleted_bytes
FROM public.assets asset
GROUP BY asset.workspace_id, asset.provider;

REVOKE ALL ON TABLE
  public.assets,
  public.asset_links,
  public.asset_variants,
  public.asset_workspace_quotas,
  public.asset_upload_sessions
FROM anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.assets TO authenticated;
GRANT UPDATE (
  display_name,
  checksum,
  width,
  height,
  duration_seconds,
  thumbnail_asset_id,
  visibility,
  deleted_at,
  metadata
) ON TABLE public.assets TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.asset_links
  TO authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.asset_variants
  TO authenticated;
GRANT SELECT
  ON TABLE public.asset_workspace_quotas
  TO authenticated;
GRANT UPDATE (
  max_total_bytes,
  max_file_size_bytes,
  updated_by
) ON TABLE public.asset_workspace_quotas
  TO authenticated;
GRANT SELECT, INSERT
  ON TABLE public.asset_upload_sessions
  TO authenticated;
GRANT UPDATE (status, error_code)
  ON TABLE public.asset_upload_sessions
  TO authenticated;
GRANT SELECT
  ON TABLE public.asset_workspace_usage
  TO authenticated;

REVOKE ALL ON FUNCTION private.asset_mime_matches_extension(text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.can_read_asset(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_asset(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_curate_asset(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.validate_asset_upload_session()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_asset_upload_session_update()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.finalize_asset_from_upload()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.guard_asset_update()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_asset_variant()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION private.can_read_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_asset(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_curate_asset(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.soft_delete_asset(uuid, boolean)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_asset(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.soft_delete_asset(uuid, boolean)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_asset(uuid)
  TO authenticated;

COMMENT ON TABLE public.assets IS
  'Provider-neutral Nexus Assets catalog. Binary content remains in object storage.';
COMMENT ON TABLE public.asset_links IS
  'Polymorphic usage registry showing where an asset is attached.';
COMMENT ON TABLE public.asset_variants IS
  'Relationships between source assets and generated thumbnails or previews.';
COMMENT ON TABLE public.asset_workspace_quotas IS
  'Configurable internal limits per workspace and provider.';
COMMENT ON TABLE public.asset_upload_sessions IS
  'Short-lived upload reservations used to enforce paths, MIME types and quotas.';
COMMENT ON VIEW public.asset_workspace_usage IS
  'RLS-aware asset usage summary. Deleted objects still count until purged.';

NOTIFY pgrst, 'reload schema';
