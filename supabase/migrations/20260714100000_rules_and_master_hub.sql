-- Align character rules with the revised rulebook and add private master-hub data.

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS drift integer NOT NULL DEFAULT 0;

ALTER TABLE public.character_sheets
  ADD CONSTRAINT character_sheets_drift_range CHECK (drift BETWEEN -3 AND 3);

UPDATE public.character_sheets
SET stats = COALESCE(stats, '{}'::jsonb) || jsonb_build_object(
  'pa_current', COALESCE(stats->'pa_current', '0'::jsonb),
  'pa_mod', COALESCE(stats->'pa_mod', '0'::jsonb)
);

ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS campaign_title text NOT NULL DEFAULT 'Tessitura do Vazio',
  ADD COLUMN IF NOT EXISTS campaign_phase text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS master_npcs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS investigation_clues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS threats jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interludes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS folds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rules_version integer NOT NULL DEFAULT 1;

-- Preserve legacy master data. The client normalizes the old shape on load.
UPDATE public.game_settings
SET
  master_npcs = CASE WHEN master_npcs = '[]'::jsonb THEN npcs ELSE master_npcs END,
  investigation_clues = CASE
    WHEN investigation_clues = '[]'::jsonb THEN clues
    ELSE investigation_clues
  END,
  threats = CASE WHEN threats = '[]'::jsonb THEN monsters ELSE threats END
WHERE key = 'global';

UPDATE public.game_settings
SET
  rank_table = '[
    {"rank":0,"pv":15,"ps":13,"pe":5,"pa":0,"def":5,"pm":0},
    {"rank":5,"pv":18,"ps":14,"pe":6,"pa":0,"def":6,"pm":8},
    {"rank":10,"pv":21,"ps":15,"pe":7,"pa":1,"def":7,"pm":8},
    {"rank":15,"pv":24,"ps":16,"pe":8,"pa":1,"def":8,"pm":10},
    {"rank":20,"pv":27,"ps":18,"pe":9,"pa":2,"def":9,"pm":10},
    {"rank":25,"pv":30,"ps":20,"pe":10,"pa":2,"def":10,"pm":12},
    {"rank":30,"pv":33,"ps":22,"pe":11,"pa":2,"def":11,"pm":12},
    {"rank":35,"pv":36,"ps":24,"pe":12,"pa":3,"def":12,"pm":14},
    {"rank":40,"pv":39,"ps":26,"pe":13,"pa":3,"def":13,"pm":14},
    {"rank":45,"pv":42,"ps":28,"pe":14,"pa":3,"def":14,"pm":16},
    {"rank":50,"pv":45,"ps":30,"pe":15,"pa":3,"def":15,"pm":16},
    {"rank":55,"pv":48,"ps":32,"pe":16,"pa":4,"def":16,"pm":18},
    {"rank":60,"pv":51,"ps":34,"pe":17,"pa":4,"def":17,"pm":18},
    {"rank":65,"pv":54,"ps":36,"pe":18,"pa":4,"def":18,"pm":20},
    {"rank":70,"pv":57,"ps":38,"pe":19,"pa":4,"def":19,"pm":20},
    {"rank":75,"pv":60,"ps":40,"pe":20,"pa":4,"def":20,"pm":22},
    {"rank":80,"pv":63,"ps":42,"pe":21,"pa":5,"def":21,"pm":22},
    {"rank":85,"pv":66,"ps":44,"pe":22,"pa":5,"def":22,"pm":23},
    {"rank":90,"pv":69,"ps":46,"pe":23,"pa":5,"def":23,"pm":23},
    {"rank":95,"pv":72,"ps":48,"pe":24,"pa":5,"def":24,"pm":24},
    {"rank":100,"pv":75,"ps":50,"pe":25,"pa":5,"def":25,"pm":25}
  ]'::jsonb,
  skill_groups = '[
    {"attr":"COR","label":"Corpo","skills":["Acrobacia","Atletismo","Fortitude","Furtividade","Ímpeto","Luta"]},
    {"attr":"MEN","label":"Mente","skills":["Canalização","Concentração","Investigação","Lógica","Tática","Vontade"]},
    {"attr":"INS","label":"Instinto","skills":["Adestramento","Iniciativa","Intuição","Percepção","Reflexo","Sobrevivência"]},
    {"attr":"PRE","label":"Presença","skills":["Atualidades","Convicção","Diplomacia","Encenação","Intimidação","Persuasão"]},
    {"attr":"ERU","label":"Erudição","skills":["Ciências","Crime","Medicina","Pilotagem","Pontaria","Tecnologia"]}
  ]'::jsonb,
  skill_training_costs = '[1,2,3]'::jsonb,
  upgrade_costs = '{
    "pv":{"base":1,"freeLevels":1,"increment":1},
    "ps":{"base":1,"freeLevels":1,"increment":1},
    "pe":{"base":1,"freeLevels":1,"increment":1},
    "def":{"base":2,"freeLevels":1,"increment":2}
  }'::jsonb,
  condition_options = '{
    "fisica":["Normal","Machucado","Ferido","Incapacitado","Morrendo","Sangrando","Em Chamas","Inconsciente"],
    "mental":["Normal","Abalado","Apavorado","Colapso","Perdição","Frustrado","Fascinado"],
    "energetica":["Normal","Fadigado","Sobrecarregado","Esgotado","Refluxo"],
    "outras":["Normal","Caído","Imóvel","Cego","Surdo","Agarrado","Envenenado","Doente","Asfixiado"]
  }'::jsonb,
  -- Empty means "use the versioned canonical branches embedded in the client".
  skill_branches = '[]'::jsonb,
  rules_version = 1
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

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;
