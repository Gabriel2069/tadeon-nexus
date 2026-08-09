-- Nexus Assets: qualify the outer asset id in the upload confirmation policy.
--
-- The original unqualified `id` was resolved against the inner upload-session
-- alias, producing `expected_asset_id = asset_upload_sessions.id`. That made
-- every otherwise valid catalog registration fail after the object upload.

DROP POLICY IF EXISTS "Assets: verified upload insert" ON public.assets;
CREATE POLICY "Assets: verified upload insert"
  ON public.assets FOR INSERT
  TO authenticated
  WITH CHECK (
    assets.created_by = (SELECT auth.uid())
    AND assets.status = 'ready'::public.asset_status
    AND EXISTS (
      SELECT 1
      FROM public.asset_upload_sessions upload_session
      WHERE upload_session.expected_asset_id = assets.id
        AND upload_session.user_id = (SELECT auth.uid())
        -- RLS evaluates this subquery against the statement snapshot, before
        -- the BEFORE INSERT trigger's completion update is visible here. The
        -- trigger independently locks and validates this exact reservation,
        -- the stored object, MIME and size, then changes the asset to `ready`.
        AND upload_session.status IN (
          'initiated'::public.asset_upload_status,
          'uploading'::public.asset_upload_status
        )
    )
  );

COMMENT ON POLICY "Assets: verified upload insert" ON public.assets IS
  'Accepts only a current upload reservation matching the outer asset row after the validation trigger has marked the asset ready.';
