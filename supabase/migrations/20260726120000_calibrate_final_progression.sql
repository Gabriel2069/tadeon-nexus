-- Persist the exact creation degrees and the family selected for Proficiência III.
-- The final rules grant Proficiência II at creation, so legacy Leigo rows are
-- upgraded without spending PM.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS initial_skill_degrees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weapon_proficiency_family text NOT NULL DEFAULT '';

ALTER TABLE public.character_sheets
  ALTER COLUMN weapon_proficiency SET DEFAULT 'operador';

UPDATE public.character_sheets
SET weapon_proficiency = 'operador'
WHERE weapon_proficiency IS NULL
   OR weapon_proficiency = ''
   OR weapon_proficiency = 'leigo';

COMMENT ON COLUMN public.character_sheets.initial_skill_degrees IS
  'Per-skill count of the seven free creation degrees, limited to two per skill.';

COMMENT ON COLUMN public.character_sheets.weapon_proficiency_family IS
  'Contato or Projeção when the character has Proficiência III (Combatente).';
