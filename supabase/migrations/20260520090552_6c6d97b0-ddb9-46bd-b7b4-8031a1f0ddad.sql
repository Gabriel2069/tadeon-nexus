
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
