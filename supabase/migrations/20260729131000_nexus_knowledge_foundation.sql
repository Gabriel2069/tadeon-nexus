-- O Nexus: provider-neutral knowledge graph foundation.
-- Additive only. All access remains disabled while nexus_knowledge_enabled=false.

CREATE TYPE public.knowledge_node_type AS ENUM (
  'rule',
  'concept',
  'character',
  'npc',
  'creature',
  'organization',
  'religion',
  'culture',
  'people',
  'language',
  'kingdom',
  'region',
  'city',
  'location',
  'river',
  'sea',
  'terrain',
  'tectonic_plate',
  'historical_event',
  'plot',
  'clue',
  'session',
  'fragment',
  'transcendental_ability',
  'weapon',
  'object',
  'document',
  'map',
  'campaign',
  'free_note'
);

CREATE TYPE public.knowledge_node_status AS ENUM (
  'draft',
  'review',
  'canonical',
  'deprecated',
  'archived'
);

CREATE TYPE public.knowledge_visibility AS ENUM (
  'author',
  'masters',
  'campaign',
  'users',
  'workspace',
  'internal_public'
);

CREATE TYPE public.knowledge_relation_type AS ENUM (
  'related_to',
  'part_of',
  'contains',
  'located_in',
  'member_of',
  'owns',
  'created_by',
  'allied_with',
  'opposes',
  'parent_of',
  'child_of',
  'precedes',
  'follows',
  'reveals',
  'mentions',
  'custom'
);

CREATE TYPE public.knowledge_relation_direction AS ENUM (
  'directed',
  'bidirectional'
);

CREATE TYPE public.knowledge_acl_permission AS ENUM (
  'view',
  'edit',
  'manage'
);

CREATE TABLE public.knowledge_workspace_settings (
  workspace_id uuid PRIMARY KEY
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  auto_version_limit integer NOT NULL DEFAULT 50
    CHECK (auto_version_limit BETWEEN 5 AND 200),
  updated_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.knowledge_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  campaign_id uuid,
  node_type public.knowledge_node_type NOT NULL DEFAULT 'free_note',
  title text NOT NULL
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  slug text NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text NOT NULL DEFAULT ''
    CHECK (char_length(summary) <= 2000),
  content_markdown text NOT NULL DEFAULT '',
  plain_text text NOT NULL DEFAULT '',
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(properties) = 'object'),
  status public.knowledge_node_status NOT NULL DEFAULT 'draft',
  visibility public.knowledge_visibility NOT NULL DEFAULT 'author',
  icon text
    CHECK (icon IS NULL OR char_length(icon) <= 80),
  cover_asset_id uuid
    REFERENCES public.assets(id) ON DELETE SET NULL,
  parent_node_id uuid
    REFERENCES public.knowledge_nodes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  archived_at timestamptz,
  deleted_at timestamptz,
  version_sequence integer NOT NULL DEFAULT 0
    CHECK (version_sequence >= 0),
  search_document tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' ||
      coalesce(summary, '') || ' ' ||
      coalesce(plain_text, '')
    )
  ) STORED,
  CONSTRAINT knowledge_nodes_campaign_workspace_fkey
    FOREIGN KEY (campaign_id, workspace_id)
    REFERENCES public.campaigns(id, workspace_id)
    ON DELETE RESTRICT,
  CONSTRAINT knowledge_nodes_campaign_visibility
    CHECK (visibility <> 'campaign' OR campaign_id IS NOT NULL),
  CONSTRAINT knowledge_nodes_archive_consistency
    CHECK (
      (status = 'archived' AND archived_at IS NOT NULL)
      OR status <> 'archived'
    )
);

CREATE UNIQUE INDEX knowledge_nodes_workspace_slug_active_key
  ON public.knowledge_nodes (workspace_id, slug)
  WHERE campaign_id IS NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX knowledge_nodes_campaign_slug_active_key
  ON public.knowledge_nodes (campaign_id, slug)
  WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX knowledge_nodes_workspace_updated_idx
  ON public.knowledge_nodes (workspace_id, updated_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX knowledge_nodes_campaign_updated_idx
  ON public.knowledge_nodes (campaign_id, updated_at DESC)
  WHERE campaign_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX knowledge_nodes_parent_idx
  ON public.knowledge_nodes (parent_node_id)
  WHERE parent_node_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX knowledge_nodes_type_status_idx
  ON public.knowledge_nodes (workspace_id, node_type, status)
  WHERE deleted_at IS NULL;
CREATE INDEX knowledge_nodes_search_idx
  ON public.knowledge_nodes USING gin (search_document);

CREATE TABLE public.knowledge_node_acl (
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission public.knowledge_acl_permission NOT NULL DEFAULT 'view',
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (node_id, user_id)
);
CREATE INDEX knowledge_node_acl_user_idx
  ON public.knowledge_node_acl (user_id, node_id);

CREATE TABLE public.knowledge_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  relation_type public.knowledge_relation_type NOT NULL,
  label text NOT NULL DEFAULT ''
    CHECK (char_length(label) <= 160),
  direction public.knowledge_relation_direction NOT NULL DEFAULT 'directed',
  visibility public.knowledge_visibility NOT NULL DEFAULT 'workspace',
  properties jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(properties) = 'object'),
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz,
  CONSTRAINT knowledge_edges_not_self
    CHECK (source_node_id <> target_node_id)
);
CREATE UNIQUE INDEX knowledge_edges_active_key
  ON public.knowledge_edges (
    source_node_id,
    target_node_id,
    relation_type,
    label
  )
  WHERE deleted_at IS NULL;
CREATE INDEX knowledge_edges_source_idx
  ON public.knowledge_edges (source_node_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX knowledge_edges_target_idx
  ON public.knowledge_edges (target_node_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE public.knowledge_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  campaign_id uuid,
  alias text NOT NULL
    CHECK (char_length(btrim(alias)) BETWEEN 1 AND 200),
  normalized_alias text NOT NULL
    CHECK (char_length(normalized_alias) BETWEEN 1 AND 200),
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT knowledge_aliases_campaign_workspace_fkey
    FOREIGN KEY (campaign_id, workspace_id)
    REFERENCES public.campaigns(id, workspace_id)
    ON DELETE CASCADE
);
CREATE UNIQUE INDEX knowledge_aliases_node_key
  ON public.knowledge_aliases (node_id, normalized_alias);
CREATE UNIQUE INDEX knowledge_aliases_workspace_scope_key
  ON public.knowledge_aliases (workspace_id, normalized_alias)
  WHERE campaign_id IS NULL;
CREATE UNIQUE INDEX knowledge_aliases_campaign_scope_key
  ON public.knowledge_aliases (campaign_id, normalized_alias)
  WHERE campaign_id IS NOT NULL;

CREATE TABLE public.knowledge_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  slug text NOT NULL
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  parent_tag_id uuid
    REFERENCES public.knowledge_tags(id) ON DELETE SET NULL,
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX knowledge_tags_workspace_slug_active_key
  ON public.knowledge_tags (workspace_id, slug)
  WHERE deleted_at IS NULL;
CREATE INDEX knowledge_tags_parent_idx
  ON public.knowledge_tags (parent_tag_id)
  WHERE parent_tag_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE public.knowledge_node_tags (
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL
    REFERENCES public.knowledge_tags(id) ON DELETE CASCADE,
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (node_id, tag_id)
);
CREATE INDEX knowledge_node_tags_tag_idx
  ON public.knowledge_node_tags (tag_id, node_id);

CREATE TABLE public.knowledge_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  raw_text text NOT NULL
    CHECK (char_length(raw_text) BETWEEN 1 AND 500),
  start_position integer NOT NULL
    CHECK (start_position >= 0),
  end_position integer NOT NULL
    CHECK (end_position > start_position),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT knowledge_mentions_not_self
    CHECK (source_node_id <> target_node_id)
);
CREATE UNIQUE INDEX knowledge_mentions_source_range_key
  ON public.knowledge_mentions (
    source_node_id,
    target_node_id,
    start_position,
    end_position
  );
CREATE INDEX knowledge_mentions_target_idx
  ON public.knowledge_mentions (target_node_id, source_node_id);

CREATE TABLE public.knowledge_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL
    REFERENCES public.assets(id) ON DELETE RESTRICT,
  asset_role text NOT NULL DEFAULT 'attachment'
    CHECK (asset_role ~ '^[a-z][a-z0-9_-]{0,39}$'),
  caption text NOT NULL DEFAULT ''
    CHECK (char_length(caption) <= 500),
  sort_order integer NOT NULL DEFAULT 0
    CHECK (sort_order >= 0),
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX knowledge_assets_usage_key
  ON public.knowledge_assets (node_id, asset_id, asset_role);
CREATE INDEX knowledge_assets_asset_idx
  ON public.knowledge_assets (asset_id, node_id);

CREATE TABLE public.knowledge_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  version_number integer NOT NULL
    CHECK (version_number > 0),
  title_snapshot text NOT NULL,
  summary_snapshot text NOT NULL DEFAULT '',
  content_snapshot text NOT NULL DEFAULT '',
  properties_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(properties_snapshot) = 'object'),
  status_snapshot public.knowledge_node_status NOT NULL,
  visibility_snapshot public.knowledge_visibility NOT NULL,
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reason text NOT NULL DEFAULT 'automatic'
    CHECK (char_length(reason) BETWEEN 1 AND 240),
  automatic boolean NOT NULL DEFAULT true,
  UNIQUE (node_id, version_number)
);
CREATE INDEX knowledge_versions_node_created_idx
  ON public.knowledge_versions (node_id, version_number DESC);

CREATE TABLE public.knowledge_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL
    REFERENCES public.workspaces(id) ON DELETE CASCADE,
  node_type public.knowledge_node_type NOT NULL,
  name text NOT NULL
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  default_content text NOT NULL DEFAULT '',
  default_properties jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(default_properties) = 'object'),
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX knowledge_templates_active_key
  ON public.knowledge_templates (workspace_id, node_type, lower(name))
  WHERE deleted_at IS NULL;

CREATE TABLE public.knowledge_favorites (
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, node_id)
);
CREATE INDEX knowledge_favorites_user_created_idx
  ON public.knowledge_favorites (user_id, created_at DESC);

CREATE TABLE public.knowledge_recent (
  user_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  last_opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, node_id)
);
CREATE INDEX knowledge_recent_user_opened_idx
  ON public.knowledge_recent (user_id, last_opened_at DESC);

INSERT INTO public.knowledge_workspace_settings (workspace_id)
SELECT workspace.id
FROM public.workspaces workspace
ON CONFLICT (workspace_id) DO NOTHING;

CREATE OR REPLACE FUNCTION private.is_feature_enabled(target_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.feature_flags flag
    WHERE flag.key = target_key
      AND flag.enabled
  );
$$;

CREATE OR REPLACE FUNCTION private.can_read_knowledge_node(target_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_feature_enabled('nexus_knowledge_enabled')
    AND (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_nodes node
      WHERE node.id = target_node_id
        AND (
          private.is_app_admin()
          OR node.created_by = (SELECT auth.uid())
          OR private.can_manage_workspace(node.workspace_id)
          OR (
            node.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(node.campaign_id)
          )
          OR (
            node.deleted_at IS NULL
            AND (
              (
                node.visibility = 'campaign'
                AND node.campaign_id IS NOT NULL
                AND private.can_access_campaign(node.campaign_id)
              )
              OR (
                node.visibility = 'workspace'
                AND private.can_access_workspace(node.workspace_id)
              )
              OR (
                node.visibility = 'internal_public'
                AND (SELECT auth.uid()) IS NOT NULL
              )
              OR (
                node.visibility = 'users'
                AND EXISTS (
                  SELECT 1
                  FROM public.knowledge_node_acl assignment
                  WHERE assignment.node_id = node.id
                    AND assignment.user_id = (SELECT auth.uid())
                )
              )
            )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_knowledge_node(target_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_feature_enabled('nexus_knowledge_enabled')
    AND (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_nodes node
      WHERE node.id = target_node_id
        AND (
          private.is_app_admin()
          OR node.created_by = (SELECT auth.uid())
          OR private.can_manage_workspace(node.workspace_id)
          OR (
            node.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(node.campaign_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.knowledge_node_acl assignment
            WHERE assignment.node_id = node.id
              AND assignment.user_id = (SELECT auth.uid())
              AND assignment.permission IN ('edit', 'manage')
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_read_knowledge_edge(target_edge_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_feature_enabled('nexus_knowledge_enabled')
    AND (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_edges edge
      JOIN public.knowledge_nodes source
        ON source.id = edge.source_node_id
      WHERE edge.id = target_edge_id
        AND edge.deleted_at IS NULL
        AND private.can_read_knowledge_node(edge.source_node_id)
        AND private.can_read_knowledge_node(edge.target_node_id)
        AND (
          private.is_app_admin()
          OR edge.created_by = (SELECT auth.uid())
          OR private.can_manage_workspace(edge.workspace_id)
          OR (
            source.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(source.campaign_id)
          )
          OR (
            edge.visibility = 'campaign'
            AND source.campaign_id IS NOT NULL
            AND private.can_access_campaign(source.campaign_id)
          )
          OR (
            edge.visibility = 'workspace'
            AND private.can_access_workspace(edge.workspace_id)
          )
          OR (
            edge.visibility = 'internal_public'
            AND (SELECT auth.uid()) IS NOT NULL
          )
          OR (
            edge.visibility = 'users'
            AND EXISTS (
              SELECT 1
              FROM public.knowledge_node_acl assignment
              WHERE assignment.node_id = edge.source_node_id
                AND assignment.user_id = (SELECT auth.uid())
            )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_knowledge_node(target_node_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_feature_enabled('nexus_knowledge_enabled')
    AND (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_nodes node
      WHERE node.id = target_node_id
        AND (
          private.is_app_admin()
          OR private.can_manage_workspace(node.workspace_id)
          OR (
            node.campaign_id IS NOT NULL
            AND private.can_co_manage_campaign(node.campaign_id)
          )
          OR EXISTS (
            SELECT 1
            FROM public.knowledge_node_acl assignment
            WHERE assignment.node_id = node.id
              AND assignment.user_id = (SELECT auth.uid())
              AND assignment.permission = 'manage'
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.can_create_knowledge_node(
  target_workspace_id uuid,
  target_campaign_id uuid,
  target_visibility public.knowledge_visibility
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.is_feature_enabled('nexus_knowledge_enabled')
    AND (SELECT auth.uid()) IS NOT NULL
    AND (
      private.is_app_admin()
      OR private.can_manage_workspace(target_workspace_id)
      OR (
        target_campaign_id IS NULL
        AND private.can_contribute_workspace(target_workspace_id)
        AND target_visibility IN ('author', 'users', 'workspace')
      )
      OR (
        target_campaign_id IS NOT NULL
        AND private.can_contribute_campaign(target_campaign_id)
        AND (
          target_visibility IN ('author', 'users', 'campaign')
          OR (
            target_visibility = 'masters'
            AND private.can_co_manage_campaign(target_campaign_id)
          )
          OR (
            target_visibility IN ('workspace', 'internal_public')
            AND private.can_manage_workspace(target_workspace_id)
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.validate_knowledge_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
  parent_record public.knowledge_nodes%ROWTYPE;
  cover_record public.assets%ROWTYPE;
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.slug := lower(btrim(NEW.slug));
  NEW.summary := coalesce(NEW.summary, '');
  NEW.content_markdown := coalesce(NEW.content_markdown, '');
  NEW.plain_text := coalesce(NEW.plain_text, '');
  NEW.properties := coalesce(NEW.properties, '{}'::jsonb);

  IF TG_OP = 'INSERT' THEN
    IF current_user_id IS NOT NULL THEN
      IF NEW.created_by <> current_user_id OR NEW.updated_by <> current_user_id THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'KNOWLEDGE_ACTOR_MISMATCH';
      END IF;
      IF NOT private.can_create_knowledge_node(
        NEW.workspace_id,
        NEW.campaign_id,
        NEW.visibility
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = 'P0001',
          MESSAGE = 'KNOWLEDGE_CREATE_FORBIDDEN';
      END IF;
    END IF;
  ELSE
    IF NEW.id <> OLD.id
      OR NEW.workspace_id <> OLD.workspace_id
      OR NEW.campaign_id IS DISTINCT FROM OLD.campaign_id
      OR NEW.created_by <> OLD.created_by
      OR NEW.created_at <> OLD.created_at
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'KNOWLEDGE_SCOPE_IMMUTABLE';
    END IF;

    IF current_user_id IS NOT NULL AND NEW.updated_by <> current_user_id THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'KNOWLEDGE_ACTOR_MISMATCH';
    END IF;
  END IF;

  IF NEW.visibility = 'campaign' AND NEW.campaign_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'KNOWLEDGE_CAMPAIGN_REQUIRED';
  END IF;

  IF NEW.visibility = 'internal_public'
    AND NOT private.can_manage_workspace(NEW.workspace_id)
    AND current_user_id IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'KNOWLEDGE_PUBLIC_VISIBILITY_FORBIDDEN';
  END IF;

  IF (
    TG_OP = 'INSERT'
    OR NEW.status IS DISTINCT FROM OLD.status
  )
    AND NEW.status IN ('canonical', 'deprecated')
    AND current_user_id IS NOT NULL
    AND NOT (
      private.can_manage_workspace(NEW.workspace_id)
      OR (
        NEW.campaign_id IS NOT NULL
        AND private.can_co_manage_campaign(NEW.campaign_id)
      )
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'KNOWLEDGE_STATUS_FORBIDDEN';
  END IF;

  IF NEW.status = 'archived' THEN
    NEW.archived_at := coalesce(NEW.archived_at, clock_timestamp());
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'archived' THEN
    NEW.archived_at := NULL;
  END IF;

  IF NEW.parent_node_id IS NOT NULL THEN
    SELECT *
      INTO parent_record
      FROM public.knowledge_nodes node
      WHERE node.id = NEW.parent_node_id;
    IF NOT FOUND
      OR parent_record.workspace_id <> NEW.workspace_id
      OR (
        parent_record.campaign_id IS NOT NULL
        AND parent_record.campaign_id IS DISTINCT FROM NEW.campaign_id
      )
      OR parent_record.deleted_at IS NOT NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'KNOWLEDGE_PARENT_SCOPE_INVALID';
    END IF;
  END IF;

  IF NEW.cover_asset_id IS NOT NULL THEN
    SELECT *
      INTO cover_record
      FROM public.assets asset
      WHERE asset.id = NEW.cover_asset_id;
    IF NOT FOUND
      OR cover_record.workspace_id <> NEW.workspace_id
      OR cover_record.status <> 'ready'
      OR cover_record.deleted_at IS NOT NULL
      OR (
        current_user_id IS NOT NULL
        AND NOT private.can_read_asset(NEW.cover_asset_id)
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'KNOWLEDGE_COVER_ASSET_INVALID';
    END IF;
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.version_knowledge_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  version_limit integer;
  version_actor uuid;
BEGIN
  IF ROW(
    NEW.title,
    NEW.summary,
    NEW.content_markdown,
    NEW.properties,
    NEW.status,
    NEW.visibility,
    NEW.icon,
    NEW.cover_asset_id,
    NEW.parent_node_id
  ) IS DISTINCT FROM ROW(
    OLD.title,
    OLD.summary,
    OLD.content_markdown,
    OLD.properties,
    OLD.status,
    OLD.visibility,
    OLD.icon,
    OLD.cover_asset_id,
    OLD.parent_node_id
  ) THEN
    NEW.version_sequence := OLD.version_sequence + 1;
    version_actor := coalesce((SELECT auth.uid()), NEW.updated_by, OLD.updated_by);

    INSERT INTO public.knowledge_versions (
      node_id,
      version_number,
      title_snapshot,
      summary_snapshot,
      content_snapshot,
      properties_snapshot,
      status_snapshot,
      visibility_snapshot,
      created_by,
      reason,
      automatic
    )
    VALUES (
      OLD.id,
      NEW.version_sequence,
      OLD.title,
      OLD.summary,
      OLD.content_markdown,
      OLD.properties,
      OLD.status,
      OLD.visibility,
      version_actor,
      'automatic',
      true
    );

    SELECT coalesce(settings.auto_version_limit, 50)
      INTO version_limit
      FROM public.knowledge_workspace_settings settings
      WHERE settings.workspace_id = OLD.workspace_id;
    version_limit := coalesce(version_limit, 50);

    DELETE FROM public.knowledge_versions version
    WHERE version.id IN (
      SELECT stale.id
      FROM public.knowledge_versions stale
      WHERE stale.node_id = OLD.id
        AND stale.automatic
      ORDER BY stale.version_number DESC
      OFFSET version_limit
    );
  ELSE
    NEW.version_sequence := OLD.version_sequence;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.scope_knowledge_alias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  node_record public.knowledge_nodes%ROWTYPE;
BEGIN
  SELECT *
    INTO node_record
    FROM public.knowledge_nodes node
    WHERE node.id = NEW.node_id;
  IF NOT FOUND OR node_record.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'KNOWLEDGE_ALIAS_NODE_INVALID';
  END IF;

  NEW.alias := btrim(regexp_replace(NEW.alias, '\s+', ' ', 'g'));
  NEW.normalized_alias := lower(NEW.alias);
  NEW.workspace_id := node_record.workspace_id;
  NEW.campaign_id := node_record.campaign_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_knowledge_relation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  source_record public.knowledge_nodes%ROWTYPE;
  target_record public.knowledge_nodes%ROWTYPE;
BEGIN
  SELECT * INTO source_record
  FROM public.knowledge_nodes node
  WHERE node.id = NEW.source_node_id;
  SELECT * INTO target_record
  FROM public.knowledge_nodes node
  WHERE node.id = NEW.target_node_id;

  IF source_record.id IS NULL
    OR target_record.id IS NULL
    OR source_record.workspace_id <> target_record.workspace_id
    OR source_record.deleted_at IS NOT NULL
    OR target_record.deleted_at IS NOT NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'KNOWLEDGE_RELATION_SCOPE_INVALID';
  END IF;

  IF TG_TABLE_NAME = 'knowledge_edges' THEN
    NEW.workspace_id := source_record.workspace_id;
    NEW.updated_at := clock_timestamp();

    IF NEW.visibility = 'campaign'
      AND source_record.campaign_id IS NULL
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'KNOWLEDGE_EDGE_CAMPAIGN_REQUIRED';
    END IF;

    IF (SELECT auth.uid()) IS NOT NULL
      AND NEW.visibility = 'masters'
      AND NOT (
        private.can_manage_workspace(source_record.workspace_id)
        OR (
          source_record.campaign_id IS NOT NULL
          AND private.can_co_manage_campaign(source_record.campaign_id)
        )
      )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'KNOWLEDGE_EDGE_VISIBILITY_FORBIDDEN';
    END IF;

    IF (SELECT auth.uid()) IS NOT NULL
      AND NEW.visibility = 'internal_public'
      AND NOT private.can_manage_workspace(source_record.workspace_id)
    THEN
      RAISE EXCEPTION USING
        ERRCODE = 'P0001',
        MESSAGE = 'KNOWLEDGE_EDGE_PUBLIC_FORBIDDEN';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_knowledge_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_workspace_id uuid;
BEGIN
  NEW.name := btrim(NEW.name);
  NEW.slug := lower(btrim(NEW.slug));
  NEW.updated_at := clock_timestamp();
  IF NEW.parent_tag_id IS NOT NULL THEN
    SELECT tag.workspace_id
      INTO parent_workspace_id
      FROM public.knowledge_tags tag
      WHERE tag.id = NEW.parent_tag_id
        AND tag.deleted_at IS NULL;
    IF parent_workspace_id IS DISTINCT FROM NEW.workspace_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'KNOWLEDGE_TAG_PARENT_SCOPE_INVALID';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_knowledge_node_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  node_workspace_id uuid;
  tag_workspace_id uuid;
BEGIN
  SELECT node.workspace_id
    INTO node_workspace_id
    FROM public.knowledge_nodes node
    WHERE node.id = NEW.node_id
      AND node.deleted_at IS NULL;
  SELECT tag.workspace_id
    INTO tag_workspace_id
    FROM public.knowledge_tags tag
    WHERE tag.id = NEW.tag_id
      AND tag.deleted_at IS NULL;
  IF node_workspace_id IS NULL
    OR tag_workspace_id IS NULL
    OR node_workspace_id <> tag_workspace_id
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'KNOWLEDGE_TAG_SCOPE_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.validate_knowledge_asset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  node_workspace_id uuid;
  asset_workspace_id uuid;
BEGIN
  SELECT node.workspace_id
    INTO node_workspace_id
    FROM public.knowledge_nodes node
    WHERE node.id = NEW.node_id
      AND node.deleted_at IS NULL;
  SELECT asset.workspace_id
    INTO asset_workspace_id
    FROM public.assets asset
    WHERE asset.id = NEW.asset_id
      AND asset.status = 'ready'
      AND asset.deleted_at IS NULL;
  IF node_workspace_id IS NULL
    OR asset_workspace_id IS NULL
    OR node_workspace_id <> asset_workspace_id
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'KNOWLEDGE_ASSET_SCOPE_INVALID';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.sync_knowledge_asset_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.asset_links link
    WHERE link.asset_id = OLD.asset_id
      AND link.entity_type = 'knowledge_node'
      AND link.entity_id = OLD.node_id
      AND link.role = OLD.asset_role;
    RETURN OLD;
  END IF;

  INSERT INTO public.asset_links (
    asset_id,
    entity_type,
    entity_id,
    role,
    sort_order
  )
  VALUES (
    NEW.asset_id,
    'knowledge_node',
    NEW.node_id,
    NEW.asset_role,
    NEW.sort_order
  )
  ON CONFLICT (asset_id, entity_type, entity_id, role)
  DO UPDATE SET sort_order = EXCLUDED.sort_order;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.audit_knowledge_node()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_name text;
  target public.knowledge_nodes%ROWTYPE;
BEGIN
  target := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  event_name := CASE
    WHEN TG_OP = 'INSERT' THEN 'knowledge.node.created'
    WHEN TG_OP = 'DELETE' THEN 'knowledge.node.deleted'
    WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL
      THEN 'knowledge.node.soft_deleted'
    WHEN NEW.deleted_at IS NULL AND OLD.deleted_at IS NOT NULL
      THEN 'knowledge.node.restored'
    WHEN NEW.status = 'archived' AND OLD.status <> 'archived'
      THEN 'knowledge.node.archived'
    ELSE 'knowledge.node.updated'
  END;

  INSERT INTO public.audit_events (
    actor_user_id,
    workspace_id,
    campaign_id,
    event_type,
    resource_type,
    resource_id,
    metadata
  )
  VALUES (
    (SELECT auth.uid()),
    target.workspace_id,
    target.campaign_id,
    event_name,
    'knowledge_node',
    target.id::text,
    jsonb_build_object(
      'node_type', target.node_type,
      'status', target.status,
      'visibility', target.visibility
    )
  );
  RETURN target;
END;
$$;

CREATE TRIGGER knowledge_nodes_10_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_node();
CREATE TRIGGER knowledge_nodes_20_version
  BEFORE UPDATE ON public.knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION private.version_knowledge_node();
CREATE TRIGGER knowledge_nodes_90_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION private.audit_knowledge_node();
CREATE TRIGGER knowledge_aliases_scope
  BEFORE INSERT OR UPDATE ON public.knowledge_aliases
  FOR EACH ROW EXECUTE FUNCTION private.scope_knowledge_alias();
CREATE TRIGGER knowledge_edges_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_edges
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_relation();
CREATE TRIGGER knowledge_mentions_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_mentions
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_relation();
CREATE TRIGGER knowledge_tags_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_tags
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_tag();
CREATE TRIGGER knowledge_node_tags_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_node_tags
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_node_tag();
CREATE TRIGGER knowledge_assets_validate
  BEFORE INSERT OR UPDATE ON public.knowledge_assets
  FOR EACH ROW EXECUTE FUNCTION private.validate_knowledge_asset();
CREATE TRIGGER knowledge_assets_sync_insert
  AFTER INSERT OR UPDATE ON public.knowledge_assets
  FOR EACH ROW EXECUTE FUNCTION private.sync_knowledge_asset_link();
CREATE TRIGGER knowledge_assets_sync_delete
  AFTER DELETE ON public.knowledge_assets
  FOR EACH ROW EXECUTE FUNCTION private.sync_knowledge_asset_link();

CREATE OR REPLACE FUNCTION private.create_knowledge_settings_for_workspace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.knowledge_workspace_settings (workspace_id)
  VALUES (NEW.id)
  ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER workspaces_create_knowledge_settings
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION private.create_knowledge_settings_for_workspace();

ALTER TABLE public.knowledge_workspace_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_node_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_node_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_recent ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_settings_select
  ON public.knowledge_workspace_settings
  FOR SELECT TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_access_workspace(workspace_id)
  );
CREATE POLICY knowledge_settings_update
  ON public.knowledge_workspace_settings
  FOR UPDATE TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  )
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  );

CREATE POLICY knowledge_nodes_select
  ON public.knowledge_nodes
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(id));
CREATE POLICY knowledge_nodes_insert
  ON public.knowledge_nodes
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND private.can_create_knowledge_node(workspace_id, campaign_id, visibility)
  );
CREATE POLICY knowledge_nodes_update
  ON public.knowledge_nodes
  FOR UPDATE TO authenticated
  USING (private.can_edit_knowledge_node(id))
  WITH CHECK (private.can_edit_knowledge_node(id));

CREATE POLICY knowledge_acl_select
  ON public.knowledge_node_acl
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_acl_insert
  ON public.knowledge_node_acl
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.can_manage_knowledge_node(node_id)
  );
CREATE POLICY knowledge_acl_update
  ON public.knowledge_node_acl
  FOR UPDATE TO authenticated
  USING (private.can_manage_knowledge_node(node_id))
  WITH CHECK (private.can_manage_knowledge_node(node_id));
CREATE POLICY knowledge_acl_delete
  ON public.knowledge_node_acl
  FOR DELETE TO authenticated
  USING (private.can_manage_knowledge_node(node_id));

CREATE POLICY knowledge_edges_select
  ON public.knowledge_edges
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_edge(id));
CREATE POLICY knowledge_edges_insert
  ON public.knowledge_edges
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.can_edit_knowledge_node(source_node_id)
    AND private.can_read_knowledge_node(target_node_id)
  );
CREATE POLICY knowledge_edges_update
  ON public.knowledge_edges
  FOR UPDATE TO authenticated
  USING (private.can_edit_knowledge_node(source_node_id))
  WITH CHECK (
    private.can_edit_knowledge_node(source_node_id)
    AND private.can_read_knowledge_node(target_node_id)
  );
CREATE POLICY knowledge_edges_delete
  ON public.knowledge_edges
  FOR DELETE TO authenticated
  USING (private.can_manage_knowledge_node(source_node_id));

CREATE POLICY knowledge_aliases_select
  ON public.knowledge_aliases
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(node_id));
CREATE POLICY knowledge_aliases_insert
  ON public.knowledge_aliases
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.can_edit_knowledge_node(node_id)
  );
CREATE POLICY knowledge_aliases_update
  ON public.knowledge_aliases
  FOR UPDATE TO authenticated
  USING (private.can_edit_knowledge_node(node_id))
  WITH CHECK (private.can_edit_knowledge_node(node_id));
CREATE POLICY knowledge_aliases_delete
  ON public.knowledge_aliases
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(node_id));

CREATE POLICY knowledge_tags_select
  ON public.knowledge_tags
  FOR SELECT TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND deleted_at IS NULL
    AND private.can_access_workspace(workspace_id)
  );
CREATE POLICY knowledge_tags_insert
  ON public.knowledge_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND created_by = (SELECT auth.uid())
    AND private.can_contribute_workspace(workspace_id)
  );
CREATE POLICY knowledge_tags_update
  ON public.knowledge_tags
  FOR UPDATE TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_contribute_workspace(workspace_id)
  )
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_contribute_workspace(workspace_id)
  );
CREATE POLICY knowledge_tags_delete
  ON public.knowledge_tags
  FOR DELETE TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  );

CREATE POLICY knowledge_node_tags_select
  ON public.knowledge_node_tags
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(node_id));
CREATE POLICY knowledge_node_tags_insert
  ON public.knowledge_node_tags
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.can_edit_knowledge_node(node_id)
  );
CREATE POLICY knowledge_node_tags_delete
  ON public.knowledge_node_tags
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(node_id));

CREATE POLICY knowledge_mentions_select
  ON public.knowledge_mentions
  FOR SELECT TO authenticated
  USING (
    private.can_read_knowledge_node(source_node_id)
    AND private.can_read_knowledge_node(target_node_id)
  );
CREATE POLICY knowledge_mentions_insert
  ON public.knowledge_mentions
  FOR INSERT TO authenticated
  WITH CHECK (
    private.can_edit_knowledge_node(source_node_id)
    AND private.can_read_knowledge_node(target_node_id)
  );
CREATE POLICY knowledge_mentions_update
  ON public.knowledge_mentions
  FOR UPDATE TO authenticated
  USING (private.can_edit_knowledge_node(source_node_id))
  WITH CHECK (
    private.can_edit_knowledge_node(source_node_id)
    AND private.can_read_knowledge_node(target_node_id)
  );
CREATE POLICY knowledge_mentions_delete
  ON public.knowledge_mentions
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(source_node_id));

CREATE POLICY knowledge_assets_select
  ON public.knowledge_assets
  FOR SELECT TO authenticated
  USING (
    private.can_read_knowledge_node(node_id)
    AND private.can_read_asset(asset_id)
  );
CREATE POLICY knowledge_assets_insert
  ON public.knowledge_assets
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.can_edit_knowledge_node(node_id)
    AND private.can_read_asset(asset_id)
  );
CREATE POLICY knowledge_assets_update
  ON public.knowledge_assets
  FOR UPDATE TO authenticated
  USING (private.can_edit_knowledge_node(node_id))
  WITH CHECK (
    private.can_edit_knowledge_node(node_id)
    AND private.can_read_asset(asset_id)
  );
CREATE POLICY knowledge_assets_delete
  ON public.knowledge_assets
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(node_id));

CREATE POLICY knowledge_versions_select
  ON public.knowledge_versions
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(node_id));

CREATE POLICY knowledge_templates_select
  ON public.knowledge_templates
  FOR SELECT TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND deleted_at IS NULL
    AND private.can_access_workspace(workspace_id)
  );
CREATE POLICY knowledge_templates_insert
  ON public.knowledge_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND created_by = (SELECT auth.uid())
    AND private.can_manage_workspace(workspace_id)
  );
CREATE POLICY knowledge_templates_update
  ON public.knowledge_templates
  FOR UPDATE TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  )
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  );
CREATE POLICY knowledge_templates_delete
  ON public.knowledge_templates
  FOR DELETE TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  );

CREATE POLICY knowledge_favorites_select
  ON public.knowledge_favorites
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_favorites_insert
  ON public.knowledge_favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_favorites_delete
  ON public.knowledge_favorites
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY knowledge_recent_select
  ON public.knowledge_recent
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_recent_insert
  ON public.knowledge_recent
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_recent_update
  ON public.knowledge_recent
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.can_read_knowledge_node(node_id)
  );
CREATE POLICY knowledge_recent_delete
  ON public.knowledge_recent
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE
  public.knowledge_workspace_settings,
  public.knowledge_nodes,
  public.knowledge_node_acl,
  public.knowledge_edges,
  public.knowledge_aliases,
  public.knowledge_tags,
  public.knowledge_node_tags,
  public.knowledge_mentions,
  public.knowledge_assets,
  public.knowledge_versions,
  public.knowledge_templates,
  public.knowledge_favorites,
  public.knowledge_recent
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.knowledge_workspace_settings,
  public.knowledge_nodes,
  public.knowledge_node_acl,
  public.knowledge_edges,
  public.knowledge_aliases,
  public.knowledge_tags,
  public.knowledge_node_tags,
  public.knowledge_mentions,
  public.knowledge_assets,
  public.knowledge_versions,
  public.knowledge_templates,
  public.knowledge_favorites,
  public.knowledge_recent
TO authenticated;

GRANT INSERT ON TABLE
  public.knowledge_nodes,
  public.knowledge_node_acl,
  public.knowledge_edges,
  public.knowledge_aliases,
  public.knowledge_tags,
  public.knowledge_node_tags,
  public.knowledge_mentions,
  public.knowledge_assets,
  public.knowledge_templates,
  public.knowledge_favorites,
  public.knowledge_recent
TO authenticated;

GRANT UPDATE (
  auto_version_limit,
  updated_by,
  updated_at
) ON public.knowledge_workspace_settings TO authenticated;
GRANT UPDATE (
  node_type,
  title,
  slug,
  summary,
  content_markdown,
  plain_text,
  properties,
  status,
  visibility,
  icon,
  cover_asset_id,
  parent_node_id,
  updated_by,
  updated_at,
  archived_at,
  deleted_at
) ON public.knowledge_nodes TO authenticated;
GRANT UPDATE (permission)
  ON public.knowledge_node_acl TO authenticated;
GRANT UPDATE (
  target_node_id,
  relation_type,
  label,
  direction,
  visibility,
  properties,
  updated_at,
  deleted_at
) ON public.knowledge_edges TO authenticated;
GRANT UPDATE (alias, normalized_alias)
  ON public.knowledge_aliases TO authenticated;
GRANT UPDATE (name, slug, parent_tag_id, updated_at, deleted_at)
  ON public.knowledge_tags TO authenticated;
GRANT UPDATE (
  target_node_id,
  raw_text,
  start_position,
  end_position
) ON public.knowledge_mentions TO authenticated;
GRANT UPDATE (asset_role, caption, sort_order)
  ON public.knowledge_assets TO authenticated;
GRANT UPDATE (
  node_type,
  name,
  default_content,
  default_properties,
  updated_at,
  deleted_at
) ON public.knowledge_templates TO authenticated;
GRANT UPDATE (last_opened_at)
  ON public.knowledge_recent TO authenticated;

GRANT DELETE ON TABLE
  public.knowledge_node_acl,
  public.knowledge_edges,
  public.knowledge_aliases,
  public.knowledge_tags,
  public.knowledge_node_tags,
  public.knowledge_mentions,
  public.knowledge_assets,
  public.knowledge_templates,
  public.knowledge_favorites,
  public.knowledge_recent
TO authenticated;

REVOKE ALL ON FUNCTION private.is_feature_enabled(text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_read_knowledge_node(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_edit_knowledge_node(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_read_knowledge_edge(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_knowledge_node(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_create_knowledge_node(
  uuid,
  uuid,
  public.knowledge_visibility
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_feature_enabled(text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_knowledge_node(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_knowledge_node(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_knowledge_edge(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_knowledge_node(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_create_knowledge_node(
  uuid,
  uuid,
  public.knowledge_visibility
) TO authenticated;

REVOKE ALL ON FUNCTION private.validate_knowledge_node()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.version_knowledge_node()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.scope_knowledge_alias()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_knowledge_relation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_knowledge_tag()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_knowledge_node_tag()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_knowledge_asset()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.sync_knowledge_asset_link()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.audit_knowledge_node()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.create_knowledge_settings_for_workspace()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.knowledge_nodes IS
  'Portable Markdown pages for O Nexus. Binary data remains in Nexus Assets.';
COMMENT ON TABLE public.knowledge_edges IS
  'Typed, visibility-aware relationships between knowledge nodes.';
COMMENT ON TABLE public.knowledge_aliases IS
  'Deterministic workspace/campaign aliases used by wikilink resolution.';
COMMENT ON TABLE public.knowledge_versions IS
  'Bounded automatic snapshots created before meaningful node changes.';
COMMENT ON TABLE public.knowledge_node_acl IS
  'Explicit per-user access for nodes with users visibility.';
COMMENT ON COLUMN public.knowledge_nodes.content_markdown IS
  'Canonical portable content representation. Renderers must sanitize output.';
