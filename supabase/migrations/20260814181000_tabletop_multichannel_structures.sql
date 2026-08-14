alter table public.tabletop_walls
  add column if not exists properties jsonb not null default '{}'::jsonb;

alter table public.tabletop_lights
  add column if not exists properties jsonb not null default '{}'::jsonb;

comment on column public.tabletop_walls.properties is
  'Canais físicos/ópticos/acústicos da estrutura: material, transmissão de luz/visão/som, barreira, superfície e metadados de telhado.';
comment on column public.tabletop_lights.properties is
  'Metadados visuais da fonte: forma, cone, queda, temperatura, partículas e comportamento atmosférico.';

create or replace function private.save_tabletop_visibility_state(
  target_scene_id uuid,
  expected_visibility_version integer,
  illumination numeric,
  fog_enabled boolean,
  fog_opacity numeric,
  wall_documents jsonb,
  light_documents jsonb,
  fog_documents jsonb
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_version integer;
  next_version integer;
  fallback_level_id uuid;
begin
  if actor is null then raise insufficient_privilege using message = 'TABLETOP_AUTH_REQUIRED'; end if;
  if not (select private.is_feature_enabled('nexus_lighting_enabled')) then
    raise insufficient_privilege using message = 'TABLETOP_LIGHTING_DISABLED';
  end if;
  select scene.visibility_version into current_version
  from public.tabletop_scenes scene
  where scene.id = target_scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
  for update;
  if current_version is null then raise insufficient_privilege using message = 'TABLETOP_SCENE_FORBIDDEN'; end if;
  if current_version <> expected_visibility_version then
    raise serialization_failure using message = 'TABLETOP_VISIBILITY_VERSION_CONFLICT';
  end if;
  if illumination not between 0 and 1 or fog_opacity not between 0 and 1 then
    raise data_exception using message = 'TABLETOP_INVALID_VISIBILITY';
  end if;
  if jsonb_typeof(wall_documents) <> 'array' or jsonb_array_length(wall_documents) > 512
     or jsonb_typeof(light_documents) <> 'array' or jsonb_array_length(light_documents) > 256
     or jsonb_typeof(fog_documents) <> 'array' or jsonb_array_length(fog_documents) > 512 then
    raise data_exception using message = 'TABLETOP_INVALID_VISIBILITY';
  end if;

  select level.id into fallback_level_id
  from public.tabletop_levels level
  where level.scene_id = target_scene_id
  order by level.order_index, level.id
  limit 1;
  if fallback_level_id is null then
    raise data_exception using message = 'TABLETOP_LEVEL_REQUIRED';
  end if;

  if exists (
    select 1 from jsonb_array_elements(fog_documents) fog_document
    where jsonb_typeof(fog_document -> 'points') <> 'array'
  ) or exists (
    select 1
    from jsonb_array_elements(fog_documents) fog_document,
      lateral jsonb_array_elements(
        case when jsonb_typeof(fog_document -> 'points') = 'array'
          then fog_document -> 'points' else '[]'::jsonb end
      ) point
    where jsonb_typeof(point) <> 'object'
       or jsonb_typeof(point -> 'x') <> 'number'
       or jsonb_typeof(point -> 'y') <> 'number'
  ) then
    raise data_exception using message = 'TABLETOP_INVALID_FOG_POINTS';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(light_documents) light(entity_id uuid)
    where light.entity_id is not null
      and not exists (
        select 1 from public.tabletop_entities entity
        where entity.id = light.entity_id and entity.scene_id = target_scene_id
      )
  ) then
    raise data_exception using message = 'TABLETOP_INVALID_LIGHT_ENTITY';
  end if;

  delete from public.tabletop_fog_strokes where scene_id = target_scene_id;
  delete from public.tabletop_lights where scene_id = target_scene_id;
  delete from public.tabletop_walls where scene_id = target_scene_id;

  insert into public.tabletop_walls (
    id, scene_id, level_id, x1, y1, x2, y2, wall_type, blocks_vision,
    blocks_movement, base_elevation, height, thickness, player_operable,
    properties, created_by, updated_by
  )
  select
    wall.id, target_scene_id, coalesce(wall.level_id, fallback_level_id),
    wall.x1, wall.y1, wall.x2, wall.y2,
    wall.wall_type, wall.blocks_vision, wall.blocks_movement,
    coalesce(wall.base_elevation, 0), coalesce(wall.height, 64),
    coalesce(wall.thickness, 8), coalesce(wall.player_operable, false),
    coalesce(wall.properties, '{}'::jsonb), actor, actor
  from jsonb_to_recordset(wall_documents) wall(
    id uuid, level_id uuid, x1 numeric, y1 numeric, x2 numeric, y2 numeric,
    wall_type text, blocks_vision boolean, blocks_movement boolean,
    base_elevation numeric, height numeric, thickness numeric,
    player_operable boolean, properties jsonb
  );

  insert into public.tabletop_lights (
    id, scene_id, level_id, entity_id, x, y, elevation, radius, intensity,
    color, enabled, casts_shadows, properties, created_by, updated_by
  )
  select
    light.id, target_scene_id, coalesce(light.level_id, fallback_level_id),
    light.entity_id, light.x, light.y, coalesce(light.elevation, 0),
    light.radius, light.intensity, light.color, light.enabled,
    light.casts_shadows, coalesce(light.properties, '{}'::jsonb), actor, actor
  from jsonb_to_recordset(light_documents) light(
    id uuid, level_id uuid, entity_id uuid, x numeric, y numeric,
    elevation numeric, radius numeric, intensity numeric, color text,
    enabled boolean, casts_shadows boolean, properties jsonb
  );

  insert into public.tabletop_fog_strokes (
    id, scene_id, level_id, operation, geometry, points, radius,
    sequence_index, created_by
  )
  select
    fog.id, target_scene_id, coalesce(fog.level_id, fallback_level_id),
    fog.operation, coalesce(fog.geometry, 'brush'), fog.points,
    fog.radius, fog.sequence_index, actor
  from jsonb_to_recordset(fog_documents) fog(
    id uuid, level_id uuid, operation text, geometry text, points jsonb,
    radius numeric, sequence_index integer
  );

  update public.tabletop_scenes
  set global_illumination = illumination,
      fog_enabled = save_tabletop_visibility_state.fog_enabled,
      fog_opacity = save_tabletop_visibility_state.fog_opacity,
      visibility_version = visibility_version + 1,
      updated_by = actor,
      updated_at = now()
  where id = target_scene_id
  returning visibility_version into next_version;
  return next_version;
end;
$$;
