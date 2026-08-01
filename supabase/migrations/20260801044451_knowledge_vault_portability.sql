-- O Nexus: atomic Markdown-vault import with preview, conflict reporting and asset links.
-- The RPC is additive. It never updates or deletes an existing page.

CREATE OR REPLACE FUNCTION public.import_knowledge_vault(
  p_workspace_id uuid,
  p_campaign_id uuid,
  p_dry_run boolean,
  p_bundle jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  pages jsonb := coalesce(p_bundle -> 'pages', '[]'::jsonb);
  relations jsonb := coalesce(p_bundle -> 'relations', '[]'::jsonb);
  attachments jsonb := coalesce(p_bundle -> 'attachments', '[]'::jsonb);
  page jsonb;
  relation jsonb;
  attachment jsonb;
  alias_value jsonb;
  tag_value jsonb;
  heading jsonb;
  link jsonb;
  import_key text;
  title_value text;
  slug_value text;
  slug_base text;
  candidate_slug text;
  conflict_action text;
  existing_node_id uuid;
  created_node_id uuid;
  source_node_id uuid;
  target_node_id uuid;
  tag_id uuid;
  asset_id uuid;
  tag_name text;
  tag_slug text;
  normalized_alias_value text;
  node_map jsonb := '{}'::jsonb;
  created_map jsonb := '{}'::jsonb;
  conflicts jsonb := '[]'::jsonb;
  created_nodes jsonb := '[]'::jsonb;
  warnings jsonb := '[]'::jsonb;
  pages_created integer := 0;
  pages_skipped integer := 0;
  aliases_created integer := 0;
  tags_linked integer := 0;
  mentions_created integer := 0;
  broken_links_created integer := 0;
  relations_created integer := 0;
  attachments_linked integer := 0;
  row_delta integer := 0;
  suffix integer;
BEGIN
  IF actor_id IS NULL
    OR p_workspace_id IS NULL
    OR NOT private.is_feature_enabled('nexus_knowledge_enabled')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_IMPORT_FORBIDDEN';
  END IF;

  IF NOT (
    private.can_manage_workspace(p_workspace_id)
    OR (
      p_campaign_id IS NOT NULL
      AND private.can_co_manage_campaign(p_campaign_id)
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_IMPORT_MANAGER_REQUIRED';
  END IF;

  IF p_campaign_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.campaigns campaign
      WHERE campaign.id = p_campaign_id
        AND campaign.workspace_id = p_workspace_id
    )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'KNOWLEDGE_IMPORT_CAMPAIGN_INVALID';
  END IF;

  IF jsonb_typeof(coalesce(p_bundle, '{}'::jsonb)) <> 'object'
    OR jsonb_typeof(pages) <> 'array'
    OR jsonb_typeof(relations) <> 'array'
    OR jsonb_typeof(attachments) <> 'array'
    OR jsonb_array_length(pages) NOT BETWEEN 1 AND 500
    OR jsonb_array_length(relations) > 2000
    OR jsonb_array_length(attachments) > 2000
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_IMPORT_BUNDLE_INVALID';
  END IF;

  FOR page IN
    SELECT item
    FROM jsonb_array_elements(pages) item
  LOOP
    import_key := btrim(coalesce(page ->> 'import_key', ''));
    title_value := btrim(coalesce(page ->> 'title', ''));
    slug_value := btrim(coalesce(page ->> 'slug', ''));
    conflict_action := coalesce(page ->> 'conflict_action', 'skip');

    IF import_key = ''
      OR char_length(import_key) > 500
      OR title_value = ''
      OR char_length(title_value) > 200
      OR slug_value !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      OR conflict_action NOT IN ('skip', 'copy')
      OR jsonb_typeof(coalesce(page -> 'properties', '{}'::jsonb)) <> 'object'
      OR jsonb_typeof(coalesce(page -> 'aliases', '[]'::jsonb)) <> 'array'
      OR jsonb_typeof(coalesce(page -> 'tags', '[]'::jsonb)) <> 'array'
      OR jsonb_typeof(coalesce(page -> 'links', '[]'::jsonb)) <> 'array'
      OR jsonb_typeof(coalesce(page -> 'headings', '[]'::jsonb)) <> 'array'
      OR jsonb_array_length(coalesce(page -> 'aliases', '[]'::jsonb)) > 50
      OR jsonb_array_length(coalesce(page -> 'tags', '[]'::jsonb)) > 100
      OR jsonb_array_length(coalesce(page -> 'links', '[]'::jsonb)) > 1000
      OR jsonb_array_length(coalesce(page -> 'headings', '[]'::jsonb)) > 1000
      OR node_map ? import_key
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'KNOWLEDGE_IMPORT_PAGE_INVALID';
    END IF;

    IF (page ->> 'visibility') = 'campaign' AND p_campaign_id IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'KNOWLEDGE_IMPORT_CAMPAIGN_VISIBILITY_INVALID';
    END IF;

    -- Cast during dry-run too, so enum errors cannot appear only during apply.
    PERFORM (page ->> 'node_type')::public.knowledge_node_type;
    PERFORM (page ->> 'status')::public.knowledge_node_status;
    PERFORM (page ->> 'visibility')::public.knowledge_visibility;

    SELECT node.id
    INTO existing_node_id
    FROM public.knowledge_nodes node
    WHERE node.workspace_id = p_workspace_id
      AND node.campaign_id IS NOT DISTINCT FROM p_campaign_id
      AND node.slug = slug_value
      AND node.deleted_at IS NULL
    LIMIT 1;

    IF existing_node_id IS NOT NULL THEN
      conflicts := conflicts || jsonb_build_array(
        jsonb_build_object(
          'import_key', import_key,
          'title', title_value,
          'slug', slug_value,
          'existing_node_id', existing_node_id,
          'action', conflict_action
        )
      );
    END IF;

    IF existing_node_id IS NOT NULL AND conflict_action = 'skip' THEN
      node_map := node_map || jsonb_build_object(import_key, existing_node_id);
      created_map := created_map || jsonb_build_object(import_key, false);
      pages_skipped := pages_skipped + 1;
      CONTINUE;
    END IF;

    candidate_slug := slug_value;
    IF existing_node_id IS NOT NULL THEN
      slug_base := left(slug_value, 78);
      suffix := 2;
      candidate_slug := slug_base || '-importado';
      WHILE EXISTS (
        SELECT 1
        FROM public.knowledge_nodes node
        WHERE node.workspace_id = p_workspace_id
          AND node.campaign_id IS NOT DISTINCT FROM p_campaign_id
          AND node.slug = candidate_slug
          AND node.deleted_at IS NULL
      ) LOOP
        candidate_slug := slug_base || '-importado-' || suffix::text;
        suffix := suffix + 1;
      END LOOP;
    END IF;

    IF p_dry_run THEN
      created_node_id := gen_random_uuid();
    ELSE
      created_node_id := gen_random_uuid();
      INSERT INTO public.knowledge_nodes (
        id,
        workspace_id,
        campaign_id,
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
        created_by,
        updated_by,
        archived_at
      ) VALUES (
        created_node_id,
        p_workspace_id,
        p_campaign_id,
        (page ->> 'node_type')::public.knowledge_node_type,
        title_value,
        candidate_slug,
        left(coalesce(page ->> 'summary', ''), 2000),
        coalesce(page ->> 'content_markdown', ''),
        coalesce(page ->> 'plain_text', ''),
        coalesce(page -> 'properties', '{}'::jsonb)
          || jsonb_build_object(
            'nexus_import',
            jsonb_build_object(
              'archive_name', left(coalesce(p_bundle ->> 'archive_name', ''), 255),
              'source_path', left(coalesce(page ->> 'source_path', ''), 500),
              'import_key', import_key,
              'imported_at', clock_timestamp()
            )
          ),
        (page ->> 'status')::public.knowledge_node_status,
        (page ->> 'visibility')::public.knowledge_visibility,
        nullif(left(coalesce(page ->> 'icon', ''), 80), ''),
        actor_id,
        actor_id,
        CASE
          WHEN (page ->> 'status') = 'archived' THEN clock_timestamp()
          ELSE NULL
        END
      );

      FOR alias_value IN
        SELECT item
        FROM jsonb_array_elements(coalesce(page -> 'aliases', '[]'::jsonb)) item
      LOOP
        normalized_alias_value := lower(
          btrim(regexp_replace(alias_value #>> '{}', '\s+', ' ', 'g'))
        );
        IF normalized_alias_value <> ''
          AND char_length(normalized_alias_value) <= 200
          AND NOT EXISTS (
            SELECT 1
            FROM public.knowledge_aliases known_alias
            WHERE known_alias.workspace_id = p_workspace_id
              AND known_alias.campaign_id IS NOT DISTINCT FROM p_campaign_id
              AND known_alias.normalized_alias = normalized_alias_value
          )
        THEN
          INSERT INTO public.knowledge_aliases (
            node_id,
            workspace_id,
            campaign_id,
            alias,
            normalized_alias,
            created_by
          ) VALUES (
            created_node_id,
            p_workspace_id,
            p_campaign_id,
            alias_value #>> '{}',
            normalized_alias_value,
            actor_id
          );
          aliases_created := aliases_created + 1;
        ELSIF normalized_alias_value <> '' THEN
          warnings := warnings || jsonb_build_array(
            'Alias já existente e preservado: ' || (alias_value #>> '{}')
          );
        END IF;
      END LOOP;

      FOR tag_value IN
        SELECT item
        FROM jsonb_array_elements(coalesce(page -> 'tags', '[]'::jsonb)) item
      LOOP
        tag_name := left(btrim(tag_value #>> '{}'), 80);
        tag_slug := trim(
          both '-'
          from regexp_replace(lower(tag_name), '[^a-z0-9]+', '-', 'g')
        );
        IF tag_slug = '' THEN
          tag_slug := 'tag-' || left(md5(tag_name), 12);
        END IF;

        SELECT tag.id
        INTO tag_id
        FROM public.knowledge_tags tag
        WHERE tag.workspace_id = p_workspace_id
          AND tag.slug = tag_slug
          AND tag.deleted_at IS NULL
        LIMIT 1;

        IF tag_id IS NULL AND tag_name <> '' THEN
          tag_id := gen_random_uuid();
          INSERT INTO public.knowledge_tags (
            id,
            workspace_id,
            name,
            slug,
            created_by
          ) VALUES (
            tag_id,
            p_workspace_id,
            tag_name,
            tag_slug,
            actor_id
          );
        END IF;

        IF tag_id IS NOT NULL THEN
          INSERT INTO public.knowledge_node_tags (
            node_id,
            tag_id,
            created_by
          ) VALUES (
            created_node_id,
            tag_id,
            actor_id
          )
          ON CONFLICT DO NOTHING;
          GET DIAGNOSTICS row_delta = ROW_COUNT;
          tags_linked := tags_linked + row_delta;
        END IF;
      END LOOP;

      FOR heading IN
        SELECT item
        FROM jsonb_array_elements(coalesce(page -> 'headings', '[]'::jsonb)) item
      LOOP
        INSERT INTO public.knowledge_node_headings (
          node_id,
          anchor_slug,
          heading_text,
          level,
          occurrence,
          start_position
        ) VALUES (
          created_node_id,
          heading ->> 'anchor_slug',
          heading ->> 'heading_text',
          (heading ->> 'level')::smallint,
          (heading ->> 'occurrence')::integer,
          (heading ->> 'start_position')::integer
        );
      END LOOP;
    END IF;

    node_map := node_map || jsonb_build_object(import_key, created_node_id);
    created_map := created_map || jsonb_build_object(import_key, true);
    created_nodes := created_nodes || jsonb_build_array(
      jsonb_build_object(
        'import_key', import_key,
        'node_id', created_node_id,
        'title', title_value
      )
    );
    pages_created := pages_created + 1;
  END LOOP;

  IF NOT p_dry_run THEN
    -- Resolve wikilinks only after all pages and aliases exist.
    FOR page IN
      SELECT item
      FROM jsonb_array_elements(pages) item
    LOOP
      import_key := page ->> 'import_key';
      IF coalesce((created_map ->> import_key)::boolean, false) IS NOT TRUE THEN
        CONTINUE;
      END IF;
      source_node_id := (node_map ->> import_key)::uuid;

      FOR link IN
        SELECT item
        FROM jsonb_array_elements(coalesce(page -> 'links', '[]'::jsonb)) item
      LOOP
        target_node_id := NULL;

        IF nullif(link ->> 'target_key', '') IS NOT NULL
          AND node_map ? (link ->> 'target_key')
        THEN
          target_node_id := (node_map ->> (link ->> 'target_key'))::uuid;
        ELSIF coalesce((link ->> 'target_is_uuid')::boolean, false)
          AND coalesce(link ->> 'target', '') ~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        THEN
          SELECT node.id
          INTO target_node_id
          FROM public.knowledge_nodes node
          WHERE node.id = (link ->> 'target')::uuid
            AND node.workspace_id = p_workspace_id
            AND node.deleted_at IS NULL;
        ELSE
          SELECT node.id
          INTO target_node_id
          FROM public.knowledge_nodes node
          WHERE node.workspace_id = p_workspace_id
            AND node.deleted_at IS NULL
            AND (
              lower(node.title) = (link ->> 'normalized_target')
              OR EXISTS (
                SELECT 1
                FROM public.knowledge_aliases known_alias
                WHERE known_alias.node_id = node.id
                  AND known_alias.normalized_alias =
                    (link ->> 'normalized_target')
              )
            )
          ORDER BY
            (node.campaign_id IS NOT DISTINCT FROM p_campaign_id) DESC,
            node.updated_at DESC
          LIMIT 1;
        END IF;

        IF target_node_id IS NOT NULL
          AND target_node_id <> source_node_id
          AND (
            nullif(link ->> 'target_heading_slug', '') IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.knowledge_node_headings target_heading
              WHERE target_heading.node_id = target_node_id
                AND target_heading.anchor_slug =
                  (link ->> 'target_heading_slug')
            )
          )
        THEN
          INSERT INTO public.knowledge_mentions (
            source_node_id,
            target_node_id,
            raw_text,
            start_position,
            end_position,
            target_heading,
            target_heading_slug
          ) VALUES (
            source_node_id,
            target_node_id,
            left(link ->> 'raw', 500),
            (link ->> 'start_position')::integer,
            (link ->> 'end_position')::integer,
            nullif(link ->> 'target_heading', ''),
            nullif(link ->> 'target_heading_slug', '')
          )
          ON CONFLICT DO NOTHING;
          GET DIAGNOSTICS row_delta = ROW_COUNT;
          mentions_created := mentions_created + row_delta;
        ELSIF target_node_id <> source_node_id OR target_node_id IS NULL THEN
          INSERT INTO public.knowledge_broken_links (
            source_node_id,
            raw_text,
            target_text,
            normalized_target,
            target_heading,
            target_heading_slug,
            reason,
            start_position,
            end_position
          ) VALUES (
            source_node_id,
            left(link ->> 'raw', 500),
            left(link ->> 'target', 300),
            left(link ->> 'normalized_target', 300),
            nullif(link ->> 'target_heading', ''),
            nullif(link ->> 'target_heading_slug', ''),
            CASE
              WHEN target_node_id IS NULL THEN 'missing_node'
              ELSE 'missing_heading'
            END,
            (link ->> 'start_position')::integer,
            (link ->> 'end_position')::integer
          )
          ON CONFLICT DO NOTHING;
          GET DIAGNOSTICS row_delta = ROW_COUNT;
          broken_links_created := broken_links_created + row_delta;
        END IF;
      END LOOP;
    END LOOP;

    FOR relation IN
      SELECT item
      FROM jsonb_array_elements(relations) item
    LOOP
      IF NOT node_map ? coalesce(relation ->> 'source_key', '')
        OR NOT node_map ? coalesce(relation ->> 'target_key', '')
        OR coalesce(
          (created_map ->> (relation ->> 'source_key'))::boolean,
          false
        ) IS NOT TRUE
      THEN
        CONTINUE;
      END IF;

      source_node_id := (node_map ->> (relation ->> 'source_key'))::uuid;
      target_node_id := (node_map ->> (relation ->> 'target_key'))::uuid;
      IF source_node_id = target_node_id THEN
        CONTINUE;
      END IF;

      INSERT INTO public.knowledge_edges (
        workspace_id,
        source_node_id,
        target_node_id,
        relation_type,
        label,
        direction,
        visibility,
        properties,
        created_by
      ) VALUES (
        p_workspace_id,
        source_node_id,
        target_node_id,
        (relation ->> 'relation_type')::public.knowledge_relation_type,
        left(coalesce(relation ->> 'label', ''), 160),
        (relation ->> 'direction')::public.knowledge_relation_direction,
        (relation ->> 'visibility')::public.knowledge_visibility,
        coalesce(relation -> 'properties', '{}'::jsonb),
        actor_id
      )
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS row_delta = ROW_COUNT;
      relations_created := relations_created + row_delta;
    END LOOP;

    FOR attachment IN
      SELECT item
      FROM jsonb_array_elements(attachments) item
    LOOP
      IF NOT node_map ? coalesce(attachment ->> 'page_key', '')
        OR coalesce(
          (created_map ->> (attachment ->> 'page_key'))::boolean,
          false
        ) IS NOT TRUE
        OR coalesce(attachment ->> 'asset_id', '') !~*
          '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      THEN
        CONTINUE;
      END IF;

      source_node_id := (node_map ->> (attachment ->> 'page_key'))::uuid;
      asset_id := (attachment ->> 'asset_id')::uuid;
      IF NOT EXISTS (
        SELECT 1
        FROM public.assets asset
        WHERE asset.id = asset_id
          AND asset.workspace_id = p_workspace_id
          AND asset.created_by = actor_id
          AND asset.status = 'ready'
          AND asset.deleted_at IS NULL
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23503',
          MESSAGE = 'KNOWLEDGE_IMPORT_ASSET_INVALID';
      END IF;

      INSERT INTO public.knowledge_assets (
        node_id,
        asset_id,
        asset_role,
        caption,
        sort_order,
        created_by
      ) VALUES (
        source_node_id,
        asset_id,
        CASE
          WHEN coalesce(attachment ->> 'role', '') ~
            '^[a-z][a-z0-9_-]{0,39}$'
          THEN attachment ->> 'role'
          ELSE 'attachment'
        END,
        left(coalesce(attachment ->> 'caption', ''), 500),
        0,
        actor_id
      )
      ON CONFLICT DO NOTHING;
      GET DIAGNOSTICS row_delta = ROW_COUNT;
      attachments_linked := attachments_linked + row_delta;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'pages_total', jsonb_array_length(pages),
    'pages_created', pages_created,
    'pages_skipped', pages_skipped,
    'aliases_created', CASE WHEN p_dry_run THEN 0 ELSE aliases_created END,
    'tags_linked', CASE WHEN p_dry_run THEN 0 ELSE tags_linked END,
    'mentions_created', CASE WHEN p_dry_run THEN 0 ELSE mentions_created END,
    'broken_links_created',
      CASE WHEN p_dry_run THEN 0 ELSE broken_links_created END,
    'relations_created', CASE WHEN p_dry_run THEN 0 ELSE relations_created END,
    'attachments_linked',
      CASE WHEN p_dry_run THEN 0 ELSE attachments_linked END,
    'conflicts', conflicts,
    'created_nodes', CASE WHEN p_dry_run THEN '[]'::jsonb ELSE created_nodes END,
    'warnings', warnings
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_knowledge_vault(
  uuid,
  uuid,
  boolean,
  jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.import_knowledge_vault(
  uuid,
  uuid,
  boolean,
  jsonb
) TO authenticated;

COMMENT ON FUNCTION public.import_knowledge_vault(uuid, uuid, boolean, jsonb) IS
  'Previews or atomically imports one versioned Markdown vault. Existing pages are skipped or copied; never overwritten or deleted.';

NOTIFY pgrst, 'reload schema';
