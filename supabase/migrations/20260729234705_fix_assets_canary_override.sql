-- Keep the upload trigger aligned with global-or-user canary resolution.
-- R2 remains separately gated by its global flag.

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

  IF NOT private.is_feature_enabled('nexus_assets_v2_enabled') THEN
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

  IF NOT (
    private.can_contribute_workspace(NEW.workspace_id)
    OR (
      NEW.campaign_id IS NOT NULL
      AND private.can_contribute_campaign(NEW.campaign_id)
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'ASSET_UPLOAD_DENIED';
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

COMMENT ON FUNCTION private.validate_asset_upload_session() IS
  'Validates Supabase or R2 upload reservations, quotas and canonical object keys while honoring the resolved Nexus Assets feature flag.';
