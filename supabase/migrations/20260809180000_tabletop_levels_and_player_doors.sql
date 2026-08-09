-- Mesa Nexus: named spatial levels, level-aware architecture and narrowly
-- authorized player-operated doors. Existing scenes are backfilled onto one
-- ground level; all mutations remain protected by RLS or explicit RPC checks.

create table if not exists public.tabletop_levels (
  id uuid primary key default gen_random_uuid(),
  scene_id uuid not null references public.tabletop_scenes(id) on delete cascade,
  name text not null,
  order_index integer not null,
  base_elevation numeric not null default 0,
  height numeric not null default 192,
  visible boolean not null default true,
  locked boolean not null default false,
  version integer not null default 1,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint tabletop_levels_name_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint tabletop_levels_order_check
    check (order_index between -100 and 100),
  constraint tabletop_levels_base_elevation_check
    check (base_elevation between -100000 and 100000),
  constraint tabletop_levels_height_check
    check (height between 8 and 100000),
  constraint tabletop_levels_version_check
    check (version > 0),
  constraint tabletop_levels_scene_order_key unique (scene_id, order_index),
  constraint tabletop_levels_scene_id_id_key unique (scene_id, id)
);

create index if not exists tabletop_levels_scene_visible_order_idx
  on public.tabletop_levels(scene_id, visible, order_index);

alter table public.tabletop_levels enable row level security;

revoke all on public.tabletop_levels from public, anon, authenticated;
grant select, insert, delete on public.tabletop_levels to authenticated;
grant update (name, order_index, base_elevation, height, visible, locked, updated_by)
  on public.tabletop_levels to authenticated;

drop policy if exists "Tabletop levels: campaign managers read"
  on public.tabletop_levels;
create policy "Tabletop levels: campaign managers read"
on public.tabletop_levels for select to authenticated
using (
  exists (
    select 1
    from public.tabletop_scenes scene
    where scene.id = tabletop_levels.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop policy if exists "Tabletop levels: campaign managers insert"
  on public.tabletop_levels;
create policy "Tabletop levels: campaign managers insert"
on public.tabletop_levels for insert to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1
    from public.tabletop_scenes scene
    where scene.id = tabletop_levels.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop policy if exists "Tabletop levels: campaign managers update"
  on public.tabletop_levels;
create policy "Tabletop levels: campaign managers update"
on public.tabletop_levels for update to authenticated
using (
  exists (
    select 1
    from public.tabletop_scenes scene
    where scene.id = tabletop_levels.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
)
with check (
  updated_by = (select auth.uid())
  and exists (
    select 1
    from public.tabletop_scenes scene
    where scene.id = tabletop_levels.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop policy if exists "Tabletop levels: campaign managers delete"
  on public.tabletop_levels;
create policy "Tabletop levels: campaign managers delete"
on public.tabletop_levels for delete to authenticated
using (
  exists (
    select 1
    from public.tabletop_scenes scene
    where scene.id = tabletop_levels.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

drop trigger if exists tabletop_levels_bump_version on public.tabletop_levels;
create trigger tabletop_levels_bump_version
  before update on public.tabletop_levels
  for each row execute function public.tabletop_bump_version();

insert into public.tabletop_levels (
  scene_id, name, order_index, base_elevation, height,
  visible, locked, created_by, updated_by
)
select
  scene.id,
  'Térreo',
  0,
  0,
  greatest(64, scene.grid_size * 3),
  true,
  false,
  scene.created_by,
  scene.updated_by
from public.tabletop_scenes scene
where not exists (
  select 1 from public.tabletop_levels level
  where level.scene_id = scene.id
);

alter table public.tabletop_entities
  add column if not exists level_id uuid;
alter table public.tabletop_walls
  add column if not exists level_id uuid,
  add column if not exists base_elevation numeric not null default 0,
  add column if not exists height numeric not null default 64,
  add column if not exists thickness numeric not null default 8,
  add column if not exists player_operable boolean not null default false,
  add column if not exists version integer not null default 1;
alter table public.tabletop_lights
  add column if not exists level_id uuid,
  add column if not exists elevation numeric not null default 0;
alter table public.tabletop_fog_strokes
  add column if not exists level_id uuid;

update public.tabletop_entities entity
set level_id = (
  select level.id
  from public.tabletop_levels level
  where level.scene_id = entity.scene_id
  order by level.order_index, level.id
  limit 1
)
where entity.level_id is null;

update public.tabletop_walls wall
set level_id = (
  select level.id
  from public.tabletop_levels level
  where level.scene_id = wall.scene_id
  order by level.order_index, level.id
  limit 1
)
where wall.level_id is null;

update public.tabletop_lights light
set level_id = (
  select level.id
  from public.tabletop_levels level
  where level.scene_id = light.scene_id
  order by level.order_index, level.id
  limit 1
)
where light.level_id is null;

update public.tabletop_fog_strokes stroke
set level_id = (
  select level.id
  from public.tabletop_levels level
  where level.scene_id = stroke.scene_id
  order by level.order_index, level.id
  limit 1
)
where stroke.level_id is null;

alter table public.tabletop_entities alter column level_id set not null;
alter table public.tabletop_walls alter column level_id set not null;
alter table public.tabletop_lights alter column level_id set not null;
alter table public.tabletop_fog_strokes alter column level_id set not null;

-- Older application clients and legacy restore functions did not send a
-- level_id. Assign the scene's lowest level before constraints run so those
-- writes remain safe during a progressive deploy.
create or replace function public.tabletop_assign_default_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.level_id is null then
    select level.id into new.level_id
    from public.tabletop_levels level
    where level.scene_id = new.scene_id
    order by level.order_index, level.id
    limit 1;
  end if;
  if new.level_id is null then
    raise exception using errcode = '23502', message = 'TABLETOP_LEVEL_REQUIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.tabletop_assign_default_level()
  from public, anon, authenticated;

drop trigger if exists tabletop_entities_assign_default_level
  on public.tabletop_entities;
create trigger tabletop_entities_assign_default_level
  before insert on public.tabletop_entities
  for each row execute function public.tabletop_assign_default_level();
drop trigger if exists tabletop_walls_assign_default_level
  on public.tabletop_walls;
create trigger tabletop_walls_assign_default_level
  before insert on public.tabletop_walls
  for each row execute function public.tabletop_assign_default_level();
drop trigger if exists tabletop_lights_assign_default_level
  on public.tabletop_lights;
create trigger tabletop_lights_assign_default_level
  before insert on public.tabletop_lights
  for each row execute function public.tabletop_assign_default_level();
drop trigger if exists tabletop_fog_strokes_assign_default_level
  on public.tabletop_fog_strokes;
create trigger tabletop_fog_strokes_assign_default_level
  before insert on public.tabletop_fog_strokes
  for each row execute function public.tabletop_assign_default_level();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tabletop_entities_scene_level_fkey'
      and conrelid = 'public.tabletop_entities'::regclass
  ) then
    alter table public.tabletop_entities
      add constraint tabletop_entities_scene_level_fkey
      foreign key (scene_id, level_id)
      references public.tabletop_levels(scene_id, id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'tabletop_walls_scene_level_fkey'
      and conrelid = 'public.tabletop_walls'::regclass
  ) then
    alter table public.tabletop_walls
      add constraint tabletop_walls_scene_level_fkey
      foreign key (scene_id, level_id)
      references public.tabletop_levels(scene_id, id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'tabletop_lights_scene_level_fkey'
      and conrelid = 'public.tabletop_lights'::regclass
  ) then
    alter table public.tabletop_lights
      add constraint tabletop_lights_scene_level_fkey
      foreign key (scene_id, level_id)
      references public.tabletop_levels(scene_id, id)
      on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'tabletop_fog_strokes_scene_level_fkey'
      and conrelid = 'public.tabletop_fog_strokes'::regclass
  ) then
    alter table public.tabletop_fog_strokes
      add constraint tabletop_fog_strokes_scene_level_fkey
      foreign key (scene_id, level_id)
      references public.tabletop_levels(scene_id, id)
      on delete restrict;
  end if;
end
$$;

create index if not exists tabletop_entities_scene_level_z_idx
  on public.tabletop_entities(scene_id, level_id, z_index);
create index if not exists tabletop_walls_scene_level_idx
  on public.tabletop_walls(scene_id, level_id);
create index if not exists tabletop_lights_scene_level_idx
  on public.tabletop_lights(scene_id, level_id);
create index if not exists tabletop_fog_strokes_scene_level_sequence_idx
  on public.tabletop_fog_strokes(scene_id, level_id, sequence_index);

alter table public.tabletop_walls
  drop constraint if exists tabletop_walls_base_elevation_check,
  add constraint tabletop_walls_base_elevation_check
    check (base_elevation between -100000 and 100000),
  drop constraint if exists tabletop_walls_height_check,
  add constraint tabletop_walls_height_check
    check (height between 8 and 100000),
  drop constraint if exists tabletop_walls_thickness_check,
  add constraint tabletop_walls_thickness_check
    check (thickness between 1 and 1024),
  drop constraint if exists tabletop_walls_version_check,
  add constraint tabletop_walls_version_check
    check (version > 0);

alter table public.tabletop_lights
  drop constraint if exists tabletop_lights_elevation_check,
  add constraint tabletop_lights_elevation_check
    check (elevation between -100000 and 100000);

grant update (level_id) on public.tabletop_entities to authenticated;

drop trigger if exists tabletop_walls_bump_version on public.tabletop_walls;
create trigger tabletop_walls_bump_version
  before update on public.tabletop_walls
  for each row execute function public.tabletop_bump_version();

create or replace function public.tabletop_create_default_level()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('app.tabletop_skip_default_level', true) = '1' then
    return new;
  end if;
  insert into public.tabletop_levels (
    scene_id, name, order_index, base_elevation, height,
    visible, locked, created_by, updated_by
  ) values (
    new.id, 'Térreo', 0, 0, greatest(64, new.grid_size * 3),
    true, false, new.created_by, new.updated_by
  );
  return new;
end;
$$;

revoke all on function public.tabletop_create_default_level()
  from public, anon, authenticated;
drop trigger if exists tabletop_scenes_default_level on public.tabletop_scenes;
create trigger tabletop_scenes_default_level
  after insert on public.tabletop_scenes
  for each row execute function public.tabletop_create_default_level();

-- Scene duplication now keeps floors and architecture. Entity-backed lights
-- are copied as standalone lights because duplicated entities receive new IDs.
create or replace function public.duplicate_tabletop_scene(
  source_scene_id uuid,
  duplicate_name text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  source_scene public.tabletop_scenes%rowtype;
  source_level public.tabletop_levels%rowtype;
  source_layer public.tabletop_layers%rowtype;
  new_scene_id uuid;
  new_level_id uuid;
  new_layer_id uuid;
  final_name text;
  level_map jsonb := '{}'::jsonb;
  copied_levels integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;

  select * into source_scene
  from public.tabletop_scenes scene
  where scene.id = source_scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id));
  if not found then
    raise exception using errcode = '42501', message = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  end if;

  final_name := coalesce(
    nullif(btrim(duplicate_name), ''),
    source_scene.name || ' · cópia'
  );
  if char_length(final_name) > 160 then
    raise exception using errcode = '22023', message = 'TABLETOP_INVALID_SCENE_NAME';
  end if;

  perform set_config('app.tabletop_skip_default_layers', '1', true);
  perform set_config('app.tabletop_skip_default_level', '1', true);
  insert into public.tabletop_scenes (
    campaign_id, name, background_asset_id, width, height, grid_type,
    grid_size, grid_offset_x, grid_offset_y, grid_scale, snap_enabled,
    global_illumination, fog_enabled, fog_opacity, status, order_index,
    created_by, updated_by
  ) values (
    source_scene.campaign_id, final_name, source_scene.background_asset_id,
    source_scene.width, source_scene.height, source_scene.grid_type,
    source_scene.grid_size, source_scene.grid_offset_x, source_scene.grid_offset_y,
    source_scene.grid_scale, source_scene.snap_enabled,
    source_scene.global_illumination, source_scene.fog_enabled,
    source_scene.fog_opacity, 'draft', source_scene.order_index + 1,
    actor_id, actor_id
  ) returning id into new_scene_id;

  for source_level in
    select * from public.tabletop_levels
    where scene_id = source_scene_id
    order by order_index, id
  loop
    insert into public.tabletop_levels (
      scene_id, name, order_index, base_elevation, height, visible, locked,
      created_by, updated_by
    ) values (
      new_scene_id, source_level.name, source_level.order_index,
      source_level.base_elevation, source_level.height, source_level.visible,
      source_level.locked, actor_id, actor_id
    ) returning id into new_level_id;
    level_map := level_map || jsonb_build_object(
      source_level.id::text,
      new_level_id::text
    );
    copied_levels := copied_levels + 1;
  end loop;

  for source_layer in
    select * from public.tabletop_layers
    where scene_id = source_scene_id
    order by order_index, id
  loop
    insert into public.tabletop_layers (
      scene_id, name, layer_type, order_index, visible, locked,
      created_by, updated_by
    ) values (
      new_scene_id, source_layer.name, source_layer.layer_type,
      source_layer.order_index, source_layer.visible, source_layer.locked,
      actor_id, actor_id
    ) returning id into new_layer_id;

    insert into public.tabletop_entities (
      scene_id, level_id, layer_id, entity_type, name, linked_sheet_id,
      linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
      elevation, z_index, hidden, locked, owner_user_id, properties,
      created_by, updated_by
    )
    select
      new_scene_id,
      (level_map ->> entity.level_id::text)::uuid,
      new_layer_id,
      entity.entity_type,
      entity.name,
      entity.linked_sheet_id,
      entity.linked_knowledge_node_id,
      entity.asset_id,
      entity.x,
      entity.y,
      entity.width,
      entity.height,
      entity.rotation,
      entity.elevation,
      entity.z_index,
      entity.hidden,
      entity.locked,
      entity.owner_user_id,
      entity.properties,
      actor_id,
      actor_id
    from public.tabletop_entities entity
    where entity.scene_id = source_scene_id
      and entity.layer_id = source_layer.id;
  end loop;

  insert into public.tabletop_walls (
    id, scene_id, level_id, x1, y1, x2, y2, wall_type, blocks_vision,
    blocks_movement, base_elevation, height, thickness, player_operable,
    created_by, updated_by
  )
  select
    gen_random_uuid(), new_scene_id,
    (level_map ->> wall.level_id::text)::uuid,
    wall.x1, wall.y1, wall.x2, wall.y2, wall.wall_type,
    wall.blocks_vision, wall.blocks_movement, wall.base_elevation,
    wall.height, wall.thickness, wall.player_operable, actor_id, actor_id
  from public.tabletop_walls wall
  where wall.scene_id = source_scene_id;

  insert into public.tabletop_lights (
    id, scene_id, level_id, entity_id, x, y, elevation, radius, intensity,
    color, enabled, casts_shadows, created_by, updated_by
  )
  select
    gen_random_uuid(), new_scene_id,
    (level_map ->> light.level_id::text)::uuid,
    null, light.x, light.y, light.elevation, light.radius, light.intensity,
    light.color, light.enabled, light.casts_shadows, actor_id, actor_id
  from public.tabletop_lights light
  where light.scene_id = source_scene_id;

  insert into public.tabletop_fog_strokes (
    id, scene_id, level_id, operation, points, radius, sequence_index,
    created_by
  )
  select
    gen_random_uuid(), new_scene_id,
    (level_map ->> stroke.level_id::text)::uuid,
    stroke.operation, stroke.points, stroke.radius, stroke.sequence_index,
    actor_id
  from public.tabletop_fog_strokes stroke
  where stroke.scene_id = source_scene_id;

  insert into public.tabletop_scene_events (
    scene_id, event_type, payload, created_by
  ) values (
    new_scene_id,
    'scene.duplicated',
    jsonb_build_object('source_scene_id', source_scene_id, 'levels', copied_levels),
    actor_id
  );
  return new_scene_id;
end;
$$;

-- Snapshots become complete spatial documents. Restoring a pre-level snapshot
-- remains supported by creating one fallback floor inside the same transaction.
create or replace function public.create_tabletop_scene_snapshot(
  target_scene_id uuid,
  snapshot_name text default 'Snapshot manual'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  result_id uuid;
  current_version integer;
  document jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;
  if char_length(btrim(snapshot_name)) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'TABLETOP_INVALID_SNAPSHOT_NAME';
  end if;

  select scene.version,
         jsonb_build_object(
           'schema_version', 2,
           'scene', to_jsonb(scene),
           'levels', coalesce((
             select jsonb_agg(to_jsonb(level) order by level.order_index, level.id)
             from public.tabletop_levels level
             where level.scene_id = scene.id
           ), '[]'::jsonb),
           'layers', coalesce((
             select jsonb_agg(to_jsonb(layer) order by layer.order_index, layer.id)
             from public.tabletop_layers layer
             where layer.scene_id = scene.id
           ), '[]'::jsonb),
           'entities', coalesce((
             select jsonb_agg(to_jsonb(entity) order by entity.z_index, entity.id)
             from public.tabletop_entities entity
             where entity.scene_id = scene.id
           ), '[]'::jsonb),
           'walls', coalesce((
             select jsonb_agg(to_jsonb(wall) order by wall.created_at, wall.id)
             from public.tabletop_walls wall
             where wall.scene_id = scene.id
           ), '[]'::jsonb),
           'lights', coalesce((
             select jsonb_agg(to_jsonb(light) order by light.created_at, light.id)
             from public.tabletop_lights light
             where light.scene_id = scene.id
           ), '[]'::jsonb),
           'fog_strokes', coalesce((
             select jsonb_agg(to_jsonb(stroke) order by stroke.sequence_index, stroke.id)
             from public.tabletop_fog_strokes stroke
             where stroke.scene_id = scene.id
           ), '[]'::jsonb)
         )
    into current_version, document
  from public.tabletop_scenes scene
  where scene.id = target_scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id));

  if document is null then
    raise exception using errcode = '42501', message = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  end if;

  insert into public.tabletop_scene_snapshots (
    scene_id, name, scene_version, snapshot, created_by
  ) values (
    target_scene_id, btrim(snapshot_name), current_version, document, actor_id
  ) returning id into result_id;

  insert into public.tabletop_scene_events (
    scene_id, event_type, payload, created_by
  ) values (
    target_scene_id,
    'snapshot.created',
    jsonb_build_object(
      'snapshot_id', result_id,
      'scene_version', current_version,
      'schema_version', 2
    ),
    actor_id
  );
  return result_id;
end;
$$;

create or replace function public.restore_tabletop_scene_snapshot(
  target_snapshot_id uuid,
  expected_scene_version integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  stored public.tabletop_scene_snapshots%rowtype;
  current_version integer;
  restored_version integer;
  fallback_level_id uuid;
  level_document jsonb;
  layer_document jsonb;
  entity_document jsonb;
  wall_document jsonb;
  light_document jsonb;
  fog_document jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;

  select * into stored
  from public.tabletop_scene_snapshots snapshot_row
  where snapshot_row.id = target_snapshot_id;
  if not found then
    raise exception using errcode = '42501', message = 'TABLETOP_SNAPSHOT_NOT_MANAGEABLE';
  end if;

  select scene.version into current_version
  from public.tabletop_scenes scene
  where scene.id = stored.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  end if;
  if current_version <> expected_scene_version then
    raise exception using
      errcode = '40001',
      message = 'TABLETOP_VERSION_CONFLICT',
      detail = format('expected=%s actual=%s', expected_scene_version, current_version);
  end if;

  perform public.create_tabletop_scene_snapshot(
    stored.scene_id,
    'Antes de restaurar · ' || to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS')
  );

  update public.tabletop_scenes
  set name = stored.snapshot #>> '{scene,name}',
      background_asset_id = nullif(stored.snapshot #>> '{scene,background_asset_id}', '')::uuid,
      width = (stored.snapshot #>> '{scene,width}')::integer,
      height = (stored.snapshot #>> '{scene,height}')::integer,
      grid_type = stored.snapshot #>> '{scene,grid_type}',
      grid_size = (stored.snapshot #>> '{scene,grid_size}')::integer,
      grid_offset_x = (stored.snapshot #>> '{scene,grid_offset_x}')::numeric,
      grid_offset_y = (stored.snapshot #>> '{scene,grid_offset_y}')::numeric,
      grid_scale = (stored.snapshot #>> '{scene,grid_scale}')::numeric,
      snap_enabled = (stored.snapshot #>> '{scene,snap_enabled}')::boolean,
      global_illumination = coalesce(
        (stored.snapshot #>> '{scene,global_illumination}')::numeric,
        global_illumination
      ),
      fog_enabled = coalesce(
        (stored.snapshot #>> '{scene,fog_enabled}')::boolean,
        false
      ),
      fog_opacity = coalesce(
        (stored.snapshot #>> '{scene,fog_opacity}')::numeric,
        0.92
      ),
      visibility_version = visibility_version + 1,
      status = stored.snapshot #>> '{scene,status}',
      order_index = (stored.snapshot #>> '{scene,order_index}')::integer,
      updated_by = actor_id
  where id = stored.scene_id and version = expected_scene_version
  returning version into restored_version;
  if not found then
    raise exception using errcode = '40001', message = 'TABLETOP_VERSION_CONFLICT';
  end if;

  delete from public.tabletop_fog_strokes where scene_id = stored.scene_id;
  delete from public.tabletop_lights where scene_id = stored.scene_id;
  delete from public.tabletop_walls where scene_id = stored.scene_id;
  delete from public.tabletop_entities where scene_id = stored.scene_id;
  delete from public.tabletop_layers where scene_id = stored.scene_id;
  delete from public.tabletop_levels where scene_id = stored.scene_id;

  for level_document in
    select value
    from jsonb_array_elements(coalesce(stored.snapshot -> 'levels', '[]'::jsonb))
  loop
    insert into public.tabletop_levels (
      id, scene_id, name, order_index, base_elevation, height, visible, locked,
      version, created_by, updated_by
    ) values (
      (level_document ->> 'id')::uuid,
      stored.scene_id,
      level_document ->> 'name',
      (level_document ->> 'order_index')::integer,
      (level_document ->> 'base_elevation')::numeric,
      (level_document ->> 'height')::numeric,
      (level_document ->> 'visible')::boolean,
      (level_document ->> 'locked')::boolean,
      greatest(coalesce((level_document ->> 'version')::integer, 1), 1),
      actor_id,
      actor_id
    );
  end loop;

  select level.id into fallback_level_id
  from public.tabletop_levels level
  where level.scene_id = stored.scene_id
  order by level.order_index, level.id
  limit 1;
  if fallback_level_id is null then
    insert into public.tabletop_levels (
      scene_id, name, order_index, base_elevation, height, visible, locked,
      created_by, updated_by
    ) values (
      stored.scene_id, 'Térreo', 0, 0,
      greatest(64, (stored.snapshot #>> '{scene,grid_size}')::integer * 3),
      true, false, actor_id, actor_id
    ) returning id into fallback_level_id;
  end if;

  for layer_document in
    select value from jsonb_array_elements(stored.snapshot -> 'layers')
  loop
    insert into public.tabletop_layers (
      id, scene_id, name, layer_type, order_index, visible, locked, version,
      created_by, updated_by
    ) values (
      (layer_document ->> 'id')::uuid, stored.scene_id,
      layer_document ->> 'name', layer_document ->> 'layer_type',
      (layer_document ->> 'order_index')::integer,
      (layer_document ->> 'visible')::boolean,
      (layer_document ->> 'locked')::boolean,
      greatest(coalesce((layer_document ->> 'version')::integer, 1), 1),
      actor_id, actor_id
    );
  end loop;

  for entity_document in
    select value from jsonb_array_elements(stored.snapshot -> 'entities')
  loop
    insert into public.tabletop_entities (
      id, scene_id, level_id, layer_id, entity_type, name, linked_sheet_id,
      linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
      elevation, z_index, hidden, locked, owner_user_id, properties, version,
      created_by, updated_by
    ) values (
      (entity_document ->> 'id')::uuid,
      stored.scene_id,
      coalesce((
        select level.id from public.tabletop_levels level
        where level.scene_id = stored.scene_id
          and level.id = nullif(entity_document ->> 'level_id', '')::uuid
      ), fallback_level_id),
      (entity_document ->> 'layer_id')::uuid,
      entity_document ->> 'entity_type',
      entity_document ->> 'name',
      nullif(entity_document ->> 'linked_sheet_id', '')::uuid,
      nullif(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
      nullif(entity_document ->> 'asset_id', '')::uuid,
      (entity_document ->> 'x')::numeric,
      (entity_document ->> 'y')::numeric,
      (entity_document ->> 'width')::numeric,
      (entity_document ->> 'height')::numeric,
      (entity_document ->> 'rotation')::numeric,
      coalesce((entity_document ->> 'elevation')::numeric, 0),
      (entity_document ->> 'z_index')::integer,
      (entity_document ->> 'hidden')::boolean,
      (entity_document ->> 'locked')::boolean,
      nullif(entity_document ->> 'owner_user_id', '')::uuid,
      coalesce(entity_document -> 'properties', '{}'::jsonb),
      greatest(coalesce((entity_document ->> 'version')::integer, 1), 1),
      actor_id,
      actor_id
    );
  end loop;

  for wall_document in
    select value
    from jsonb_array_elements(coalesce(stored.snapshot -> 'walls', '[]'::jsonb))
  loop
    insert into public.tabletop_walls (
      id, scene_id, level_id, x1, y1, x2, y2, wall_type, blocks_vision,
      blocks_movement, base_elevation, height, thickness, player_operable,
      version, created_by, updated_by
    ) values (
      (wall_document ->> 'id')::uuid,
      stored.scene_id,
      coalesce((
        select level.id from public.tabletop_levels level
        where level.scene_id = stored.scene_id
          and level.id = nullif(wall_document ->> 'level_id', '')::uuid
      ), fallback_level_id),
      (wall_document ->> 'x1')::numeric,
      (wall_document ->> 'y1')::numeric,
      (wall_document ->> 'x2')::numeric,
      (wall_document ->> 'y2')::numeric,
      wall_document ->> 'wall_type',
      (wall_document ->> 'blocks_vision')::boolean,
      (wall_document ->> 'blocks_movement')::boolean,
      coalesce((wall_document ->> 'base_elevation')::numeric, 0),
      coalesce((wall_document ->> 'height')::numeric, 64),
      coalesce((wall_document ->> 'thickness')::numeric, 8),
      coalesce((wall_document ->> 'player_operable')::boolean, false),
      greatest(coalesce((wall_document ->> 'version')::integer, 1), 1),
      actor_id,
      actor_id
    );
  end loop;

  for light_document in
    select value
    from jsonb_array_elements(coalesce(stored.snapshot -> 'lights', '[]'::jsonb))
  loop
    insert into public.tabletop_lights (
      id, scene_id, level_id, entity_id, x, y, elevation, radius, intensity,
      color, enabled, casts_shadows, created_by, updated_by
    ) values (
      (light_document ->> 'id')::uuid,
      stored.scene_id,
      coalesce((
        select level.id from public.tabletop_levels level
        where level.scene_id = stored.scene_id
          and level.id = nullif(light_document ->> 'level_id', '')::uuid
      ), fallback_level_id),
      nullif(light_document ->> 'entity_id', '')::uuid,
      (light_document ->> 'x')::numeric,
      (light_document ->> 'y')::numeric,
      coalesce((light_document ->> 'elevation')::numeric, 0),
      (light_document ->> 'radius')::numeric,
      (light_document ->> 'intensity')::numeric,
      light_document ->> 'color',
      (light_document ->> 'enabled')::boolean,
      (light_document ->> 'casts_shadows')::boolean,
      actor_id,
      actor_id
    );
  end loop;

  for fog_document in
    select value
    from jsonb_array_elements(coalesce(stored.snapshot -> 'fog_strokes', '[]'::jsonb))
  loop
    insert into public.tabletop_fog_strokes (
      id, scene_id, level_id, operation, points, radius, sequence_index,
      created_by
    ) values (
      (fog_document ->> 'id')::uuid,
      stored.scene_id,
      coalesce((
        select level.id from public.tabletop_levels level
        where level.scene_id = stored.scene_id
          and level.id = nullif(fog_document ->> 'level_id', '')::uuid
      ), fallback_level_id),
      fog_document ->> 'operation',
      fog_document -> 'points',
      (fog_document ->> 'radius')::numeric,
      (fog_document ->> 'sequence_index')::integer,
      actor_id
    );
  end loop;

  insert into public.tabletop_scene_events (
    scene_id, event_type, payload, created_by
  ) values (
    stored.scene_id,
    'snapshot.restored',
    jsonb_build_object(
      'snapshot_id', target_snapshot_id,
      'previous_version', current_version,
      'restored_version', restored_version,
      'schema_version', coalesce((stored.snapshot ->> 'schema_version')::integer, 1)
    ),
    actor_id
  );
  return restored_version;
end;
$$;

-- Keep the original six-argument RPC contract. Level documents travel inside
-- scene_document so old clients remain compatible while the new client saves
-- levels and entity assignments atomically with the scene.
create or replace function public.save_tabletop_scene_state(
  target_scene_id uuid,
  expected_scene_version integer,
  scene_document jsonb,
  layer_documents jsonb default '[]'::jsonb,
  entity_documents jsonb default '[]'::jsonb,
  deleted_entity_documents jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_version integer;
  saved_version integer;
  level_document jsonb;
  layer_document jsonb;
  entity_document jsonb;
  deleted_document jsonb;
  fallback_level_id uuid;
  saved_levels integer := 0;
  saved_layers integer := 0;
  saved_entities integer := 0;
  deleted_entities integer := 0;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;
  if jsonb_typeof(scene_document) <> 'object'
     or jsonb_typeof(layer_documents) <> 'array'
     or jsonb_typeof(entity_documents) <> 'array'
     or jsonb_typeof(deleted_entity_documents) <> 'array'
     or (
       scene_document ? 'levels'
       and jsonb_typeof(scene_document -> 'levels') <> 'array'
     ) then
    raise exception using errcode = '22023', message = 'TABLETOP_INVALID_SAVE_DOCUMENT';
  end if;

  select scene.version into current_version
  from public.tabletop_scenes scene
  where scene.id = target_scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  end if;
  if current_version <> expected_scene_version then
    raise exception using
      errcode = '40001',
      message = 'TABLETOP_VERSION_CONFLICT',
      detail = format('expected=%s actual=%s', expected_scene_version, current_version);
  end if;

  for level_document in
    select value
    from jsonb_array_elements(coalesce(scene_document -> 'levels', '[]'::jsonb))
  loop
    if (level_document ->> 'version')::integer = 0 then
      insert into public.tabletop_levels (
        id, scene_id, name, order_index, base_elevation, height,
        visible, locked, created_by, updated_by
      ) values (
        (level_document ->> 'id')::uuid,
        target_scene_id,
        btrim(level_document ->> 'name'),
        (level_document ->> 'order_index')::integer,
        (level_document ->> 'base_elevation')::numeric,
        (level_document ->> 'height')::numeric,
        (level_document ->> 'visible')::boolean,
        (level_document ->> 'locked')::boolean,
        actor_id,
        actor_id
      );
    else
      update public.tabletop_levels
      set name = btrim(level_document ->> 'name'),
          order_index = (level_document ->> 'order_index')::integer,
          base_elevation = (level_document ->> 'base_elevation')::numeric,
          height = (level_document ->> 'height')::numeric,
          visible = (level_document ->> 'visible')::boolean,
          locked = (level_document ->> 'locked')::boolean,
          updated_by = actor_id
      where id = (level_document ->> 'id')::uuid
        and scene_id = target_scene_id
        and version = (level_document ->> 'version')::integer;
      if not found then
        raise exception using
          errcode = '40001',
          message = 'TABLETOP_VERSION_CONFLICT',
          detail = 'level=' || coalesce(level_document ->> 'id', 'invalid');
      end if;
    end if;
    saved_levels := saved_levels + 1;
  end loop;

  select level.id into fallback_level_id
  from public.tabletop_levels level
  where level.scene_id = target_scene_id
  order by level.order_index, level.id
  limit 1;
  if fallback_level_id is null then
    raise exception using errcode = '22023', message = 'TABLETOP_LEVEL_REQUIRED';
  end if;

  update public.tabletop_scenes
  set name = btrim(scene_document ->> 'name'),
      background_asset_id = nullif(scene_document ->> 'background_asset_id', '')::uuid,
      width = (scene_document ->> 'width')::integer,
      height = (scene_document ->> 'height')::integer,
      grid_type = scene_document ->> 'grid_type',
      grid_size = (scene_document ->> 'grid_size')::integer,
      grid_offset_x = (scene_document ->> 'grid_offset_x')::numeric,
      grid_offset_y = (scene_document ->> 'grid_offset_y')::numeric,
      grid_scale = (scene_document ->> 'grid_scale')::numeric,
      snap_enabled = (scene_document ->> 'snap_enabled')::boolean,
      global_illumination = (scene_document ->> 'global_illumination')::numeric,
      status = scene_document ->> 'status',
      order_index = (scene_document ->> 'order_index')::integer,
      updated_by = actor_id
  where id = target_scene_id and version = expected_scene_version
  returning version into saved_version;
  if not found then
    raise exception using errcode = '40001', message = 'TABLETOP_VERSION_CONFLICT';
  end if;

  for layer_document in
    select value from jsonb_array_elements(layer_documents)
  loop
    update public.tabletop_layers
    set name = btrim(layer_document ->> 'name'),
        layer_type = layer_document ->> 'layer_type',
        order_index = (layer_document ->> 'order_index')::integer,
        visible = (layer_document ->> 'visible')::boolean,
        locked = (layer_document ->> 'locked')::boolean,
        updated_by = actor_id
    where id = (layer_document ->> 'id')::uuid
      and scene_id = target_scene_id
      and version = (layer_document ->> 'version')::integer;
    if not found then
      raise exception using
        errcode = '40001',
        message = 'TABLETOP_VERSION_CONFLICT',
        detail = 'layer=' || coalesce(layer_document ->> 'id', 'invalid');
    end if;
    saved_layers := saved_layers + 1;
  end loop;

  for deleted_document in
    select value from jsonb_array_elements(deleted_entity_documents)
  loop
    delete from public.tabletop_entities
    where id = (deleted_document ->> 'id')::uuid
      and scene_id = target_scene_id
      and version = (deleted_document ->> 'version')::integer;
    if not found then
      raise exception using
        errcode = '40001',
        message = 'TABLETOP_VERSION_CONFLICT',
        detail = 'deleted_entity=' || coalesce(deleted_document ->> 'id', 'invalid');
    end if;
    deleted_entities := deleted_entities + 1;
  end loop;

  for entity_document in
    select value from jsonb_array_elements(entity_documents)
  loop
    if (entity_document ->> 'version')::integer = 0 then
      insert into public.tabletop_entities (
        id, scene_id, level_id, layer_id, entity_type, name, linked_sheet_id,
        linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
        elevation, z_index, hidden, locked, owner_user_id, properties,
        created_by, updated_by
      ) values (
        (entity_document ->> 'id')::uuid,
        target_scene_id,
        coalesce(nullif(entity_document ->> 'level_id', '')::uuid, fallback_level_id),
        (entity_document ->> 'layer_id')::uuid,
        entity_document ->> 'entity_type',
        entity_document ->> 'name',
        nullif(entity_document ->> 'linked_sheet_id', '')::uuid,
        nullif(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
        nullif(entity_document ->> 'asset_id', '')::uuid,
        (entity_document ->> 'x')::numeric,
        (entity_document ->> 'y')::numeric,
        (entity_document ->> 'width')::numeric,
        (entity_document ->> 'height')::numeric,
        (entity_document ->> 'rotation')::numeric,
        (entity_document ->> 'elevation')::numeric,
        (entity_document ->> 'z_index')::integer,
        (entity_document ->> 'hidden')::boolean,
        (entity_document ->> 'locked')::boolean,
        nullif(entity_document ->> 'owner_user_id', '')::uuid,
        coalesce(entity_document -> 'properties', '{}'::jsonb),
        actor_id,
        actor_id
      );
    else
      update public.tabletop_entities
      set level_id = coalesce(
            nullif(entity_document ->> 'level_id', '')::uuid,
            level_id,
            fallback_level_id
          ),
          layer_id = (entity_document ->> 'layer_id')::uuid,
          entity_type = entity_document ->> 'entity_type',
          name = entity_document ->> 'name',
          linked_sheet_id = nullif(entity_document ->> 'linked_sheet_id', '')::uuid,
          linked_knowledge_node_id = nullif(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
          asset_id = nullif(entity_document ->> 'asset_id', '')::uuid,
          x = (entity_document ->> 'x')::numeric,
          y = (entity_document ->> 'y')::numeric,
          width = (entity_document ->> 'width')::numeric,
          height = (entity_document ->> 'height')::numeric,
          rotation = (entity_document ->> 'rotation')::numeric,
          elevation = (entity_document ->> 'elevation')::numeric,
          z_index = (entity_document ->> 'z_index')::integer,
          hidden = (entity_document ->> 'hidden')::boolean,
          locked = (entity_document ->> 'locked')::boolean,
          owner_user_id = nullif(entity_document ->> 'owner_user_id', '')::uuid,
          properties = coalesce(entity_document -> 'properties', '{}'::jsonb),
          updated_by = actor_id
      where id = (entity_document ->> 'id')::uuid
        and scene_id = target_scene_id
        and version = (entity_document ->> 'version')::integer;
      if not found then
        raise exception using
          errcode = '40001',
          message = 'TABLETOP_VERSION_CONFLICT',
          detail = 'entity=' || coalesce(entity_document ->> 'id', 'invalid');
      end if;
    end if;
    saved_entities := saved_entities + 1;
  end loop;

  insert into public.tabletop_scene_events (scene_id, event_type, payload, created_by)
  values (
    target_scene_id,
    'scene.saved',
    jsonb_build_object(
      'previous_version', current_version,
      'saved_version', saved_version,
      'levels', saved_levels,
      'layers', saved_layers,
      'entities', saved_entities,
      'deleted_entities', deleted_entities
    ),
    actor_id
  );
  return saved_version;
end;
$$;

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
    id, scene_id, level_id, x1, y1, x2, y2, wall_type, blocks_vision,
    blocks_movement, base_elevation, height, thickness, player_operable,
    created_by, updated_by
  )
  select
    wall.id,
    target_scene_id,
    coalesce(wall.level_id, fallback_level_id),
    wall.x1, wall.y1, wall.x2, wall.y2,
    wall.wall_type, wall.blocks_vision, wall.blocks_movement,
    coalesce(wall.base_elevation, 0),
    coalesce(wall.height, 64),
    coalesce(wall.thickness, 8),
    coalesce(wall.player_operable, false),
    actor,
    actor
  from jsonb_to_recordset(wall_documents) as wall(
    id uuid, level_id uuid, x1 numeric, y1 numeric, x2 numeric, y2 numeric,
    wall_type text, blocks_vision boolean, blocks_movement boolean,
    base_elevation numeric, height numeric, thickness numeric,
    player_operable boolean
  );

  insert into public.tabletop_lights (
    id, scene_id, level_id, entity_id, x, y, elevation, radius, intensity,
    color, enabled, casts_shadows, created_by, updated_by
  )
  select
    light.id,
    target_scene_id,
    coalesce(light.level_id, fallback_level_id),
    light.entity_id,
    light.x,
    light.y,
    coalesce(light.elevation, 0),
    light.radius,
    light.intensity,
    light.color,
    light.enabled,
    light.casts_shadows,
    actor,
    actor
  from jsonb_to_recordset(light_documents) as light(
    id uuid, level_id uuid, entity_id uuid, x numeric, y numeric,
    elevation numeric, radius numeric, intensity numeric, color text,
    enabled boolean, casts_shadows boolean
  );

  insert into public.tabletop_fog_strokes (
    id, scene_id, level_id, operation, points, radius, sequence_index, created_by
  )
  select
    fog.id,
    target_scene_id,
    coalesce(fog.level_id, fallback_level_id),
    fog.operation,
    fog.points,
    fog.radius,
    fog.sequence_index,
    actor
  from jsonb_to_recordset(fog_documents) as fog(
    id uuid, level_id uuid, operation text, points jsonb,
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

create or replace function public.toggle_tabletop_door(
  target_session_id uuid,
  target_wall_id uuid,
  expected_wall_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  session_row public.tabletop_sessions%rowtype;
  participant_role public.campaign_role;
  wall_row public.tabletop_walls%rowtype;
  next_type text;
  next_visibility_version integer;
begin
  if actor is null then
    raise exception using errcode = '42501', message = 'TABLETOP_AUTH_REQUIRED';
  end if;
  if not (select private.is_feature_enabled('nexus_tabletop_enabled'))
     or not (select private.is_feature_enabled('nexus_realtime_enabled'))
     or not (select private.is_feature_enabled('nexus_lighting_enabled')) then
    raise exception using errcode = '42501', message = 'TABLETOP_DOOR_DISABLED';
  end if;

  select session.* into session_row
  from public.tabletop_sessions session
  where session.id = target_session_id
    and session.status = 'open'
    and session.current_scene_id is not null
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'TABLETOP_SESSION_FORBIDDEN';
  end if;

  select participant.role into participant_role
  from public.tabletop_session_participants participant
  where participant.session_id = session_row.id
    and participant.user_id = actor
    and participant.state = 'active'
    and participant.left_at is null
    and participant.removed_by is null;
  if participant_role is null or participant_role = 'observer'::public.campaign_role then
    raise exception using errcode = '42501', message = 'TABLETOP_DOOR_FORBIDDEN';
  end if;

  select wall.* into wall_row
  from public.tabletop_walls wall
  where wall.id = target_wall_id
    and wall.scene_id = session_row.current_scene_id
  for update;
  if not found
     or not wall_row.player_operable
     or wall_row.wall_type not in ('door_closed', 'door_open')
     or wall_row.version <> expected_wall_version then
    raise exception using errcode = '40001', message = 'TABLETOP_DOOR_CONFLICT';
  end if;

  next_type := case wall_row.wall_type
    when 'door_closed' then 'door_open'
    else 'door_closed'
  end;

  update public.tabletop_walls
  set wall_type = next_type,
      blocks_vision = next_type = 'door_closed',
      blocks_movement = next_type = 'door_closed',
      updated_by = actor
  where id = wall_row.id
  returning * into wall_row;

  update public.tabletop_scenes
  set visibility_version = visibility_version + 1,
      updated_by = actor,
      updated_at = clock_timestamp()
  where id = wall_row.scene_id
  returning visibility_version into next_visibility_version;

  insert into public.tabletop_scene_events (
    scene_id, event_type, payload, created_by
  ) values (
    wall_row.scene_id,
    'door.toggled',
    jsonb_build_object(
      'wall_id', wall_row.id,
      'wall_type', wall_row.wall_type,
      'wall_version', wall_row.version,
      'visibility_version', next_visibility_version
    ),
    actor
  );

  return jsonb_build_object(
    'wallId', wall_row.id,
    'wallType', wall_row.wall_type,
    'blocksVision', wall_row.blocks_vision,
    'blocksMovement', wall_row.blocks_movement,
    'version', wall_row.version,
    'visibilityVersion', next_visibility_version
  );
end;
$$;

revoke all on function public.toggle_tabletop_door(uuid, uuid, integer)
  from public, anon;
grant execute on function public.toggle_tabletop_door(uuid, uuid, integer)
  to authenticated;

comment on table public.tabletop_levels is
  'Named spatial floors for one Mesa scene. Raw rows remain manager-only.';
comment on column public.tabletop_walls.player_operable is
  'Allows an active non-observer session participant to toggle an unlocked door through the narrow RPC.';
comment on function public.toggle_tabletop_door(uuid, uuid, integer) is
  'Atomically toggles one explicitly player-operable door after feature, session, role, scene and version checks.';
