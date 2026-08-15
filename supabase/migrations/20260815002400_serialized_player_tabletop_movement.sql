create or replace function public.move_tabletop_controlled_entity(
  target_session_id uuid,
  target_entity_id uuid,
  path_points jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_version integer;
begin
  select e.version
    into current_version
  from public.tabletop_entities e
  join public.tabletop_sessions s
    on s.current_scene_id = e.scene_id
   and s.id = target_session_id
  where e.id = target_entity_id;

  if current_version is null then
    raise exception 'TABLETOP_ENTITY_NOT_FOUND' using errcode = 'P0002';
  end if;

  return public.move_tabletop_controlled_entity(
    target_session_id,
    target_entity_id,
    path_points,
    current_version
  );
end;
$$;

revoke all on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb) from public;
revoke all on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb) from anon;
grant execute on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb) to authenticated;
