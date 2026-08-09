-- Keep privileged implementations outside the exposed API schema. Public RPCs
-- are invoker wrappers; authorization and mutations remain in private definer
-- functions with an empty search_path.

alter function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) set schema private;
alter function public.restore_tabletop_scene_snapshot(uuid, integer)
  set schema private;
alter function public.toggle_tabletop_door(uuid, uuid, integer)
  set schema private;

revoke all on function private.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) from public, anon;
revoke all on function private.restore_tabletop_scene_snapshot(uuid, integer)
  from public, anon;
revoke all on function private.toggle_tabletop_door(uuid, uuid, integer)
  from public, anon;
grant execute on function private.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function private.restore_tabletop_scene_snapshot(uuid, integer)
  to authenticated;
grant execute on function private.toggle_tabletop_door(uuid, uuid, integer)
  to authenticated;

create function public.save_tabletop_visibility_state(
  target_scene_id uuid,
  expected_visibility_version integer,
  illumination numeric,
  fog_enabled boolean,
  fog_opacity numeric,
  wall_documents jsonb,
  light_documents jsonb,
  fog_documents jsonb
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.save_tabletop_visibility_state(
    target_scene_id,
    expected_visibility_version,
    illumination,
    fog_enabled,
    fog_opacity,
    wall_documents,
    light_documents,
    fog_documents
  );
$$;

create function public.restore_tabletop_scene_snapshot(
  target_snapshot_id uuid,
  expected_scene_version integer
)
returns integer
language sql
security invoker
set search_path = ''
as $$
  select private.restore_tabletop_scene_snapshot(
    target_snapshot_id,
    expected_scene_version
  );
$$;

create function public.toggle_tabletop_door(
  target_session_id uuid,
  target_wall_id uuid,
  expected_wall_version integer
)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.toggle_tabletop_door(
    target_session_id,
    target_wall_id,
    expected_wall_version
  );
$$;

revoke all on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) from public, anon;
revoke all on function public.restore_tabletop_scene_snapshot(uuid, integer)
  from public, anon;
revoke all on function public.toggle_tabletop_door(uuid, uuid, integer)
  from public, anon;
grant execute on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function public.restore_tabletop_scene_snapshot(uuid, integer)
  to authenticated;
grant execute on function public.toggle_tabletop_door(uuid, uuid, integer)
  to authenticated;

comment on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) is
  'Invoker API wrapper for the private, fully validated visibility mutation.';
comment on function public.restore_tabletop_scene_snapshot(uuid, integer) is
  'Invoker API wrapper for the private, fully validated spatial restore.';
comment on function public.toggle_tabletop_door(uuid, uuid, integer) is
  'Invoker API wrapper for the private, fully validated player door toggle.';
