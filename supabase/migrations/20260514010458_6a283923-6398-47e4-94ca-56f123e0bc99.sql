
-- Roles enum and table
create type public.app_role as enum ('mestre', 'jogador', 'espectador');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create or replace function public.get_user_role(_user_id uuid)
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = _user_id limit 1
$$;

-- Profiles policies
create policy "Profiles: own or mestre select"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'mestre'));

create policy "Profiles: insert self"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Profiles: update own or mestre"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(), 'mestre'));

-- user_roles policies
create policy "Roles: anyone authenticated can read"
  on public.user_roles for select
  to authenticated
  using (true);

create policy "Roles: mestre manages all"
  on public.user_roles for all
  to authenticated
  using (public.has_role(auth.uid(), 'mestre'))
  with check (public.has_role(auth.uid(), 'mestre'));

-- Auto profile + first-user-as-mestre trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));

  select count(*) = 0 into is_first from public.user_roles;

  insert into public.user_roles (user_id, role)
  values (new.id, case when is_first then 'mestre'::app_role else 'jogador'::app_role end);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Character sheets
create table public.character_sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text not null,
  name text not null,
  occupation text default '',
  age text default '',
  brand text default '',
  origin text default '',
  motivation text default '',
  exposure integer not null default 0,
  attributes jsonb not null default '{"COR":1,"MEN":1,"INS":1,"PRE":1,"ERU":1}'::jsonb,
  stats jsonb not null default '{"pv_current":0,"pv_mod":0,"ps_current":0,"ps_mod":0,"pe_current":0,"pe_mod":0,"pa_current":0,"pa_mod":0,"def_equip":0,"def_mod":0,"pm_current":0,"pm_mod":0}'::jsonb,
  equilibrium integer not null default 0,
  condition text default 'Normal',
  conditions jsonb not null default '{"fisica":"Normal","mental":"Normal","energetica":"Normal","outras":"Normal"}'::jsonb,
  dying integer not null default 0,
  going_insane integer not null default 0,
  skill_bonus text default '',
  skills jsonb not null default '{}'::jsonb,
  weapons jsonb not null default '[]'::jsonb,
  inventory jsonb not null default '[]'::jsonb,
  inventory_capacity integer not null default 8,
  abilities jsonb not null default '[]'::jsonb,
  plots jsonb not null default '[]'::jsonb,
  fragments integer not null default 0,
  pm_spent integer not null default 0,
  stat_upgrades jsonb not null default '{"pv":0,"ps":0,"pe":0,"def":0}'::jsonb,
  purchased_skills jsonb not null default '[]'::jsonb,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.character_sheets enable row level security;

create policy "Sheets: owner or mestre or espectador read"
  on public.character_sheets for select
  to authenticated
  using (
    auth.uid() = owner_id
    or public.has_role(auth.uid(), 'mestre')
    or public.has_role(auth.uid(), 'espectador')
  );

create policy "Sheets: owner or mestre insert"
  on public.character_sheets for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'mestre')
    or (auth.uid() = owner_id and not public.has_role(auth.uid(), 'espectador'))
  );

create policy "Sheets: owner or mestre update"
  on public.character_sheets for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'mestre')
    or (auth.uid() = owner_id and not public.has_role(auth.uid(), 'espectador'))
  );

create policy "Sheets: owner or mestre delete"
  on public.character_sheets for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'mestre')
    or auth.uid() = owner_id
  );

create trigger character_sheets_updated_at
  before update on public.character_sheets
  for each row execute function public.set_updated_at();

-- Game settings (single global row)
create table public.game_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique default 'global',
  rank_table jsonb not null default '[]'::jsonb,
  skill_branches jsonb not null default '[]'::jsonb,
  initiative_notes text default '',
  scene_combat text default '',
  scene_investigation text default '',
  scene_dialogue text default '',
  reminders text default '',
  quick_refs text default '',
  updated_at timestamptz not null default now()
);

alter table public.game_settings enable row level security;

create policy "Settings: authenticated read"
  on public.game_settings for select
  to authenticated using (true);

create policy "Settings: mestre write"
  on public.game_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'mestre'))
  with check (public.has_role(auth.uid(), 'mestre'));

create trigger game_settings_updated_at
  before update on public.game_settings
  for each row execute function public.set_updated_at();

-- Seed default rank table and one global row
insert into public.game_settings (key, rank_table, skill_branches)
values (
  'global',
  '[
    {"rank":0,"pv":10,"ps":10,"pe":5,"pa":0,"def":10,"pm":0},
    {"rank":5,"pv":15,"ps":15,"pe":8,"pa":1,"def":11,"pm":3},
    {"rank":10,"pv":20,"ps":20,"pe":11,"pa":2,"def":12,"pm":6},
    {"rank":15,"pv":25,"ps":25,"pe":14,"pa":3,"def":13,"pm":9},
    {"rank":20,"pv":30,"ps":30,"pe":17,"pa":4,"def":14,"pm":12},
    {"rank":25,"pv":35,"ps":35,"pe":20,"pa":5,"def":15,"pm":15},
    {"rank":30,"pv":40,"ps":40,"pe":23,"pa":6,"def":16,"pm":18}
  ]'::jsonb,
  '[
    {"id":"corporal","label":"Corporal","color":"#ef4444","nodes":[
      {"id":"cor_1","name":"Vigor","desc":"+1 PV permanente","cost":3,"minRank":0,"requires":[],"attrReqs":[]},
      {"id":"cor_2","name":"Resistência","desc":"+1 Defesa permanente","cost":4,"minRank":5,"requires":["cor_1"],"attrReqs":[{"attr":"COR","value":2}]}
    ]},
    {"id":"cinetico","label":"Cinético","color":"#3b82f6","nodes":[
      {"id":"cin_1","name":"Reflexos","desc":"+1 em testes de Instinto","cost":3,"minRank":0,"requires":[],"attrReqs":[]}
    ]},
    {"id":"canalizador","label":"Canalizador","color":"#a855f7","nodes":[
      {"id":"can_1","name":"Foco","desc":"+1 PE permanente","cost":3,"minRank":0,"requires":[],"attrReqs":[]}
    ]},
    {"id":"consciencia","label":"Consciência","color":"#10b981","nodes":[
      {"id":"con_1","name":"Percepção","desc":"+1 em testes de Mente","cost":3,"minRank":0,"requires":[],"attrReqs":[{"attr":"MEN","value":2}]}
    ]}
  ]'::jsonb
);

