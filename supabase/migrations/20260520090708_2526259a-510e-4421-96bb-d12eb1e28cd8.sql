
ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS fragments_items jsonb NOT NULL DEFAULT '[]'::jsonb;

