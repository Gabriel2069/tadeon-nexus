ALTER TABLE public.character_sheets
ADD COLUMN IF NOT EXISTS defense_items jsonb NOT NULL DEFAULT '[]'::jsonb;