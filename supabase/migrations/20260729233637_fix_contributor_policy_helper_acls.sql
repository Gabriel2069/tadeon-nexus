-- Restore policy helper execution required by authenticated RLS paths.
-- The helpers remain SECURITY DEFINER with an empty search_path and enforce auth.uid().

REVOKE ALL ON FUNCTION private.can_contribute_workspace(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_contribute_campaign(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.can_contribute_workspace(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_contribute_campaign(uuid)
  TO authenticated;

COMMENT ON FUNCTION private.can_contribute_workspace(uuid) IS
  'RLS helper for authenticated workspace contributors; SECURITY DEFINER with an empty search_path.';
COMMENT ON FUNCTION private.can_contribute_campaign(uuid) IS
  'RLS helper for authenticated campaign contributors; SECURITY DEFINER with an empty search_path.';
