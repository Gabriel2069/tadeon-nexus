create or replace function public.move_tabletop_controlled_entity(
  target_session_id uuid,
  target_entity_id uuid,
  path_points jsonb,
  expected_entity_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  session_row record;
  participant_row record;
  entity_row record;
  scene_row record;
  layer_row record;
  wall_row record;
  point_value jsonb;
  point_count integer;
  point_index integer;
  previous_x numeric;
  previous_y numeric;
  current_x numeric;
  current_y numeric;
  final_x numeric;
  final_y numeric;
  denominator numeric;
  ray_position numeric;
  wall_position numeric;
  next_version integer;
begin
  if actor_id is null then
    raise exception 'TABLETOP_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if expected_entity_version is null or expected_entity_version < 1 then
    raise exception 'TABLETOP_INVALID_ENTITY_VERSION' using errcode = '22023';
  end if;

  if path_points is null or jsonb_typeof(path_points) <> 'array' then
    raise exception 'TABLETOP_INVALID_PATH' using errcode = '22023';
  end if;

  point_count := jsonb_array_length(path_points);
  if point_count < 1 or point_count > 64 then
    raise exception 'TABLETOP_INVALID_PATH' using errcode = '22023';
  end if;

  select id, campaign_id, current_scene_id, status
    into session_row
  from public.tabletop_sessions
  where id = target_session_id;

  if session_row.id is null or session_row.status <> 'open' or session_row.current_scene_id is null then
    raise exception 'TABLETOP_SESSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  select role, state
    into participant_row
  from public.tabletop_session_participants
  where session_id = target_session_id
    and user_id = actor_id;

  if participant_row.state is distinct from 'active' or participant_row.role::text <> 'player' then
    raise exception 'TABLETOP_CONTROL_FORBIDDEN' using errcode = '42501';
  end if;

  select e.id, e.scene_id, e.layer_id, e.level_id, e.entity_type, e.x, e.y,
         e.width, e.height, e.owner_user_id, e.hidden, e.locked, e.version
    into entity_row
  from public.tabletop_entities e
  where e.id = target_entity_id
    and e.scene_id = session_row.current_scene_id
  for update;

  if entity_row.id is null then
    raise exception 'TABLETOP_ENTITY_NOT_FOUND' using errcode = 'P0002';
  end if;

  if entity_row.owner_user_id is distinct from actor_id
     or entity_row.hidden = true
     or entity_row.locked = true
     or entity_row.entity_type not in ('token', 'character', 'npc', 'creature') then
    raise exception 'TABLETOP_CONTROL_FORBIDDEN' using errcode = '42501';
  end if;

  if entity_row.version <> expected_entity_version then
    raise exception 'TABLETOP_ENTITY_CONFLICT' using errcode = '40001';
  end if;

  select id, layer_type, visible, locked
    into layer_row
  from public.tabletop_layers
  where id = entity_row.layer_id
    and scene_id = entity_row.scene_id;

  if layer_row.id is null
     or layer_row.layer_type <> 'tokens'
     or layer_row.visible is not true
     or layer_row.locked is true then
    raise exception 'TABLETOP_CONTROL_FORBIDDEN' using errcode = '42501';
  end if;

  select id, width, height
    into scene_row
  from public.tabletop_scenes
  where id = entity_row.scene_id
    and campaign_id = session_row.campaign_id;

  if scene_row.id is null then
    raise exception 'TABLETOP_SCENE_NOT_FOUND' using errcode = 'P0002';
  end if;

  previous_x := entity_row.x + entity_row.width / 2.0;
  previous_y := entity_row.y + entity_row.height / 2.0;

  for point_index in 0..point_count - 1 loop
    point_value := path_points -> point_index;
    if jsonb_typeof(point_value) <> 'object'
       or jsonb_typeof(point_value -> 'x') <> 'number'
       or jsonb_typeof(point_value -> 'y') <> 'number' then
      raise exception 'TABLETOP_INVALID_PATH' using errcode = '22023';
    end if;

    current_x := (point_value ->> 'x')::numeric;
    current_y := (point_value ->> 'y')::numeric;

    if current_x::text in ('NaN', 'Infinity', '-Infinity')
       or current_y::text in ('NaN', 'Infinity', '-Infinity')
       or current_x < 0 or current_y < 0
       or current_x > scene_row.width or current_y > scene_row.height then
      raise exception 'TABLETOP_PATH_OUT_OF_BOUNDS' using errcode = '22023';
    end if;

    if point_index = point_count - 1 then
      if current_x < entity_row.width / 2.0
         or current_y < entity_row.height / 2.0
         or current_x > scene_row.width - entity_row.width / 2.0
         or current_y > scene_row.height - entity_row.height / 2.0 then
        raise exception 'TABLETOP_TARGET_OUT_OF_BOUNDS' using errcode = '22023';
      end if;
    end if;

    if abs(current_x - previous_x) > 0.000001 or abs(current_y - previous_y) > 0.000001 then
      for wall_row in
        select x1, y1, x2, y2
        from public.tabletop_walls
        where scene_id = entity_row.scene_id
          and level_id = entity_row.level_id
          and blocks_movement = true
      loop
        denominator :=
          (current_x - previous_x) * (wall_row.y2 - wall_row.y1)
          - (current_y - previous_y) * (wall_row.x2 - wall_row.x1);

        if abs(denominator) > 0.000000001 then
          ray_position :=
            ((wall_row.x1 - previous_x) * (wall_row.y2 - wall_row.y1)
            - (wall_row.y1 - previous_y) * (wall_row.x2 - wall_row.x1))
            / denominator;
          wall_position :=
            ((wall_row.x1 - previous_x) * (current_y - previous_y)
            - (wall_row.y1 - previous_y) * (current_x - previous_x))
            / denominator;

          if ray_position > 0.000001 and ray_position < 0.999999
             and wall_position >= 0 and wall_position <= 1 then
            raise exception 'TABLETOP_MOVEMENT_BLOCKED' using errcode = '23514';
          end if;
        end if;
      end loop;
    end if;

    previous_x := current_x;
    previous_y := current_y;
    final_x := current_x;
    final_y := current_y;
  end loop;

  next_version := entity_row.version + 1;
  update public.tabletop_entities
  set x = final_x - entity_row.width / 2.0,
      y = final_y - entity_row.height / 2.0,
      version = next_version,
      updated_by = actor_id,
      updated_at = now()
  where id = entity_row.id
    and version = expected_entity_version;

  if not found then
    raise exception 'TABLETOP_ENTITY_CONFLICT' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'entityId', entity_row.id,
    'x', final_x - entity_row.width / 2.0,
    'y', final_y - entity_row.height / 2.0,
    'centerX', final_x,
    'centerY', final_y,
    'version', next_version
  );
end;
$$;

revoke all on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb, integer) from public;
revoke all on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb, integer) from anon;
grant execute on function public.move_tabletop_controlled_entity(uuid, uuid, jsonb, integer) to authenticated;
