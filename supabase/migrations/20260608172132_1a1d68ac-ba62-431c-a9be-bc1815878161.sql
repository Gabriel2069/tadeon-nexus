
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

