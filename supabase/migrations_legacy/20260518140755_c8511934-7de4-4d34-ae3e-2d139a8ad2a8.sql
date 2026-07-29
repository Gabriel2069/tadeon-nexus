
ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS description jsonb NOT NULL DEFAULT '{"historia":"","personalidade":"","objetivos":"","observacoes":""}'::jsonb;
