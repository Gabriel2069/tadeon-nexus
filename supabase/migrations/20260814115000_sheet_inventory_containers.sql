create table if not exists public.sheet_inventory_containers (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.character_sheets(id) on delete cascade,
  name text not null,
  parent_id uuid references public.sheet_inventory_containers(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists sheet_inventory_containers_sheet_idx
  on public.sheet_inventory_containers(sheet_id, created_at);

create table if not exists public.sheet_inventory_placements (
  sheet_id uuid not null references public.character_sheets(id) on delete cascade,
  item_id text not null,
  container_id uuid references public.sheet_inventory_containers(id) on delete set null,
  updated_by uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (sheet_id, item_id)
);

alter table public.sheet_inventory_containers enable row level security;
alter table public.sheet_inventory_placements enable row level security;

create policy "inventory containers readable by owner or master"
on public.sheet_inventory_containers
for select to authenticated
using (
  exists (
    select 1 from public.character_sheets cs
    where cs.id = sheet_inventory_containers.sheet_id and cs.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'mestre'
  )
);

create policy "inventory placements readable by owner or master"
on public.sheet_inventory_placements
for select to authenticated
using (
  exists (
    select 1 from public.character_sheets cs
    where cs.id = sheet_inventory_placements.sheet_id and cs.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'mestre'
  )
);

create or replace function public.can_organize_sheet_inventory(p_sheet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.character_sheets cs
      where cs.id = p_sheet_id and cs.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'mestre'
    );
$$;

create or replace function public.get_sheet_inventory_organization(p_sheet_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.can_organize_sheet_inventory(p_sheet_id) then
    raise exception 'Sem permissão para organizar este inventário';
  end if;

  select jsonb_build_object(
    'items', coalesce(cs.inventory, '[]'::jsonb),
    'containers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'parent_id', c.parent_id
        ) order by c.created_at, c.name
      )
      from public.sheet_inventory_containers c
      where c.sheet_id = p_sheet_id
    ), '[]'::jsonb),
    'placements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item_id', p.item_id,
          'container_id', p.container_id
        ) order by p.item_id
      )
      from public.sheet_inventory_placements p
      where p.sheet_id = p_sheet_id
    ), '[]'::jsonb)
  )
  into result
  from public.character_sheets cs
  where cs.id = p_sheet_id;

  return coalesce(result, jsonb_build_object('items', '[]'::jsonb, 'containers', '[]'::jsonb, 'placements', '[]'::jsonb));
end;
$$;

create or replace function public.create_sheet_inventory_container(
  p_sheet_id uuid,
  p_name text,
  p_parent_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if not public.can_organize_sheet_inventory(p_sheet_id) then
    raise exception 'Sem permissão para organizar este inventário';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'Informe um nome para o recipiente';
  end if;

  if p_parent_id is not null and not exists (
    select 1 from public.sheet_inventory_containers
    where id = p_parent_id and sheet_id = p_sheet_id
  ) then
    raise exception 'Recipiente pai inválido';
  end if;

  insert into public.sheet_inventory_containers(sheet_id, name, parent_id, created_by)
  values (p_sheet_id, left(trim(p_name), 120), p_parent_id, auth.uid())
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.place_sheet_inventory_item(
  p_sheet_id uuid,
  p_item_id text,
  p_container_id uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_organize_sheet_inventory(p_sheet_id) then
    raise exception 'Sem permissão para organizar este inventário';
  end if;

  if p_container_id is not null and not exists (
    select 1 from public.sheet_inventory_containers
    where id = p_container_id and sheet_id = p_sheet_id
  ) then
    raise exception 'Recipiente inválido';
  end if;

  if p_container_id is null then
    delete from public.sheet_inventory_placements
    where sheet_id = p_sheet_id and item_id = left(trim(p_item_id), 180);
  else
    insert into public.sheet_inventory_placements(sheet_id, item_id, container_id, updated_by)
    values (p_sheet_id, left(trim(p_item_id), 180), p_container_id, auth.uid())
    on conflict (sheet_id, item_id)
    do update set
      container_id = excluded.container_id,
      updated_by = excluded.updated_by,
      updated_at = now();
  end if;

  return true;
end;
$$;

create or replace function public.delete_sheet_inventory_container(p_container_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_sheet_id uuid;
begin
  select sheet_id into target_sheet_id
  from public.sheet_inventory_containers
  where id = p_container_id;

  if target_sheet_id is null or not public.can_organize_sheet_inventory(target_sheet_id) then
    raise exception 'Sem permissão para remover este recipiente';
  end if;

  update public.sheet_inventory_containers
  set parent_id = null
  where parent_id = p_container_id;

  delete from public.sheet_inventory_containers where id = p_container_id;
  return true;
end;
$$;

revoke all on function public.can_organize_sheet_inventory(uuid) from public, anon;
revoke all on function public.get_sheet_inventory_organization(uuid) from public, anon;
revoke all on function public.create_sheet_inventory_container(uuid, text, uuid) from public, anon;
revoke all on function public.place_sheet_inventory_item(uuid, text, uuid) from public, anon;
revoke all on function public.delete_sheet_inventory_container(uuid) from public, anon;

grant execute on function public.can_organize_sheet_inventory(uuid) to authenticated;
grant execute on function public.get_sheet_inventory_organization(uuid) to authenticated;
grant execute on function public.create_sheet_inventory_container(uuid, text, uuid) to authenticated;
grant execute on function public.place_sheet_inventory_item(uuid, text, uuid) to authenticated;
grant execute on function public.delete_sheet_inventory_container(uuid) to authenticated;