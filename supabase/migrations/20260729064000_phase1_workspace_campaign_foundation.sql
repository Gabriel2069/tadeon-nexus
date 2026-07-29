-- Phase 1: additive workspace, campaign, membership and feature-flag foundation.
-- This migration preserves every legacy table and keeps all expansion features disabled.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'workspace_role'
  ) THEN
    CREATE TYPE public.workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'campaign_role'
  ) THEN
    CREATE TYPE public.campaign_role AS ENUM ('master', 'co_master', 'player', 'observer');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.campaign_members (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.campaign_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.feature_flags (
  key text PRIMARY KEY CHECK (
    key IN (
      'nexus_knowledge_enabled',
      'nexus_graph_enabled',
      'nexus_assets_v2_enabled',
      'nexus_tabletop_enabled',
      'nexus_realtime_enabled',
      'nexus_lighting_enabled',
      'nexus_r2_enabled'
    )
  ),
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 400),
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 100),
  resource_type text NOT NULL DEFAULT '' CHECK (char_length(resource_type) <= 80),
  resource_id text CHECK (resource_id IS NULL OR char_length(resource_id) <= 160),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_sheets
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

ALTER TABLE public.game_settings
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx
  ON public.workspaces (owner_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_id_idx
  ON public.workspace_members (user_id, workspace_id);
CREATE INDEX IF NOT EXISTS campaigns_workspace_id_idx
  ON public.campaigns (workspace_id, status);
CREATE INDEX IF NOT EXISTS campaign_members_user_id_idx
  ON public.campaign_members (user_id, campaign_id);
CREATE INDEX IF NOT EXISTS character_sheets_campaign_id_idx
  ON public.character_sheets (campaign_id);
CREATE INDEX IF NOT EXISTS game_settings_campaign_id_idx
  ON public.game_settings (campaign_id);
CREATE INDEX IF NOT EXISTS audit_events_workspace_created_idx
  ON public.audit_events (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_campaign_created_idx
  ON public.audit_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_actor_created_idx
  ON public.audit_events (actor_user_id, created_at DESC);

DROP TRIGGER IF EXISTS workspaces_updated_at ON public.workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS workspace_members_updated_at ON public.workspace_members;
CREATE TRIGGER workspace_members_updated_at
  BEFORE UPDATE ON public.workspace_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS campaigns_updated_at ON public.campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS campaign_members_updated_at ON public.campaign_members;
CREATE TRIGGER campaign_members_updated_at
  BEFORE UPDATE ON public.campaign_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS feature_flags_updated_at ON public.feature_flags;
CREATE TRIGGER feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles assignment
      WHERE assignment.user_id = (SELECT auth.uid())
        AND assignment.role = 'mestre'::public.app_role
    );
$$;

CREATE OR REPLACE FUNCTION private.can_access_workspace(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members membership
        WHERE membership.workspace_id = target_workspace_id
          AND membership.user_id = (SELECT auth.uid())
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_workspace(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        WHERE workspace.id = target_workspace_id
          AND workspace.owner_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.workspace_members membership
        WHERE membership.workspace_id = target_workspace_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.role IN (
            'owner'::public.workspace_role,
            'admin'::public.workspace_role
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_access_campaign(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR EXISTS (
        SELECT 1
        FROM public.campaign_members membership
        WHERE membership.campaign_id = target_campaign_id
          AND membership.user_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.campaigns campaign
        WHERE campaign.id = target_campaign_id
          AND private.can_manage_workspace(campaign.workspace_id)
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_co_manage_campaign(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR EXISTS (
        SELECT 1
        FROM public.campaign_members membership
        WHERE membership.campaign_id = target_campaign_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.role IN (
            'master'::public.campaign_role,
            'co_master'::public.campaign_role
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.campaigns campaign
        WHERE campaign.id = target_campaign_id
          AND private.can_manage_workspace(campaign.workspace_id)
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_campaign(target_campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR EXISTS (
        SELECT 1
        FROM public.campaign_members membership
        WHERE membership.campaign_id = target_campaign_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.role = 'master'::public.campaign_role
      )
      OR EXISTS (
        SELECT 1
        FROM public.campaigns campaign
        WHERE campaign.id = target_campaign_id
          AND private.can_manage_workspace(campaign.workspace_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION private.is_app_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_workspace(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_access_campaign(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_co_manage_campaign(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_campaign(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_app_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_workspace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_access_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_co_manage_campaign(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_campaign(uuid) TO authenticated;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspaces: members read" ON public.workspaces;
CREATE POLICY "Workspaces: members read"
  ON public.workspaces FOR SELECT
  TO authenticated
  USING ((SELECT private.can_access_workspace(id)));

DROP POLICY IF EXISTS "Workspaces: users create own" ON public.workspaces;
CREATE POLICY "Workspaces: users create own"
  ON public.workspaces FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.is_app_admin())
  );

DROP POLICY IF EXISTS "Workspaces: managers update" ON public.workspaces;
CREATE POLICY "Workspaces: managers update"
  ON public.workspaces FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_workspace(id)))
  WITH CHECK ((SELECT private.can_manage_workspace(id)));

DROP POLICY IF EXISTS "Workspaces: managers delete" ON public.workspaces;
CREATE POLICY "Workspaces: managers delete"
  ON public.workspaces FOR DELETE
  TO authenticated
  USING ((SELECT private.can_manage_workspace(id)));

DROP POLICY IF EXISTS "Workspace members: own or managers read" ON public.workspace_members;
CREATE POLICY "Workspace members: own or managers read"
  ON public.workspace_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.can_manage_workspace(workspace_id))
  );

DROP POLICY IF EXISTS "Workspace members: managers insert" ON public.workspace_members;
CREATE POLICY "Workspace members: managers insert"
  ON public.workspace_members FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.can_manage_workspace(workspace_id))
    AND (
      role <> 'owner'::public.workspace_role
      OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        WHERE workspace.id = workspace_id
          AND workspace.owner_id = user_id
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members: managers update" ON public.workspace_members;
CREATE POLICY "Workspace members: managers update"
  ON public.workspace_members FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_workspace(workspace_id)))
  WITH CHECK (
    (SELECT private.can_manage_workspace(workspace_id))
    AND (
      role <> 'owner'::public.workspace_role
      OR EXISTS (
        SELECT 1
        FROM public.workspaces workspace
        WHERE workspace.id = workspace_id
          AND workspace.owner_id = user_id
      )
    )
  );

DROP POLICY IF EXISTS "Workspace members: managers delete non-owner" ON public.workspace_members;
CREATE POLICY "Workspace members: managers delete non-owner"
  ON public.workspace_members FOR DELETE
  TO authenticated
  USING (
    role <> 'owner'::public.workspace_role
    AND (SELECT private.can_manage_workspace(workspace_id))
  );

DROP POLICY IF EXISTS "Campaigns: members read" ON public.campaigns;
CREATE POLICY "Campaigns: members read"
  ON public.campaigns FOR SELECT
  TO authenticated
  USING ((SELECT private.can_access_campaign(id)));

DROP POLICY IF EXISTS "Campaigns: workspace managers insert" ON public.campaigns;
CREATE POLICY "Campaigns: workspace managers insert"
  ON public.campaigns FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_manage_workspace(workspace_id)));

DROP POLICY IF EXISTS "Campaigns: masters update" ON public.campaigns;
CREATE POLICY "Campaigns: masters update"
  ON public.campaigns FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_campaign(id)))
  WITH CHECK (
    (SELECT private.can_manage_workspace(workspace_id))
    OR (SELECT private.can_manage_campaign(id))
  );

DROP POLICY IF EXISTS "Campaigns: masters delete" ON public.campaigns;
CREATE POLICY "Campaigns: masters delete"
  ON public.campaigns FOR DELETE
  TO authenticated
  USING ((SELECT private.can_manage_campaign(id)));

DROP POLICY IF EXISTS "Campaign members: own or masters read" ON public.campaign_members;
CREATE POLICY "Campaign members: own or masters read"
  ON public.campaign_members FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT private.can_co_manage_campaign(campaign_id))
  );

DROP POLICY IF EXISTS "Campaign members: masters insert" ON public.campaign_members;
CREATE POLICY "Campaign members: masters insert"
  ON public.campaign_members FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT private.can_manage_campaign(campaign_id)));

DROP POLICY IF EXISTS "Campaign members: masters update" ON public.campaign_members;
CREATE POLICY "Campaign members: masters update"
  ON public.campaign_members FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_campaign(campaign_id)))
  WITH CHECK ((SELECT private.can_manage_campaign(campaign_id)));

DROP POLICY IF EXISTS "Campaign members: masters delete" ON public.campaign_members;
CREATE POLICY "Campaign members: masters delete"
  ON public.campaign_members FOR DELETE
  TO authenticated
  USING ((SELECT private.can_manage_campaign(campaign_id)));

DROP POLICY IF EXISTS "Feature flags: authenticated read" ON public.feature_flags;
CREATE POLICY "Feature flags: authenticated read"
  ON public.feature_flags FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Feature flags: app admin update" ON public.feature_flags;
CREATE POLICY "Feature flags: app admin update"
  ON public.feature_flags FOR UPDATE
  TO authenticated
  USING ((SELECT private.is_app_admin()))
  WITH CHECK ((SELECT private.is_app_admin()));

DROP POLICY IF EXISTS "Audit events: managers read" ON public.audit_events;
CREATE POLICY "Audit events: managers read"
  ON public.audit_events FOR SELECT
  TO authenticated
  USING (
    (SELECT private.is_app_admin())
    OR (
      workspace_id IS NOT NULL
      AND (SELECT private.can_manage_workspace(workspace_id))
    )
    OR (
      campaign_id IS NOT NULL
      AND (SELECT private.can_co_manage_campaign(campaign_id))
    )
  );

DROP POLICY IF EXISTS "Audit events: members insert own" ON public.audit_events;
CREATE POLICY "Audit events: members insert own"
  ON public.audit_events FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = (SELECT auth.uid())
    AND (
      (
        workspace_id IS NULL
        AND campaign_id IS NULL
      )
      OR (
        workspace_id IS NOT NULL
        AND (SELECT private.can_access_workspace(workspace_id))
      )
      OR (
        campaign_id IS NOT NULL
        AND (SELECT private.can_access_campaign(campaign_id))
      )
    )
  );

REVOKE ALL ON TABLE
  public.workspaces,
  public.workspace_members,
  public.campaigns,
  public.campaign_members,
  public.feature_flags,
  public.audit_events
FROM anon, authenticated;

GRANT SELECT, INSERT, DELETE
  ON TABLE public.workspaces, public.workspace_members, public.campaigns, public.campaign_members
  TO authenticated;
GRANT UPDATE (name, slug)
  ON TABLE public.workspaces
  TO authenticated;
GRANT UPDATE (role)
  ON TABLE public.workspace_members, public.campaign_members
  TO authenticated;
GRANT UPDATE (name, status)
  ON TABLE public.campaigns
  TO authenticated;
GRANT SELECT
  ON TABLE public.feature_flags
  TO authenticated;
GRANT UPDATE (enabled, updated_by)
  ON TABLE public.feature_flags
  TO authenticated;
GRANT SELECT, INSERT
  ON TABLE public.audit_events
  TO authenticated;

INSERT INTO public.feature_flags (key, enabled, description)
VALUES
  ('nexus_knowledge_enabled', false, 'Núcleo de páginas e conhecimento do Nexus.'),
  ('nexus_graph_enabled', false, 'Visualização em grafo das relações do Nexus.'),
  ('nexus_assets_v2_enabled', false, 'Novo catálogo e fluxo de Nexus Assets.'),
  ('nexus_tabletop_enabled', false, 'Mesa Nexus e cenas gráficas.'),
  ('nexus_realtime_enabled', false, 'Sincronização ao vivo da Mesa Nexus.'),
  ('nexus_lighting_enabled', false, 'Visão, paredes, luz e névoa de guerra.'),
  ('nexus_r2_enabled', false, 'Provedor Cloudflare R2 para objetos.')
ON CONFLICT (key) DO NOTHING;

DO $$
DECLARE
  default_owner_id uuid;
  default_workspace_id uuid;
  default_campaign_id uuid;
  default_campaign_name text;
BEGIN
  SELECT assignment.user_id
  INTO default_owner_id
  FROM public.user_roles assignment
  JOIN public.profiles profile ON profile.id = assignment.user_id
  WHERE assignment.role = 'mestre'::public.app_role
  ORDER BY profile.created_at, assignment.user_id
  LIMIT 1;

  IF default_owner_id IS NULL THEN
    SELECT profile.id
    INTO default_owner_id
    FROM public.profiles profile
    ORDER BY profile.created_at, profile.id
    LIMIT 1;
  END IF;

  IF default_owner_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.workspaces (owner_id, name, slug)
  VALUES (default_owner_id, 'Tadeon Nexus', 'tadeon-nexus')
  ON CONFLICT (slug) DO UPDATE
  SET owner_id = COALESCE(public.workspaces.owner_id, EXCLUDED.owner_id)
  RETURNING id INTO default_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  SELECT
    default_workspace_id,
    assignment.user_id,
    CASE
      WHEN assignment.user_id = default_owner_id THEN 'owner'::public.workspace_role
      WHEN assignment.role = 'mestre'::public.app_role THEN 'admin'::public.workspace_role
      WHEN assignment.role = 'espectador'::public.app_role THEN 'viewer'::public.workspace_role
      ELSE 'member'::public.workspace_role
    END
  FROM public.user_roles assignment
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  SELECT COALESCE(NULLIF(settings.campaign_title, ''), 'Tessitura do Vazio')
  INTO default_campaign_name
  FROM public.game_settings settings
  WHERE settings.key = 'global'
  LIMIT 1;

  default_campaign_name := COALESCE(default_campaign_name, 'Tessitura do Vazio');

  INSERT INTO public.campaigns (workspace_id, name, slug)
  VALUES (default_workspace_id, default_campaign_name, 'tessitura-do-vazio')
  ON CONFLICT (workspace_id, slug) DO UPDATE
  SET name = EXCLUDED.name
  RETURNING id INTO default_campaign_id;

  INSERT INTO public.campaign_members (campaign_id, user_id, role)
  SELECT
    default_campaign_id,
    assignment.user_id,
    CASE
      WHEN assignment.role = 'mestre'::public.app_role THEN 'master'::public.campaign_role
      WHEN assignment.role = 'espectador'::public.app_role THEN 'observer'::public.campaign_role
      ELSE 'player'::public.campaign_role
    END
  FROM public.user_roles assignment
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  UPDATE public.character_sheets
  SET campaign_id = default_campaign_id
  WHERE campaign_id IS NULL;

  UPDATE public.game_settings
  SET campaign_id = default_campaign_id
  WHERE campaign_id IS NULL;
END
$$;

COMMENT ON TABLE public.workspaces IS
  'Top-level ownership boundary for campaigns and future Nexus subsystems.';
COMMENT ON TABLE public.workspace_members IS
  'Workspace-scoped membership. It does not duplicate global application roles.';
COMMENT ON TABLE public.campaigns IS
  'Campaign boundary used by sheets, knowledge, assets and tabletop scenes.';
COMMENT ON TABLE public.campaign_members IS
  'Campaign-scoped master, co-master, player and observer assignments.';
COMMENT ON TABLE public.feature_flags IS
  'Administrative rollout switches. Values are not secrets and default to disabled.';
COMMENT ON TABLE public.audit_events IS
  'Append-only security and administrative event trail with sanitized metadata.';

NOTIFY pgrst, 'reload schema';
