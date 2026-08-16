alter table public.tabletop_walls add column if not exists label text;
alter table public.tabletop_lights add column if not exists label text;
alter table public.tabletop_fog_strokes add column if not exists label text;

update public.tabletop_walls
set label = initcap(replace(wall_type, '_', ' '))
where label is null;

update public.tabletop_lights
set label = 'Luz'
where label is null;

update public.tabletop_fog_strokes
set label = case
  when operation = 'reveal' then 'Revelação de névoa'
  else 'Cobertura de névoa'
end
where label is null;
