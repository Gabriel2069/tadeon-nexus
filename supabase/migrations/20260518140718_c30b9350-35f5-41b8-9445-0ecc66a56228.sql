
ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS upgrade_costs jsonb NOT NULL DEFAULT '{"pv":{"base":10,"freeLevels":3,"increment":5},"ps":{"base":10,"freeLevels":3,"increment":5},"pe":{"base":10,"freeLevels":3,"increment":5},"def":{"base":10,"freeLevels":3,"increment":5}}'::jsonb,
  ADD COLUMN IF NOT EXISTS condition_options jsonb NOT NULL DEFAULT '{"fisica":["Normal","Sangrando","Atordoado","Ferido","Inconsciente"],"mental":["Normal","Em pânico","Confuso","Aterrorizado","Drenado"],"energetica":["Normal","Drenado","Sobrecarregado","Em ressonância","Apagado"],"outras":["Normal","Marcado","Possuído","Amaldiçoado"]}'::jsonb;

