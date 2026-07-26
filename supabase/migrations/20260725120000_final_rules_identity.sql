-- Persist the identity fields introduced by the final ruleset.
-- Existing sheets receive a neutral structure and remain fully compatible.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS identity_data jsonb NOT NULL DEFAULT '{
    "conviction": "",
    "limit": "",
    "wound": "",
    "question": "",
    "lifeCycleTrait": "",
    "links": [
      {"id": "link-1", "name": "", "relation": "", "state": "Presente"},
      {"id": "link-2", "name": "", "relation": "", "state": "Presente"}
    ]
  }'::jsonb;

COMMENT ON COLUMN public.character_sheets.identity_data IS
  'Identity, life-cycle trait and character links from rules version 3.';
