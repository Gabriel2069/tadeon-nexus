-- Keep the REST-facing RPC as invoker while isolating the narrowly authorized
-- write capability in the non-exposed private schema.

CREATE OR REPLACE FUNCTION private.set_tabletop_director_state_authorized(
  target_session_id uuid,
  next_state jsonb,
  expected_session_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  saved_version integer;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF NOT (SELECT private.is_feature_enabled('nexus_realtime_enabled')) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_REALTIME_DISABLED';
  END IF;
  IF NOT private.is_valid_tabletop_director_state(next_state) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_DIRECTOR_STATE';
  END IF;

  UPDATE public.tabletop_sessions session_row
  SET director_state = next_state,
      updated_by = actor_id
  WHERE session_row.id = target_session_id
    AND session_row.status = 'open'
    AND session_row.version = expected_session_version
    AND (SELECT private.can_co_manage_campaign(session_row.campaign_id))
  RETURNING session_row.version INTO saved_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_SESSION_VERSION_CONFLICT';
  END IF;
  RETURN saved_version;
END;
$$;

REVOKE ALL ON FUNCTION private.set_tabletop_director_state_authorized(
  uuid,
  jsonb,
  integer
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.set_tabletop_director_state_authorized(
  uuid,
  jsonb,
  integer
) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_tabletop_director_state(
  target_session_id uuid,
  next_state jsonb,
  expected_session_version integer
)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_tabletop_director_state_authorized(
    target_session_id,
    next_state,
    expected_session_version
  );
$$;

REVOKE ALL ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer)
  TO authenticated;

COMMENT ON FUNCTION private.set_tabletop_director_state_authorized(
  uuid,
  jsonb,
  integer
) IS 'Non-exposed capability boundary for authorized Director Camera writes.';
COMMENT ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer) IS
  'Invoker REST wrapper around the private, explicitly authorized Director Camera capability.';
