-- Keep visibility and snapshot writes behind narrowly validated RPCs without
-- granting authenticated users broad UPDATE privileges on scene internals.

alter function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) security definer;
alter function public.restore_tabletop_scene_snapshot(uuid, integer)
  security definer;

revoke all on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) from public, anon;
revoke all on function public.restore_tabletop_scene_snapshot(uuid, integer)
  from public, anon;
grant execute on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) to authenticated;
grant execute on function public.restore_tabletop_scene_snapshot(uuid, integer)
  to authenticated;

comment on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) is
  'Narrow definer RPC: validates feature, actor, campaign manager role, limits and optimistic visibility version before replacing visibility state.';
comment on function public.restore_tabletop_scene_snapshot(uuid, integer) is
  'Narrow definer RPC: validates actor, scene manager role and optimistic version before atomically restoring a complete spatial snapshot.';
