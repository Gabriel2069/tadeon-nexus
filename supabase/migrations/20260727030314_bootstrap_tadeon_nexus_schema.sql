
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




create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.get_user_role(uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;




alter table public.game_settings
  add column if not exists npcs jsonb not null default '[]'::jsonb,
  add column if not exists monsters jsonb not null default '[]'::jsonb,
  add column if not exists clues jsonb not null default '[]'::jsonb,
  add column if not exists scenes_detailed jsonb not null default '[]'::jsonb,
  add column if not exists initiative_order jsonb not null default '[]'::jsonb,
  add column if not exists pinned_sheet_ids jsonb not null default '[]'::jsonb;




ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS upgrade_costs jsonb NOT NULL DEFAULT '{"pv":{"base":10,"freeLevels":3,"increment":5},"ps":{"base":10,"freeLevels":3,"increment":5},"pe":{"base":10,"freeLevels":3,"increment":5},"def":{"base":10,"freeLevels":3,"increment":5}}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_options jsonb NOT NULL DEFAULT '{"fisica":["Normal","Sangrando","Atordoado","Ferido","Inconsciente"],"mental":["Normal","Em pânico","Confuso","Aterrorizado","Drenado"],"energetica":["Normal","Drenado","Sobrecarregado","Em ressonância","Apagado"],"outras":["Normal","Marcado","Possuído","Amaldiçoado"]}'::jsonb;




ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS description jsonb NOT NULL DEFAULT '{"historia":"","personalidade":"","objetivos":"","observacoes":""}'::jsonb;



ALTER TABLE public.game_settings
ADD COLUMN IF NOT EXISTS skill_groups jsonb NOT NULL DEFAULT '[
  {"attr":"COR","label":"Corpo","skills":["Acrobacia","Atletismo","Combate","Furtividade"]},
  {"attr":"MEN","label":"Mente","skills":["Investigação","Percepção","Sobrevivência","Vontade"]},
  {"attr":"INS","label":"Instinto","skills":["Iniciativa","Pontaria","Reflexos","Intuição"]},
  {"attr":"PRE","label":"Presença","skills":["Atuação","Diplomacia","Enganação","Intimidação"]},
  {"attr":"ERU","label":"Erudição","skills":["Ciências","Medicina","Ocultismo","Tecnologia"]}
]'::jsonb;



-- 1) Lock down game_settings reads to mestre only
DROP POLICY IF EXISTS "Settings: authenticated read" ON public.game_settings;

CREATE POLICY "Settings: mestre read"
ON public.game_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'mestre'::app_role));

-- 2) Public-safe RPC for non-mestre clients (no NPCs, monsters, clues, scenes, etc.)
CREATE OR REPLACE FUNCTION public.get_public_game_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'rank_table',        rank_table,
    'skill_branches',    skill_branches,
    'upgrade_costs',     upgrade_costs,
    'condition_options', condition_options,
    'skill_groups',      skill_groups
  )
  FROM public.game_settings
  WHERE key = 'global'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;

-- 3) Power-form additions on character sheets
ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS power_form_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS power_form_data jsonb NOT NULL DEFAULT '{}'::jsonb;




ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS fragments_items jsonb NOT NULL DEFAULT '[]'::jsonb;



ALTER TABLE public.character_sheets
ADD COLUMN IF NOT EXISTS defense_items jsonb NOT NULL DEFAULT '[]'::jsonb;



ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS weapon_proficiency text NOT NULL DEFAULT 'leigo';

ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS skill_training_costs jsonb NOT NULL DEFAULT '[2,3,4]'::jsonb;

CREATE OR REPLACE FUNCTION public.get_public_game_settings()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'rank_table',            rank_table,
    'skill_branches',        skill_branches,
    'upgrade_costs',         upgrade_costs,
    'condition_options',     condition_options,
    'skill_groups',          skill_groups,
    'skill_training_costs',  skill_training_costs
  )
  FROM public.game_settings
  WHERE key = 'global'
  LIMIT 1;
$function$;



-- Prevent spectators from deleting sheets they own. The previous policy blocked
-- spectator updates/inserts, but its DELETE branch missed the same role check.
drop policy if exists "Sheets: owner or mestre delete" on public.character_sheets;

create policy "Sheets: owner or mestre delete"
  on public.character_sheets for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'mestre')
    or (
      auth.uid() = owner_id
      and not public.has_role(auth.uid(), 'espectador')
    )
  );

-- The app treats a user as having exactly one role. Normalize legacy duplicate
-- rows and enforce that invariant so role changes can use one atomic upsert.
with ranked_roles as (
  select
    id,
    row_number() over (
      partition by user_id
      order by
        case role
          when 'mestre' then 0
          when 'jogador' then 1
          else 2
        end,
        created_at,
        id
    ) as row_number
  from public.user_roles
)
delete from public.user_roles
where id in (select id from ranked_roles where row_number > 1);

alter table public.user_roles
  drop constraint if exists user_roles_user_id_role_key;

alter table public.user_roles
  drop constraint if exists user_roles_user_id_key;

alter table public.user_roles
  add constraint user_roles_user_id_key unique (user_id);

-- Role mutations now go through an authenticated server function. Removing the
-- broad client write policy prevents direct requests from changing the caller's
-- own role or leaving the project without a master.
drop policy if exists "Roles: mestre manages all" on public.user_roles;


-- Align character rules with the revised rulebook and add private master-hub data.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS drift integer NOT NULL DEFAULT 0;

ALTER TABLE public.character_sheets
  ADD CONSTRAINT character_sheets_drift_range CHECK (drift BETWEEN -3 AND 3);

UPDATE public.character_sheets
SET stats = COALESCE(stats, '{}'::jsonb) || jsonb_build_object(
  'pa_current', COALESCE(stats->'pa_current', '0'::jsonb),
  'pa_mod', COALESCE(stats->'pa_mod', '0'::jsonb)
);

ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS campaign_title text NOT NULL DEFAULT 'Tessitura do Vazio',
  ADD COLUMN IF NOT EXISTS campaign_phase text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS master_npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS investigation_clues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS threats jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interludes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS folds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rules_version integer NOT NULL DEFAULT 1;

-- Preserve legacy master data. The client normalizes the old shape on load.
UPDATE public.game_settings
SET
  master_npcs = CASE WHEN master_npcs = '[]'::jsonb THEN npcs ELSE master_npcs END,
  investigation_clues = CASE
    WHEN investigation_clues = '[]'::jsonb THEN clues
    ELSE investigation_clues
  END,
  threats = CASE WHEN threats = '[]'::jsonb THEN monsters ELSE threats END
WHERE key = 'global';

UPDATE public.game_settings
SET
  rank_table = '[
    {"rank":0,"pv":15,"ps":13,"pe":5,"pa":0,"def":5,"pm":0},
    {"rank":5,"pv":18,"ps":14,"pe":6,"pa":0,"def":6,"pm":8},
    {"rank":10,"pv":21,"ps":15,"pe":7,"pa":1,"def":7,"pm":8},
    {"rank":15,"pv":24,"ps":16,"pe":8,"pa":1,"def":8,"pm":10},
    {"rank":20,"pv":27,"ps":18,"pe":9,"pa":2,"def":9,"pm":10},
    {"rank":25,"pv":30,"ps":20,"pe":10,"pa":2,"def":10,"pm":12},
    {"rank":30,"pv":33,"ps":22,"pe":11,"pa":2,"def":11,"pm":12},
    {"rank":35,"pv":36,"ps":24,"pe":12,"pa":3,"def":12,"pm":14},
    {"rank":40,"pv":39,"ps":26,"pe":13,"pa":3,"def":13,"pm":14},
    {"rank":45,"pv":42,"ps":28,"pe":14,"pa":3,"def":14,"pm":16},
    {"rank":50,"pv":45,"ps":30,"pe":15,"pa":3,"def":15,"pm":16},
    {"rank":55,"pv":48,"ps":32,"pe":16,"pa":4,"def":16,"pm":18},
    {"rank":60,"pv":51,"ps":34,"pe":17,"pa":4,"def":17,"pm":18},
    {"rank":65,"pv":54,"ps":36,"pe":18,"pa":4,"def":18,"pm":20},
    {"rank":70,"pv":57,"ps":38,"pe":19,"pa":4,"def":19,"pm":20},
    {"rank":75,"pv":60,"ps":40,"pe":20,"pa":4,"def":20,"pm":22},
    {"rank":80,"pv":63,"ps":42,"pe":21,"pa":5,"def":21,"pm":22},
    {"rank":85,"pv":66,"ps":44,"pe":22,"pa":5,"def":22,"pm":23},
    {"rank":90,"pv":69,"ps":46,"pe":23,"pa":5,"def":23,"pm":23},
    {"rank":95,"pv":72,"ps":48,"pe":24,"pa":5,"def":24,"pm":24},
    {"rank":100,"pv":75,"ps":50,"pe":25,"pa":5,"def":25,"pm":25}
  ]'::jsonb,
  skill_groups = '[
    {"attr":"COR","label":"Corpo","skills":["Acrobacia","Atletismo","Fortitude","Furtividade","Ímpeto","Luta"]},
    {"attr":"MEN","label":"Mente","skills":["Canalização","Concentração","Investigação","Lógica","Tática","Vontade"]},
    {"attr":"INS","label":"Instinto","skills":["Adestramento","Iniciativa","Intuição","Percepção","Reflexo","Sobrevivência"]},
    {"attr":"PRE","label":"Presença","skills":["Atualidades","Convicção","Diplomacia","Encenação","Intimidação","Persuasão"]},
    {"attr":"ERU","label":"Erudição","skills":["Ciências","Crime","Medicina","Pilotagem","Pontaria","Tecnologia"]}
  ]'::jsonb,
  skill_training_costs = '[1,2,3]'::jsonb,
  upgrade_costs = '{
    "pv":{"base":1,"freeLevels":1,"increment":1},
    "ps":{"base":1,"freeLevels":1,"increment":1},
    "pe":{"base":1,"freeLevels":1,"increment":1},
    "def":{"base":2,"freeLevels":1,"increment":2}
  }'::jsonb,
  condition_options = '{
    "fisica":["Normal","Machucado","Ferido","Incapacitado","Morrendo","Sangrando","Em Chamas","Inconsciente"],
    "mental":["Normal","Abalado","Apavorado","Colapso","Perdição","Frustrado","Fascinado"],
    "energetica":["Normal","Fadigado","Sobrecarregado","Esgotado","Refluxo"],
    "outras":["Normal","Caído","Imóvel","Cego","Surdo","Agarrado","Envenenado","Doente","Asfixiado"]
  }'::jsonb,
  -- Empty means "use the versioned canonical branches embedded in the client".
  skill_branches = '[]'::jsonb,
  rules_version = 1
WHERE key = 'global';

CREATE OR REPLACE FUNCTION public.get_public_game_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'rank_table', rank_table,
    'skill_branches', skill_branches,
    'upgrade_costs', upgrade_costs,
    'condition_options', condition_options,
    'skill_groups', skill_groups,
    'skill_training_costs', skill_training_costs,
    'rules_version', rules_version
  )
  FROM public.game_settings
  WHERE key = 'global'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;


-- Remove broad metadata access and keep public game rules separate from private
-- master data. Policies use the caller's own role row, so no externally
-- executable SECURITY DEFINER role helper is required.

DROP POLICY IF EXISTS "Roles: anyone authenticated can read" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: mestre manages all" ON public.user_roles;

CREATE POLICY "Roles: read own assignment"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Profiles: own or mestre select" ON public.profiles;
CREATE POLICY "Profiles: own or mestre select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Profiles: update own or mestre" ON public.profiles;
CREATE POLICY "Profiles: update own or mestre"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre or espectador read" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre read"
  ON public.character_sheets FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre insert" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre insert"
  ON public.character_sheets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre update" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre update"
  ON public.character_sheets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre delete" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre delete"
  ON public.character_sheets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Settings: mestre read" ON public.game_settings;
CREATE POLICY "Settings: mestre read"
  ON public.game_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Settings: mestre write" ON public.game_settings;
CREATE POLICY "Settings: mestre write"
  ON public.game_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Trigger functions must not be callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.game_rules (
  key text PRIMARY KEY,
  rank_table jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  upgrade_costs jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  skill_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_training_costs jsonb NOT NULL DEFAULT '[1,2,3]'::jsonb,
  rules_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Game rules: authenticated read" ON public.game_rules;
CREATE POLICY "Game rules: authenticated read"
  ON public.game_rules FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.game_rules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.game_rules TO authenticated;

INSERT INTO public.game_rules (
  key,
  rank_table,
  skill_branches,
  upgrade_costs,
  condition_options,
  skill_groups,
  skill_training_costs,
  rules_version,
  updated_at
)
SELECT
  key,
  rank_table,
  skill_branches,
  upgrade_costs,
  condition_options,
  skill_groups,
  skill_training_costs,
  rules_version,
  updated_at
FROM public.game_settings
ON CONFLICT (key) DO UPDATE SET
  rank_table = EXCLUDED.rank_table,
  skill_branches = EXCLUDED.skill_branches,
  upgrade_costs = EXCLUDED.upgrade_costs,
  condition_options = EXCLUDED.condition_options,
  skill_groups = EXCLUDED.skill_groups,
  skill_training_costs = EXCLUDED.skill_training_costs,
  rules_version = EXCLUDED.rules_version,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.sync_game_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.game_rules (
    key,
    rank_table,
    skill_branches,
    upgrade_costs,
    condition_options,
    skill_groups,
    skill_training_costs,
    rules_version,
    updated_at
  )
  VALUES (
    NEW.key,
    NEW.rank_table,
    NEW.skill_branches,
    NEW.upgrade_costs,
    NEW.condition_options,
    NEW.skill_groups,
    NEW.skill_training_costs,
    NEW.rules_version,
    NEW.updated_at
  )
  ON CONFLICT (key) DO UPDATE SET
    rank_table = EXCLUDED.rank_table,
    skill_branches = EXCLUDED.skill_branches,
    upgrade_costs = EXCLUDED.upgrade_costs,
    condition_options = EXCLUDED.condition_options,
    skill_groups = EXCLUDED.skill_groups,
    skill_training_costs = EXCLUDED.skill_training_costs,
    rules_version = EXCLUDED.rules_version,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_game_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_game_rules_after_write ON public.game_settings;
CREATE TRIGGER sync_game_rules_after_write
  AFTER INSERT OR UPDATE ON public.game_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_game_rules();

CREATE OR REPLACE FUNCTION public.get_public_game_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'rank_table', rank_table,
    'skill_branches', skill_branches,
    'upgrade_costs', upgrade_costs,
    'condition_options', condition_options,
    'skill_groups', skill_groups,
    'skill_training_costs', skill_training_costs,
    'rules_version', rules_version
  )
  FROM public.game_rules
  WHERE key = 'global'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;


-- Persist the identity fields introduced by the final ruleset.
-- Existing sheets receive a neutral structure and remain fully compatible.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS identity_data jsonb NOT NULL DEFAULT '{
    "conviction": "",
    "limit": "",
    "wound": "",
    "question": "",
    "lifeCycleTrait": "",
    "links": [
      {"id": "link-1", "name": "", "relation": "", "state": "Presente"},
      {"id": "link-2", "name": "", "relation": "", "state": "Presente"}
    ]
  }'::jsonb;

COMMENT ON COLUMN public.character_sheets.identity_data IS
  'Identity, life-cycle trait and character links from rules version 3.';


-- Persist the exact creation degrees and the family selected for Proficiência III.
-- The final rules grant Proficiência II at creation, so legacy Leigo rows are
-- upgraded without spending PM.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS initial_skill_degrees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weapon_proficiency_family text NOT NULL DEFAULT '';

ALTER TABLE public.character_sheets
  ALTER COLUMN weapon_proficiency SET DEFAULT 'operador';

UPDATE public.character_sheets
SET weapon_proficiency = 'operador'
WHERE weapon_proficiency IS NULL
   OR weapon_proficiency = ''
   OR weapon_proficiency = 'leigo';

COMMENT ON COLUMN public.character_sheets.initial_skill_degrees IS
  'Per-skill count of the seven free creation degrees, limited to two per skill.';

COMMENT ON COLUMN public.character_sheets.weapon_proficiency_family IS
  'Contato or Projeção when the character has Proficiência III (Combatente).';


-- Reconcile databases connected after the final rules migration was authored.
-- This migration is additive and idempotent: it never drops rows and only
-- normalizes legacy values that the application cannot interpret.
ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS initial_skill_degrees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weapon_proficiency_family text NOT NULL DEFAULT '';

UPDATE public.character_sheets
SET initial_skill_degrees = '{}'::jsonb
WHERE jsonb_typeof(initial_skill_degrees) <> 'object';

UPDATE public.character_sheets
SET weapon_proficiency_family = ''
WHERE weapon_proficiency_family NOT IN ('', 'Contato', 'Projeção');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.character_sheets'::regclass
      AND conname = 'character_sheets_initial_skill_degrees_object'
  ) THEN
    ALTER TABLE public.character_sheets
      ADD CONSTRAINT character_sheets_initial_skill_degrees_object
      CHECK (jsonb_typeof(initial_skill_degrees) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.character_sheets'::regclass
      AND conname = 'character_sheets_weapon_proficiency_family_valid'
  ) THEN
    ALTER TABLE public.character_sheets
      ADD CONSTRAINT character_sheets_weapon_proficiency_family_valid
      CHECK (weapon_proficiency_family IN ('', 'Contato', 'Projeção'));
  END IF;
END
$$;

COMMENT ON COLUMN public.character_sheets.initial_skill_degrees IS
  'Mapa dos sete graus iniciais gratuitos, limitado a dois graus por perícia.';

COMMENT ON COLUMN public.character_sheets.weapon_proficiency_family IS
  'Família escolhida para Proficiência III: Contato ou Projeção.';


-- Reconcile a Supabase project that was connected after users had already
-- registered. Auth triggers only handle future sign-ups, so existing users need
-- a one-time backfill.

INSERT INTO public.profiles (id, email, full_name)
SELECT
  users.id,
  users.email,
  COALESCE(
    NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
    users.email,
    'Usuário'
  )
FROM auth.users AS users
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(NULLIF(public.profiles.full_name, ''), EXCLUDED.full_name),
  updated_at = now();

INSERT INTO public.user_roles (user_id, role)
SELECT
  users.id,
  CASE
    WHEN lower(users.email) = lower('gabriel.tadeu.souza10@gmail.com')
      THEN 'mestre'::public.app_role
    ELSE 'jogador'::public.app_role
  END
FROM auth.users AS users
ON CONFLICT (user_id) DO NOTHING;

-- The designated project owner must remain a master even if the schema is
-- restored after that account was created.
UPDATE public.user_roles
SET role = 'mestre'::public.app_role
WHERE user_id = (
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower('gabriel.tadeu.souza10@gmail.com')
  LIMIT 1
);

-- Owner emails are resolved through the protected profiles table. Keeping a
-- duplicated NOT NULL email on each sheet both leaks data and breaks current
-- inserts, which intentionally send only owner_id.
ALTER TABLE public.character_sheets
  DROP COLUMN IF EXISTS owner_email;

-- SQL-created tables are not guaranteed to inherit Data API grants. RLS remains
-- the authorization boundary; these grants only expose the permitted commands
-- to authenticated requests.
GRANT USAGE ON SCHEMA public TO authenticated;

REVOKE ALL ON TABLE
  public.profiles,
  public.user_roles,
  public.character_sheets,
  public.game_settings,
  public.game_rules
FROM anon;

GRANT SELECT, INSERT, UPDATE
  ON TABLE public.profiles
  TO authenticated;

GRANT SELECT
  ON TABLE public.user_roles, public.game_rules
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.character_sheets, public.game_settings
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;

NOTIFY pgrst, 'reload schema';

