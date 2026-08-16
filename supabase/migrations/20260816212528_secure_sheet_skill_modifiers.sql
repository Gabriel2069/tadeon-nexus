create or replace function public.set_sheet_skill_modifier(
  p_sheet_id uuid,
  p_skill text,
  p_value integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  next_power_form_data jsonb;
  clean_skill text := btrim(coalesce(p_skill, ''));
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'mestre'::public.app_role
  ) then
    raise exception 'MASTER_REQUIRED' using errcode = '42501';
  end if;

  if clean_skill = '' or length(clean_skill) > 80 then
    raise exception 'INVALID_SKILL' using errcode = '22023';
  end if;

  if p_value < -50 or p_value > 50 then
    raise exception 'INVALID_MODIFIER' using errcode = '22023';
  end if;

  update public.character_sheets cs
  set power_form_data =
    coalesce(cs.power_form_data, '{}'::jsonb)
    || jsonb_build_object(
      'skill_modifiers',
      coalesce(cs.power_form_data -> 'skill_modifiers', '{}'::jsonb)
      || jsonb_build_object(clean_skill, p_value)
    )
  where cs.id = p_sheet_id
  returning cs.power_form_data into next_power_form_data;

  if not found then
    raise exception 'SHEET_NOT_FOUND_OR_FORBIDDEN' using errcode = 'P0002';
  end if;

  return next_power_form_data;
end;
$$;

revoke all on function public.set_sheet_skill_modifier(uuid, text, integer) from public;
revoke all on function public.set_sheet_skill_modifier(uuid, text, integer) from anon;
grant execute on function public.set_sheet_skill_modifier(uuid, text, integer) to authenticated;
