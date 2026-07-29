-- Resolve feature flags identically in application code and RLS helpers.
-- A per-user override has precedence over the global value; missing values are false.

CREATE OR REPLACE FUNCTION private.is_feature_enabled(target_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (
      SELECT override.enabled
      FROM public.feature_flag_user_overrides override
      WHERE override.flag_key = target_key
        AND override.user_id = (SELECT auth.uid())
    ),
    (
      SELECT flag.enabled
      FROM public.feature_flags flag
      WHERE flag.key = target_key
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION private.is_feature_enabled(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_feature_enabled(text)
  TO authenticated;

COMMENT ON FUNCTION private.is_feature_enabled(text) IS
  'Resolves the authenticated user override before the global feature flag for RLS policies.';
