-- Controlled rollout: additive per-user feature-flag overrides.
-- Global flags remain the default and continue disabled unless explicitly changed.

CREATE TABLE IF NOT EXISTS public.feature_flag_user_overrides (
  flag_key text NOT NULL REFERENCES public.feature_flags(key) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (flag_key, user_id)
);

CREATE INDEX IF NOT EXISTS feature_flag_user_overrides_user_id_idx
  ON public.feature_flag_user_overrides (user_id, flag_key);
CREATE INDEX IF NOT EXISTS feature_flag_user_overrides_updated_by_idx
  ON public.feature_flag_user_overrides (updated_by);

DROP TRIGGER IF EXISTS feature_flag_user_overrides_updated_at
  ON public.feature_flag_user_overrides;
CREATE TRIGGER feature_flag_user_overrides_updated_at
  BEFORE UPDATE ON public.feature_flag_user_overrides
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.feature_flag_user_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature flag overrides: own or admin read"
  ON public.feature_flag_user_overrides;
CREATE POLICY "Feature flag overrides: own or admin read"
  ON public.feature_flag_user_overrides
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.is_app_admin())
  );

DROP POLICY IF EXISTS "Feature flag overrides: app admin insert"
  ON public.feature_flag_user_overrides;
CREATE POLICY "Feature flag overrides: app admin insert"
  ON public.feature_flag_user_overrides
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.is_app_admin()));

DROP POLICY IF EXISTS "Feature flag overrides: app admin update"
  ON public.feature_flag_user_overrides;
CREATE POLICY "Feature flag overrides: app admin update"
  ON public.feature_flag_user_overrides
  FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_app_admin()))
  WITH CHECK ((SELECT private.is_app_admin()));

DROP POLICY IF EXISTS "Feature flag overrides: app admin delete"
  ON public.feature_flag_user_overrides;
CREATE POLICY "Feature flag overrides: app admin delete"
  ON public.feature_flag_user_overrides
  FOR DELETE
  TO authenticated
  USING ((SELECT private.is_app_admin()));

REVOKE ALL ON TABLE public.feature_flag_user_overrides
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.feature_flag_user_overrides
  TO authenticated;
GRANT UPDATE (enabled, updated_by)
  ON TABLE public.feature_flag_user_overrides
  TO authenticated;

COMMENT ON TABLE public.feature_flag_user_overrides IS
  'Per-user rollout overrides. User value takes precedence over the global flag and can be removed for immediate rollback.';

NOTIFY pgrst, 'reload schema';
