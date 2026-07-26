ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS campaign_title text NOT NULL DEFAULT 'Tessitura do Vazio',
  ADD COLUMN IF NOT EXISTS campaign_phase text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS master_npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS investigation_clues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS threats jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interludes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS folds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rules_version integer NOT NULL DEFAULT 1;

UPDATE public.game_settings
SET
  master_npcs = CASE WHEN master_npcs = '[]'::jsonb THEN npcs ELSE master_npcs END,
  investigation_clues = CASE WHEN investigation_clues = '[]'::jsonb THEN clues ELSE investigation_clues END,
  threats = CASE WHEN threats = '[]'::jsonb THEN monsters ELSE threats END,
  rules_version = GREATEST(rules_version, 3)
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

REVOKE EXECUTE ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;