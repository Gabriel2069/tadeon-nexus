-- Mesa Nexus: share the full orbital orientation with the protected Director output.
-- Legacy session documents remain valid and are read with canonical defaults.

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
    AND ((state->'camera') - ARRAY[
      'mode', 'x', 'y', 'zoom', 'projection', 'levelId',
      'yaw', 'tilt', 'elevationScale'
    ]) = '{}'::jsonb
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
    )
    AND (
      NOT ((state->'camera') ? 'yaw')
      OR (
        jsonb_typeof(state#>'{camera,yaw}') = 'number'
        AND (state#>>'{camera,yaw}')::numeric >= 0
        AND (state#>>'{camera,yaw}')::numeric < 360
      )
    )
    AND (
      NOT ((state->'camera') ? 'tilt')
      OR (
        jsonb_typeof(state#>'{camera,tilt}') = 'number'
        AND (state#>>'{camera,tilt}')::numeric BETWEEN 0.18 AND 0.9
      )
    )
    AND (
      NOT ((state->'camera') ? 'elevationScale')
      OR (
        jsonb_typeof(state#>'{camera,elevationScale}') = 'number'
        AND (state#>>'{camera,elevationScale}')::numeric BETWEEN 0.25 AND 2.5
      )
    );
$$;

ALTER TABLE public.tabletop_sessions
  ALTER COLUMN director_state SET DEFAULT
    '{"mode":"scene","title":"","subtitle":"","showGrid":true,"showHud":false,"camera":{"mode":"fit","x":0,"y":0,"zoom":1,"projection":"plan","levelId":null,"yaw":45,"tilt":0.5,"elevationScale":1}}'::jsonb;

COMMENT ON FUNCTION private.is_valid_tabletop_director_state(jsonb) IS
  'Validates the compact Director state, including optional backwards-compatible orbital camera controls.';
