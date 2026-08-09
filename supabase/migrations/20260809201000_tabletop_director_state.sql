-- Mesa Nexus: persistent, optimistic and tightly bounded Director Camera state.

CREATE OR REPLACE FUNCTION private.is_valid_tabletop_director_state(state jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    jsonb_typeof(state) = 'object'
    AND pg_column_size(state) <= 4096
    AND (state - ARRAY['mode', 'title', 'subtitle', 'showGrid', 'showHud', 'camera']) = '{}'::jsonb
    AND state->>'mode' IN ('scene', 'intermission', 'blackout')
    AND jsonb_typeof(state->'title') = 'string'
    AND char_length(state->>'title') <= 160
    AND jsonb_typeof(state->'subtitle') = 'string'
    AND char_length(state->>'subtitle') <= 320
    AND jsonb_typeof(state->'showGrid') = 'boolean'
    AND jsonb_typeof(state->'showHud') = 'boolean'
    AND jsonb_typeof(state->'camera') = 'object'
    AND ((state->'camera') - ARRAY['mode', 'x', 'y', 'zoom', 'projection', 'levelId']) = '{}'::jsonb
    AND state#>>'{camera,mode}' IN ('fit', 'manual')
    AND jsonb_typeof(state#>'{camera,x}') = 'number'
    AND abs((state#>>'{camera,x}')::numeric) <= 1000000
    AND jsonb_typeof(state#>'{camera,y}') = 'number'
    AND abs((state#>>'{camera,y}')::numeric) <= 1000000
    AND jsonb_typeof(state#>'{camera,zoom}') = 'number'
    AND (state#>>'{camera,zoom}')::numeric BETWEEN 0.15 AND 4
    AND state#>>'{camera,projection}' IN ('plan', 'isometric')
    AND (
      jsonb_typeof(state#>'{camera,levelId}') = 'null'
      OR (
        jsonb_typeof(state#>'{camera,levelId}') = 'string'
        AND state#>>'{camera,levelId}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    );
$$;

ALTER TABLE public.tabletop_sessions
  ADD COLUMN director_state jsonb NOT NULL DEFAULT
    '{"mode":"scene","title":"","subtitle":"","showGrid":true,"showHud":false,"camera":{"mode":"fit","x":0,"y":0,"zoom":1,"projection":"plan","levelId":null}}'::jsonb,
  ADD CONSTRAINT tabletop_sessions_director_state_check
    CHECK (private.is_valid_tabletop_director_state(director_state));

REVOKE UPDATE (director_state) ON public.tabletop_sessions
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_tabletop_director_state(
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

REVOKE ALL ON FUNCTION private.is_valid_tabletop_director_state(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer)
  TO authenticated;

COMMENT ON COLUMN public.tabletop_sessions.director_state IS
  'Small persisted projection state. Never stores private layer contents or complete scene data.';
COMMENT ON FUNCTION public.set_tabletop_director_state(uuid, jsonb, integer) IS
  'Security-definer boundary that optimistically updates Director Camera state only after explicit campaign-manager authorization.';
