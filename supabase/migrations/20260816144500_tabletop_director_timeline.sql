create or replace function private.is_valid_tabletop_director_cue(cue jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(cue) = 'object'
    and pg_column_size(cue) <= 1536
    and (cue - array[
      'id', 'label', 'durationMs', 'transition', 'mode', 'title', 'subtitle',
      'showGrid', 'showHud', 'camera', 'globalIllumination', 'fogEnabled'
    ]) = '{}'::jsonb
    and jsonb_typeof(cue->'id') = 'string'
    and char_length(cue->>'id') between 1 and 96
    and jsonb_typeof(cue->'label') = 'string'
    and char_length(cue->>'label') between 1 and 120
    and jsonb_typeof(cue->'durationMs') = 'number'
    and (cue->>'durationMs')::numeric between 0 and 600000
    and cue->>'transition' in ('cut', 'fade', 'orbit')
    and (not (cue ? 'mode') or cue->>'mode' in ('scene', 'intermission', 'blackout'))
    and (not (cue ? 'title') or (jsonb_typeof(cue->'title') = 'string' and char_length(cue->>'title') <= 160))
    and (not (cue ? 'subtitle') or (jsonb_typeof(cue->'subtitle') = 'string' and char_length(cue->>'subtitle') <= 320))
    and (not (cue ? 'showGrid') or jsonb_typeof(cue->'showGrid') = 'boolean')
    and (not (cue ? 'showHud') or jsonb_typeof(cue->'showHud') = 'boolean')
    and (not (cue ? 'globalIllumination') or (
      jsonb_typeof(cue->'globalIllumination') = 'number'
      and (cue->>'globalIllumination')::numeric between 0 and 1
    ))
    and (not (cue ? 'fogEnabled') or jsonb_typeof(cue->'fogEnabled') = 'boolean')
    and (
      not (cue ? 'camera')
      or (
        jsonb_typeof(cue->'camera') = 'object'
        and ((cue->'camera') - array[
          'mode', 'x', 'y', 'zoom', 'projection', 'levelId',
          'yaw', 'tilt', 'elevationScale'
        ]) = '{}'::jsonb
        and cue#>>'{camera,mode}' in ('fit', 'manual')
        and jsonb_typeof(cue#>'{camera,x}') = 'number'
        and abs((cue#>>'{camera,x}')::numeric) <= 1000000
        and jsonb_typeof(cue#>'{camera,y}') = 'number'
        and abs((cue#>>'{camera,y}')::numeric) <= 1000000
        and jsonb_typeof(cue#>'{camera,zoom}') = 'number'
        and (cue#>>'{camera,zoom}')::numeric between 0.15 and 4
        and cue#>>'{camera,projection}' in ('plan', 'isometric')
        and (
          jsonb_typeof(cue#>'{camera,levelId}') = 'null'
          or (
            jsonb_typeof(cue#>'{camera,levelId}') = 'string'
            and cue#>>'{camera,levelId}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          )
        )
        and jsonb_typeof(cue#>'{camera,yaw}') = 'number'
        and (cue#>>'{camera,yaw}')::numeric >= 0
        and (cue#>>'{camera,yaw}')::numeric < 360
        and jsonb_typeof(cue#>'{camera,tilt}') = 'number'
        and (cue#>>'{camera,tilt}')::numeric between 0.18 and 0.9
        and jsonb_typeof(cue#>'{camera,elevationScale}') = 'number'
        and (cue#>>'{camera,elevationScale}')::numeric between 0.25 and 2.5
      )
    );
$$;

create or replace function private.is_valid_tabletop_director_state(state jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(state) = 'object'
    and pg_column_size(state) <= 16384
    and (state - array[
      'mode', 'title', 'subtitle', 'showGrid', 'showHud', 'camera',
      'cues', 'activeCueId', 'autoAdvance'
    ]) = '{}'::jsonb
    and state->>'mode' in ('scene', 'intermission', 'blackout')
    and jsonb_typeof(state->'title') = 'string'
    and char_length(state->>'title') <= 160
    and jsonb_typeof(state->'subtitle') = 'string'
    and char_length(state->>'subtitle') <= 320
    and jsonb_typeof(state->'showGrid') = 'boolean'
    and jsonb_typeof(state->'showHud') = 'boolean'
    and jsonb_typeof(state->'camera') = 'object'
    and ((state->'camera') - array[
      'mode', 'x', 'y', 'zoom', 'projection', 'levelId',
      'yaw', 'tilt', 'elevationScale'
    ]) = '{}'::jsonb
    and state#>>'{camera,mode}' in ('fit', 'manual')
    and jsonb_typeof(state#>'{camera,x}') = 'number'
    and abs((state#>>'{camera,x}')::numeric) <= 1000000
    and jsonb_typeof(state#>'{camera,y}') = 'number'
    and abs((state#>>'{camera,y}')::numeric) <= 1000000
    and jsonb_typeof(state#>'{camera,zoom}') = 'number'
    and (state#>>'{camera,zoom}')::numeric between 0.15 and 4
    and state#>>'{camera,projection}' in ('plan', 'isometric')
    and (
      jsonb_typeof(state#>'{camera,levelId}') = 'null'
      or (
        jsonb_typeof(state#>'{camera,levelId}') = 'string'
        and state#>>'{camera,levelId}' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
    and (not ((state->'camera') ? 'yaw') or (
      jsonb_typeof(state#>'{camera,yaw}') = 'number'
      and (state#>>'{camera,yaw}')::numeric >= 0
      and (state#>>'{camera,yaw}')::numeric < 360
    ))
    and (not ((state->'camera') ? 'tilt') or (
      jsonb_typeof(state#>'{camera,tilt}') = 'number'
      and (state#>>'{camera,tilt}')::numeric between 0.18 and 0.9
    ))
    and (not ((state->'camera') ? 'elevationScale') or (
      jsonb_typeof(state#>'{camera,elevationScale}') = 'number'
      and (state#>>'{camera,elevationScale}')::numeric between 0.25 and 2.5
    ))
    and jsonb_typeof(state->'cues') = 'array'
    and jsonb_array_length(state->'cues') <= 32
    and not exists (
      select 1
      from jsonb_array_elements(state->'cues') as item(cue)
      where not private.is_valid_tabletop_director_cue(item.cue)
    )
    and (
      jsonb_typeof(state->'activeCueId') = 'null'
      or (jsonb_typeof(state->'activeCueId') = 'string' and char_length(state->>'activeCueId') <= 96)
    )
    and jsonb_typeof(state->'autoAdvance') = 'boolean';
$$;

create or replace function private.set_tabletop_director_state_authorized(
  target_session_id uuid,
  next_state jsonb,
  expected_session_version integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  saved_version integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;
  if not (select private.is_feature_enabled('nexus_realtime_enabled')) then
    raise exception using errcode = '42501', message = 'TABLETOP_REALTIME_DISABLED';
  end if;
  if not private.is_valid_tabletop_director_state(next_state) then
    raise exception using errcode = '22023', message = 'TABLETOP_INVALID_DIRECTOR_STATE';
  end if;

  update public.tabletop_sessions session_row
  set director_state = next_state,
      updated_by = actor_id
  where session_row.id = target_session_id
    and session_row.status = 'open'
    and session_row.version = expected_session_version
    and (select private.can_co_manage_campaign(session_row.campaign_id))
  returning session_row.version into saved_version;

  if not found then
    raise exception using errcode = 'P0001', message = 'TABLETOP_SESSION_VERSION_CONFLICT';
  end if;
  return saved_version;
end;
$$;
