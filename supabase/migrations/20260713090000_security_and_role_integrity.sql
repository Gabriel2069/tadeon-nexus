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
