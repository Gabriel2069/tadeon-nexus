create table if not exists public.app_error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fingerprint text not null check (char_length(fingerprint) between 8 and 120),
  message text not null check (char_length(message) between 1 and 500),
  route text not null default '/' check (char_length(route) <= 240),
  source text not null default 'client' check (source in ('client', 'network', 'save')),
  severity text not null default 'error' check (severity in ('warning', 'error')),
  context jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.app_error_logs enable row level security;

revoke all on table public.app_error_logs from anon;
revoke all on table public.app_error_logs from authenticated;
grant insert, select, update, delete on table public.app_error_logs to authenticated;

drop policy if exists "Error logs: authenticated insert own" on public.app_error_logs;
create policy "Error logs: authenticated insert own"
on public.app_error_logs
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Error logs: mestre read" on public.app_error_logs;
create policy "Error logs: mestre read"
on public.app_error_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles own_role
    where own_role.user_id = (select auth.uid())
      and own_role.role = 'mestre'::public.app_role
  )
);

drop policy if exists "Error logs: mestre update" on public.app_error_logs;
create policy "Error logs: mestre update"
on public.app_error_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles own_role
    where own_role.user_id = (select auth.uid())
      and own_role.role = 'mestre'::public.app_role
  )
)
with check (
  exists (
    select 1
    from public.user_roles own_role
    where own_role.user_id = (select auth.uid())
      and own_role.role = 'mestre'::public.app_role
  )
);

drop policy if exists "Error logs: mestre delete" on public.app_error_logs;
create policy "Error logs: mestre delete"
on public.app_error_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles own_role
    where own_role.user_id = (select auth.uid())
      and own_role.role = 'mestre'::public.app_role
  )
);

create index if not exists app_error_logs_created_at_idx
on public.app_error_logs (created_at desc);

create index if not exists app_error_logs_unresolved_idx
on public.app_error_logs (resolved_at, created_at desc)
where resolved_at is null;

create index if not exists app_error_logs_user_created_idx
on public.app_error_logs (user_id, created_at desc);

create index if not exists app_error_logs_resolved_by_idx
on public.app_error_logs (resolved_by)
where resolved_by is not null;

comment on table public.app_error_logs is
'Sanitized client diagnostics. Raw database messages, credentials and stacks must never be stored.';
