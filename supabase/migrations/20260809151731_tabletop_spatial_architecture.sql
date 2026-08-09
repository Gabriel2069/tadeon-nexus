alter table public.tabletop_walls
  drop constraint if exists tabletop_walls_wall_type_check,
  add constraint tabletop_walls_wall_type_check
    check (
      wall_type = any (
        array[
          'wall'::text,
          'door_closed'::text,
          'door_open'::text,
          'door_locked'::text,
          'window_closed'::text,
          'window_open'::text,
          'window_broken'::text,
          'roof_visible'::text,
          'roof_cutaway'::text,
          'roof_hidden'::text
        ]
      )
    );

comment on column public.tabletop_walls.wall_type is
  'Spatial architecture state for walls, doors, windows and roof volumes.';
