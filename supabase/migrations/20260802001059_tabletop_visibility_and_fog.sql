alter table public.tabletop_scenes
  add column if not exists fog_enabled boolean not null default false,
  add column if not exists fog_opacity numeric not null default 0.92,
  add column if not exists visibility_version integer not null default 1;

alter table public.tabletop_scenes
  drop constraint if exists tabletop_scenes_fog_opacity_check,
  add constraint tabletop_scenes_fog_opacity_check
    check (fog_opacity between 0 and 1),
  drop constraint if exists tabletop_scenes_visibility_version_check,
  add constraint tabletop_scenes_visibility_version_check
    check (visibility_version > 0);

create table if not exists public.tabletop_walls (
  id uuid primary key,
  scene_id uuid not null references public.tabletop_scenes(id) on delete cascade,
  x1 numeric not null,
  y1 numeric not null,
  x2 numeric not null,
  y2 numeric not null,
  wall_type text not null default 'wall'
    check (wall_type in ('wall', 'door_closed', 'door_open', 'door_locked')),
  blocks_vision boolean not null default true,
  blocks_movement boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (x1 between -1000000 and 1000000),
  check (y1 between -1000000 and 1000000),
  check (x2 between -1000000 and 1000000),
  check (y2 between -1000000 and 1000000),
  check (x1 <> x2 or y1 <> y2)
);

create table if not exists public.tabletop_lights (
  id uuid primary key,
  scene_id uuid not null references public.tabletop_scenes(id) on delete cascade,
  entity_id uuid null references public.tabletop_entities(id) on delete set null,
  x numeric not null,
  y numeric not null,
  radius numeric not null,
  intensity numeric not null default 1,
  color text not null default '#f3c56a',
  enabled boolean not null default true,
  casts_shadows boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (x between -1000000 and 1000000),
  check (y between -1000000 and 1000000),
  check (radius between 8 and 100000),
  check (intensity between 0 and 1),
  check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table if not exists public.tabletop_fog_strokes (
  id uuid primary key,
  scene_id uuid not null references public.tabletop_scenes(id) on delete cascade,
  operation text not null check (operation in ('reveal', 'hide')),
  points jsonb not null,
  radius numeric not null,
  sequence_index integer not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(points) = 'array'),
  check (jsonb_array_length(points) between 1 and 64),
  check (radius between 8 and 1024),
  check (sequence_index between 0 and 100000)
);

create index if not exists tabletop_walls_scene_id_idx
  on public.tabletop_walls(scene_id);
create index if not exists tabletop_lights_scene_id_idx
  on public.tabletop_lights(scene_id);
create index if not exists tabletop_lights_entity_id_idx
  on public.tabletop_lights(entity_id) where entity_id is not null;
create index if not exists tabletop_fog_strokes_scene_sequence_idx
  on public.tabletop_fog_strokes(scene_id, sequence_index);

alter table public.tabletop_walls enable row level security;
alter table public.tabletop_lights enable row level security;
alter table public.tabletop_fog_strokes enable row level security;

revoke all on public.tabletop_walls from public, anon, authenticated;
revoke all on public.tabletop_lights from public, anon, authenticated;
revoke all on public.tabletop_fog_strokes from public, anon, authenticated;
grant select, insert, update, delete on public.tabletop_walls to authenticated;
grant select, insert, update, delete on public.tabletop_lights to authenticated;
grant select, insert, update, delete on public.tabletop_fog_strokes to authenticated;

drop policy if exists "Tabletop walls: campaign managers read" on public.tabletop_walls;
create policy "Tabletop walls: campaign managers read"
on public.tabletop_walls for select to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_walls.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));
drop policy if exists "Tabletop walls: campaign managers write" on public.tabletop_walls;
create policy "Tabletop walls: campaign managers write"
on public.tabletop_walls for all to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_walls.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
))
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_walls.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop policy if exists "Tabletop lights: campaign managers read" on public.tabletop_lights;
create policy "Tabletop lights: campaign managers read"
on public.tabletop_lights for select to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_lights.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));
drop policy if exists "Tabletop lights: campaign managers write" on public.tabletop_lights;
create policy "Tabletop lights: campaign managers write"
on public.tabletop_lights for all to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_lights.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
))
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_lights.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop policy if exists "Tabletop fog: campaign managers read" on public.tabletop_fog_strokes;
create policy "Tabletop fog: campaign managers read"
on public.tabletop_fog_strokes for select to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_fog_strokes.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));
drop policy if exists "Tabletop fog: campaign managers write" on public.tabletop_fog_strokes;
create policy "Tabletop fog: campaign managers write"
on public.tabletop_fog_strokes for all to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_fog_strokes.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
))
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_fog_strokes.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

create or replace function public.save_tabletop_visibility_state(
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
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_version integer;
  next_version integer;
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
  if exists (
    select 1
    from jsonb_array_elements(fog_documents) as fog_document
    where jsonb_typeof(fog_document -> 'points') <> 'array'
  ) or exists (
    select 1
    from jsonb_array_elements(fog_documents) as fog_document,
      lateral jsonb_array_elements(
        case when jsonb_typeof(fog_document -> 'points') = 'array'
          then fog_document -> 'points' else '[]'::jsonb end
      ) as point
    where jsonb_typeof(point) <> 'object'
       or jsonb_typeof(point -> 'x') <> 'number'
       or jsonb_typeof(point -> 'y') <> 'number'
  ) then
    raise data_exception using message = 'TABLETOP_INVALID_FOG_POINTS';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(light_documents) as light(entity_id uuid)
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
    id, scene_id, x1, y1, x2, y2, wall_type, blocks_vision,
    blocks_movement, created_by, updated_by
  )
  select wall.id, target_scene_id, wall.x1, wall.y1, wall.x2, wall.y2,
    wall.wall_type, wall.blocks_vision, wall.blocks_movement, actor, actor
  from jsonb_to_recordset(wall_documents) as wall(
    id uuid, x1 numeric, y1 numeric, x2 numeric, y2 numeric,
    wall_type text, blocks_vision boolean, blocks_movement boolean
  );

  insert into public.tabletop_lights (
    id, scene_id, entity_id, x, y, radius, intensity, color, enabled,
    casts_shadows, created_by, updated_by
  )
  select light.id, target_scene_id, light.entity_id, light.x, light.y,
    light.radius, light.intensity, light.color, light.enabled,
    light.casts_shadows, actor, actor
  from jsonb_to_recordset(light_documents) as light(
    id uuid, entity_id uuid, x numeric, y numeric, radius numeric,
    intensity numeric, color text, enabled boolean, casts_shadows boolean
  );

  insert into public.tabletop_fog_strokes (
    id, scene_id, operation, points, radius, sequence_index, created_by
  )
  select fog.id, target_scene_id, fog.operation, fog.points, fog.radius,
    fog.sequence_index, actor
  from jsonb_to_recordset(fog_documents) as fog(
    id uuid, operation text, points jsonb, radius numeric, sequence_index integer
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

revoke all on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) from public, anon;
grant execute on function public.save_tabletop_visibility_state(
  uuid, integer, numeric, boolean, numeric, jsonb, jsonb, jsonb
) to authenticated;

comment on table public.tabletop_walls is
  'Segmentos autoritativos de visão/movimento. Participantes recebem apenas projeção filtrada.';
comment on table public.tabletop_lights is
  'Fontes de luz da Mesa Nexus; nunca acessadas diretamente por jogadores.';
comment on table public.tabletop_fog_strokes is
  'Operações compactas e ordenadas da neblina de guerra.';
comment on function public.save_tabletop_visibility_state is
  'Substitui atomicamente iluminação, paredes e fog com conflito otimista; SECURITY INVOKER.';
