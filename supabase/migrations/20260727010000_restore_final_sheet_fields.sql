-- Reconcile databases connected after the final rules migration was authored.
-- This migration is additive and idempotent: it never drops rows and only
-- normalizes legacy values that the application cannot interpret.
ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS initial_skill_degrees jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS weapon_proficiency_family text NOT NULL DEFAULT '';

UPDATE public.character_sheets
SET initial_skill_degrees = '{}'::jsonb
WHERE jsonb_typeof(initial_skill_degrees) <> 'object';

UPDATE public.character_sheets
SET weapon_proficiency_family = ''
WHERE weapon_proficiency_family NOT IN ('', 'Contato', 'Projeção');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.character_sheets'::regclass
      AND conname = 'character_sheets_initial_skill_degrees_object'
  ) THEN
    ALTER TABLE public.character_sheets
      ADD CONSTRAINT character_sheets_initial_skill_degrees_object
      CHECK (jsonb_typeof(initial_skill_degrees) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.character_sheets'::regclass
      AND conname = 'character_sheets_weapon_proficiency_family_valid'
  ) THEN
    ALTER TABLE public.character_sheets
      ADD CONSTRAINT character_sheets_weapon_proficiency_family_valid
      CHECK (weapon_proficiency_family IN ('', 'Contato', 'Projeção'));
  END IF;
END
$$;

COMMENT ON COLUMN public.character_sheets.initial_skill_degrees IS
  'Mapa dos sete graus iniciais gratuitos, limitado a dois graus por perícia.';

COMMENT ON COLUMN public.character_sheets.weapon_proficiency_family IS
  'Família escolhida para Proficiência III: Contato ou Projeção.';
