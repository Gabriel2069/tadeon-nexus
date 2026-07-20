
-- Remove owner_email from character_sheets (email is derivable from profiles.owner_id)
ALTER TABLE public.character_sheets DROP COLUMN IF EXISTS owner_email;

-- Restrict user_roles enumeration
DROP POLICY IF EXISTS "Roles: anyone authenticated can read" ON public.user_roles;
CREATE POLICY "Roles: self or mestre read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'mestre'::app_role));

-- Allow authenticated to read the shared global game settings row directly
DROP POLICY IF EXISTS "Settings: authenticated read global" ON public.game_settings;
CREATE POLICY "Settings: authenticated read global" ON public.game_settings
  FOR SELECT TO authenticated USING (key = 'global');

-- Flip SECURITY DEFINER helpers to SECURITY INVOKER now that RLS allows self reads
CREATE OR REPLACE FUNCTION public.get_public_game_settings()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;

-- Revoke public/anon execute on these helpers
REVOKE EXECUTE ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
