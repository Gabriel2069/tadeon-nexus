create index if not exists tabletop_levels_created_by_idx
  on public.tabletop_levels(created_by);
create index if not exists tabletop_levels_updated_by_idx
  on public.tabletop_levels(updated_by);
