ALTER TABLE public.game_settings
ADD COLUMN IF NOT EXISTS skill_groups jsonb NOT NULL DEFAULT '[
  {"attr":"COR","label":"Corpo","skills":["Acrobacia","Atletismo","Combate","Furtividade"]},
  {"attr":"MEN","label":"Mente","skills":["Investigação","Percepção","Sobrevivência","Vontade"]},
  {"attr":"INS","label":"Instinto","skills":["Iniciativa","Pontaria","Reflexos","Intuição"]},
  {"attr":"PRE","label":"Presença","skills":["Atuação","Diplomacia","Enganação","Intimidação"]},
  {"attr":"ERU","label":"Erudição","skills":["Ciências","Medicina","Ocultismo","Tecnologia"]}
]'::jsonb;
