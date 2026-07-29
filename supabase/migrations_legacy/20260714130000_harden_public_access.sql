-- Remove broad metadata access and keep public game rules separate from private
-- master data. Policies use the caller's own role row, so no externally
-- executable SECURITY DEFINER role helper is required.

DROP POLICY IF EXISTS "Roles: anyone authenticated can read" ON public.user_roles;
DROP POLICY IF EXISTS "Roles: mestre manages all" ON public.user_roles;

CREATE POLICY "Roles: read own assignment"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Profiles: own or mestre select" ON public.profiles;
CREATE POLICY "Profiles: own or mestre select"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Profiles: update own or mestre" ON public.profiles;
CREATE POLICY "Profiles: update own or mestre"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre or espectador read" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre read"
  ON public.character_sheets FOR SELECT
  TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre insert" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre insert"
  ON public.character_sheets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre update" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre update"
  ON public.character_sheets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Sheets: owner or mestre delete" ON public.character_sheets;
CREATE POLICY "Sheets: owner or mestre delete"
  ON public.character_sheets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
    OR (
      owner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.user_roles own_role
        WHERE own_role.user_id = (SELECT auth.uid())
          AND own_role.role = 'jogador'::public.app_role
      )
    )
  );

DROP POLICY IF EXISTS "Settings: mestre read" ON public.game_settings;
CREATE POLICY "Settings: mestre read"
  ON public.game_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP POLICY IF EXISTS "Settings: mestre write" ON public.game_settings;
CREATE POLICY "Settings: mestre write"
  ON public.game_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles own_role
      WHERE own_role.user_id = (SELECT auth.uid())
        AND own_role.role = 'mestre'::public.app_role
    )
  );

DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- Trigger functions must not be callable through the API.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.game_rules (
  key text PRIMARY KEY,
  rank_table jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  upgrade_costs jsonb NOT NULL DEFAULT '{}'::jsonb,
  condition_options jsonb NOT NULL DEFAULT '{}'::jsonb,
  skill_groups jsonb NOT NULL DEFAULT '[]'::jsonb,
  skill_training_costs jsonb NOT NULL DEFAULT '[1,2,3]'::jsonb,
  rules_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.game_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Game rules: authenticated read" ON public.game_rules;
CREATE POLICY "Game rules: authenticated read"
  ON public.game_rules FOR SELECT
  TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.game_rules FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.game_rules TO authenticated;

INSERT INTO public.game_rules (
  key,
  rank_table,
  skill_branches,
  upgrade_costs,
  condition_options,
  skill_groups,
  skill_training_costs,
  rules_version,
  updated_at
)
SELECT
  key,
  rank_table,
  skill_branches,
  upgrade_costs,
  condition_options,
  skill_groups,
  skill_training_costs,
  rules_version,
  updated_at
FROM public.game_settings
ON CONFLICT (key) DO UPDATE SET
  rank_table = EXCLUDED.rank_table,
  skill_branches = EXCLUDED.skill_branches,
  upgrade_costs = EXCLUDED.upgrade_costs,
  condition_options = EXCLUDED.condition_options,
  skill_groups = EXCLUDED.skill_groups,
  skill_training_costs = EXCLUDED.skill_training_costs,
  rules_version = EXCLUDED.rules_version,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.sync_game_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.game_rules (
    key,
    rank_table,
    skill_branches,
    upgrade_costs,
    condition_options,
    skill_groups,
    skill_training_costs,
    rules_version,
    updated_at
  )
  VALUES (
    NEW.key,
    NEW.rank_table,
    NEW.skill_branches,
    NEW.upgrade_costs,
    NEW.condition_options,
    NEW.skill_groups,
    NEW.skill_training_costs,
    NEW.rules_version,
    NEW.updated_at
  )
  ON CONFLICT (key) DO UPDATE SET
    rank_table = EXCLUDED.rank_table,
    skill_branches = EXCLUDED.skill_branches,
    upgrade_costs = EXCLUDED.upgrade_costs,
    condition_options = EXCLUDED.condition_options,
    skill_groups = EXCLUDED.skill_groups,
    skill_training_costs = EXCLUDED.skill_training_costs,
    rules_version = EXCLUDED.rules_version,
    updated_at = EXCLUDED.updated_at;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_game_rules() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_game_rules_after_write ON public.game_settings;
CREATE TRIGGER sync_game_rules_after_write
  AFTER INSERT OR UPDATE ON public.game_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_game_rules();

CREATE OR REPLACE FUNCTION public.get_public_game_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
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
  FROM public.game_rules
  WHERE key = 'global'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_game_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_game_settings() TO authenticated;
