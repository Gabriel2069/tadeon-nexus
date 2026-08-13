CREATE OR REPLACE FUNCTION private.can_finalize_asset_catalog_row(
  target_asset_id uuid,
  target_workspace_id uuid,
  target_campaign_id uuid,
  target_provider public.asset_provider,
  target_bucket text,
  target_object_key text,
  target_mime_type text,
  target_extension text,
  target_size_bytes bigint
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.asset_upload_sessions AS upload_session
      WHERE upload_session.expected_asset_id = target_asset_id
        AND upload_session.user_id = (SELECT auth.uid())
        AND upload_session.workspace_id = target_workspace_id
        AND upload_session.campaign_id IS NOT DISTINCT FROM target_campaign_id
        AND upload_session.expected_provider = target_provider
        AND upload_session.expected_bucket = target_bucket
        AND upload_session.expected_key = target_object_key
        AND upload_session.expected_mime = target_mime_type
        AND upload_session.expected_extension = target_extension
        AND upload_session.expected_size = target_size_bytes
        AND (
          (
            upload_session.status IN (
              'initiated'::public.asset_upload_status,
              'uploading'::public.asset_upload_status
            )
            AND upload_session.expires_at > statement_timestamp()
          )
          OR (
            upload_session.status = 'completed'::public.asset_upload_status
            AND upload_session.completed_at IS NOT NULL
          )
        )
    );
$$;
