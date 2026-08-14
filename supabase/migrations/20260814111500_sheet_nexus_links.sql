create table if not exists public.sheet_nexus_links (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.character_sheets(id) on delete cascade,
  knowledge_node_id text not null,
  label text not null default '',
  relation_type text not null default 'related_to',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(sheet_id, knowledge_node_id)
);

create index if not exists sheet_nexus_links_sheet_idx
  on public.sheet_nexus_links(sheet_id, created_at desc);

alter table public.sheet_nexus_links enable row level security;

create policy "sheet nexus links readable by owner or master"
on public.sheet_nexus_links
for select to authenticated
using (
  exists (
    select 1 from public.character_sheets cs
    where cs.id = sheet_nexus_links.sheet_id and cs.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'mestre'
  )
);

create or replace function public.link_sheet_knowledge(
  p_sheet_id uuid,
  p_node_id text,
  p_label text default ''
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if not (
    exists (select 1 from public.character_sheets where id = p_sheet_id and owner_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'mestre')
  ) then
    raise exception 'Sem permissão para relacionar esta ficha';
  end if;

  insert into public.sheet_nexus_links(sheet_id, knowledge_node_id, label, created_by)
  values (p_sheet_id, left(trim(p_node_id), 180), left(trim(p_label), 240), auth.uid())
  on conflict (sheet_id, knowledge_node_id)
  do update set label = excluded.label
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.get_sheet_knowledge_links(p_sheet_id uuid)
returns table (
  id uuid,
  knowledge_node_id text,
  label text,
  relation_type text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    exists (select 1 from public.character_sheets where character_sheets.id = p_sheet_id and character_sheets.owner_id = auth.uid())
    or exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'mestre')
  ) then
    raise exception 'Sem permissão para ler as relações desta ficha';
  end if;

  return query
  select l.id, l.knowledge_node_id, l.label, l.relation_type, l.created_at
  from public.sheet_nexus_links l
  where l.sheet_id = p_sheet_id
  order by l.created_at desc;
end;
$$;

grant execute on function public.link_sheet_knowledge(uuid, text, text) to authenticated;
grant execute on function public.get_sheet_knowledge_links(uuid) to authenticated;