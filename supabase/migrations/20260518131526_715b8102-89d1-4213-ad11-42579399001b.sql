
alter table public.game_settings
  add column if not exists npcs jsonb not null default '[]'::jsonb,
  add column if not exists monsters jsonb not null default '[]'::jsonb,
  add column if not exists clues jsonb not null default '[]'::jsonb,
  add column if not exists scenes_detailed jsonb not null default '[]'::jsonb,
  add column if not exists initiative_order jsonb not null default '[]'::jsonb,
  add column if not exists pinned_sheet_ids jsonb not null default '[]'::jsonb;

