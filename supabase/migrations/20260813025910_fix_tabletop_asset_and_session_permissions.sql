-- Asset catalog insertion runs after private.finalize_asset_from_upload() has
-- changed the reservation to completed. Match that trigger-finalized state and
-- bind every reserved field to the catalog row.
DROP POLICY IF EXISTS "Assets: verified upload insert" ON public.assets;

CREATE POLICY "Assets: verified upload insert"
ON public.assets
FOR INSERT
TO authenticated
WITH CHECK (
  assets.created_by = (SELECT auth.uid())
  AND assets.status = 'ready'::public.asset_status
  AND EXISTS (
    SELECT 1
    FROM public.asset_upload_sessions AS upload_session
    WHERE upload_session.expected_asset_id = assets.id
      AND upload_session.user_id = (SELECT auth.uid())
      AND upload_session.workspace_id = assets.workspace_id
      AND upload_session.campaign_id IS NOT DISTINCT FROM assets.campaign_id
      AND upload_session.expected_provider = assets.provider
      AND upload_session.expected_bucket = assets.bucket
      AND upload_session.expected_key = assets.object_key
      AND upload_session.expected_mime = assets.mime_type
      AND upload_session.expected_extension = assets.extension
      AND upload_session.expected_size = assets.size_bytes
      AND upload_session.status = 'completed'::public.asset_upload_status
      AND upload_session.completed_at IS NOT NULL
  )
);

-- tabletop_sessions_director_state_check invokes this immutable validator
-- during INSERT. Keep it private while allowing the roles that write sessions.
REVOKE ALL ON FUNCTION private.is_valid_tabletop_director_state(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_valid_tabletop_director_state(jsonb)
TO authenticated, service_role;
