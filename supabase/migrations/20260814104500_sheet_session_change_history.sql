create table if not exists public.sheet_session_history (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.character_sheets(id) on delete cascade,
  sheet_name text not null default '',
  saved_by uuid not null references auth.users(id) on delete cascade,
  saved_at timestamptz not null default now(),
  changes jsonb not null default '{}'::jsonb,
  baseline jsonb not null default '{}'::jsonb
);

create index if not exists sheet_session_history_sheet_saved_idx
  on public.sheet_session_history(sheet_id, saved_at desc);

alter table public.sheet_session_history enable row level security;

create policy "sheet history readable by owner or master"
on public.sheet_session_history
for select
to authenticated
using (
  exists (
    select 1 from public.character_sheets cs
    where cs.id = sheet_session_history.sheet_id
      and cs.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'mestre'
  )
);

create or replace function public.sheet_history_snapshot(source jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select jsonb_build_object(
    'name', source -> 'name',
    'occupation', source -> 'occupation',
    'age', source -> 'age',
    'brand', source -> 'brand',
    'origin', source -> 'origin',
    'motivation', source -> 'motivation',
    'exposure', source -> 'exposure',
    'equilibrium', source -> 'equilibrium',
    'drift', source -> 'drift',
    'attributes', source -> 'attributes',
    'stats', source -> 'stats',
    'condition', source -> 'condition',
    'conditions', source -> 'conditions',
    'dying', source -> 'dying',
    'going_insane', source -> 'going_insane',
    'skills', source -> 'skills',
    'weapons', source -> 'weapons',
    'inventory', source -> 'inventory',
    'inventory_capacity', source -> 'inventory_capacity',
    'abilities', source -> 'abilities',
    'plots', source -> 'plots',
    'fragments', source -> 'fragments',
    'stat_upgrades', source -> 'stat_upgrades',
    'purchased_skills', source -> 'purchased_skills',
    'description', source -> 'description',
    'identity_data', source -> 'identity_data',
    'fragments_items', source -> 'fragments_items',
    'defense_items', source -> 'defense_items',
    'weapon_proficiency', source -> 'weapon_proficiency',
    'weapon_proficiency_family', source -> 'weapon_proficiency_family'
  );
$$;

create or replace function public.save_session_sheet_changes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sheet_row record;
  current_snapshot jsonb;
  previous_snapshot jsonb;
  diff jsonb;
  item record;
  inserted_count integer := 0;
begin
  if not exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'mestre'
  ) then
    raise exception 'Somente o mestre pode salvar o histórico da sessão';
  end if;

  for sheet_row in select * from public.character_sheets order by id loop
    current_snapshot := public.sheet_history_snapshot(to_jsonb(sheet_row));
    select h.baseline into previous_snapshot
    from public.sheet_session_history h
    where h.sheet_id = sheet_row.id
    order by h.saved_at desc
    limit 1;

    diff := '{}'::jsonb;
    if previous_snapshot is null then
      diff := jsonb_build_object(
        'session_baseline', jsonb_build_object(
          'before', null,
          'after', 'Estado inicial registrado'
        )
      );
    else
      for item in select key, value from jsonb_each(current_snapshot) loop
        if (previous_snapshot -> item.key) is distinct from item.value then
          diff := diff || jsonb_build_object(
            item.key,
            jsonb_build_object(
              'before', previous_snapshot -> item.key,
              'after', item.value
            )
          );
        end if;
      end loop;
    end if;

    if diff <> '{}'::jsonb then
      insert into public.sheet_session_history(
        sheet_id, sheet_name, saved_by, changes, baseline
      ) values (
        sheet_row.id,
        coalesce(sheet_row.name, ''),
        auth.uid(),
        diff,
        current_snapshot
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  return inserted_count;
end;
$$;

create or replace function public.get_sheet_session_changes(p_sheet_id uuid, p_limit integer default 12)
returns table (
  id uuid,
  saved_at timestamptz,
  sheet_name text,
  changes jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'mestre'
    )
    or exists (
      select 1 from public.character_sheets
      where character_sheets.id = p_sheet_id
        and character_sheets.owner_id = auth.uid()
    )
  ) then
    raise exception 'Sem permissão para ler o histórico desta ficha';
  end if;

  return query
  select h.id, h.saved_at, h.sheet_name, h.changes
  from public.sheet_session_history h
  where h.sheet_id = p_sheet_id
  order by h.saved_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 50));
end;
$$;

grant execute on function public.save_session_sheet_changes() to authenticated;
grant execute on function public.get_sheet_session_changes(uuid, integer) to authenticated;
