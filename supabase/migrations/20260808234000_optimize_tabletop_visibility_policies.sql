-- Keep visibility authorization unchanged while avoiding overlapping SELECT
-- policies created by FOR ALL. Cover the remaining auth.users foreign keys so
-- cleanup and joins stay efficient as scenes accumulate visibility records.

create index if not exists tabletop_walls_created_by_idx
  on public.tabletop_walls(created_by);
create index if not exists tabletop_walls_updated_by_idx
  on public.tabletop_walls(updated_by);
create index if not exists tabletop_lights_created_by_idx
  on public.tabletop_lights(created_by);
create index if not exists tabletop_lights_updated_by_idx
  on public.tabletop_lights(updated_by);
create index if not exists tabletop_fog_strokes_created_by_idx
  on public.tabletop_fog_strokes(created_by);

drop policy if exists "Tabletop walls: campaign managers write" on public.tabletop_walls;
drop policy if exists "Tabletop walls: campaign managers insert" on public.tabletop_walls;
drop policy if exists "Tabletop walls: campaign managers update" on public.tabletop_walls;
drop policy if exists "Tabletop walls: campaign managers delete" on public.tabletop_walls;

create policy "Tabletop walls: campaign managers insert"
on public.tabletop_walls for insert to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_walls.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

create policy "Tabletop walls: campaign managers update"
on public.tabletop_walls for update to authenticated
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

create policy "Tabletop walls: campaign managers delete"
on public.tabletop_walls for delete to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_walls.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));

drop policy if exists "Tabletop lights: campaign managers write" on public.tabletop_lights;
drop policy if exists "Tabletop lights: campaign managers insert" on public.tabletop_lights;
drop policy if exists "Tabletop lights: campaign managers update" on public.tabletop_lights;
drop policy if exists "Tabletop lights: campaign managers delete" on public.tabletop_lights;

create policy "Tabletop lights: campaign managers insert"
on public.tabletop_lights for insert to authenticated
with check (
  created_by = (select auth.uid())
  and updated_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_lights.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

create policy "Tabletop lights: campaign managers update"
on public.tabletop_lights for update to authenticated
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

create policy "Tabletop lights: campaign managers delete"
on public.tabletop_lights for delete to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_lights.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));

drop policy if exists "Tabletop fog: campaign managers write" on public.tabletop_fog_strokes;
drop policy if exists "Tabletop fog: campaign managers insert" on public.tabletop_fog_strokes;
drop policy if exists "Tabletop fog: campaign managers update" on public.tabletop_fog_strokes;
drop policy if exists "Tabletop fog: campaign managers delete" on public.tabletop_fog_strokes;

create policy "Tabletop fog: campaign managers insert"
on public.tabletop_fog_strokes for insert to authenticated
with check (
  created_by = (select auth.uid())
  and exists (
    select 1 from public.tabletop_scenes scene
    where scene.id = tabletop_fog_strokes.scene_id
      and (select private.can_co_manage_campaign(scene.campaign_id))
  )
);

create policy "Tabletop fog: campaign managers update"
on public.tabletop_fog_strokes for update to authenticated
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

create policy "Tabletop fog: campaign managers delete"
on public.tabletop_fog_strokes for delete to authenticated
using (exists (
  select 1 from public.tabletop_scenes scene
  where scene.id = tabletop_fog_strokes.scene_id
    and (select private.can_co_manage_campaign(scene.campaign_id))
));
