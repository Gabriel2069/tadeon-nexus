-- O Nexus: transactional creation without INSERT ... RETURNING under self-referential RLS.

CREATE OR REPLACE FUNCTION public.create_knowledge_node(
  p_workspace_id uuid,
  p_title text,
  p_campaign_id uuid DEFAULT NULL,
  p_node_type public.knowledge_node_type DEFAULT 'free_note',
  p_slug text DEFAULT NULL,
  p_summary text DEFAULT '',
  p_content_markdown text DEFAULT '',
  p_plain_text text DEFAULT '',
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_status public.knowledge_node_status DEFAULT 'draft',
  p_visibility public.knowledge_visibility DEFAULT 'author',
  p_icon text DEFAULT NULL,
  p_cover_asset_id uuid DEFAULT NULL,
  p_parent_node_id uuid DEFAULT NULL
)
RETURNS public.knowledge_nodes
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  created_node_id uuid := gen_random_uuid();
  created_node public.knowledge_nodes;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_CREATE_FORBIDDEN';
  END IF;

  IF p_title IS NULL
    OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 200
    OR p_slug IS NULL
    OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR jsonb_typeof(coalesce(p_properties, '{}'::jsonb)) <> 'object'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_CREATE_INVALID';
  END IF;

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
    cover_asset_id,
    parent_node_id,
    created_by,
    updated_by
  ) VALUES (
    created_node_id,
    p_workspace_id,
    p_campaign_id,
    coalesce(p_node_type, 'free_note'::public.knowledge_node_type),
    btrim(p_title),
    p_slug,
    coalesce(p_summary, ''),
    coalesce(p_content_markdown, ''),
    coalesce(p_plain_text, ''),
    coalesce(p_properties, '{}'::jsonb),
    coalesce(p_status, 'draft'::public.knowledge_node_status),
    coalesce(p_visibility, 'author'::public.knowledge_visibility),
    p_icon,
    p_cover_asset_id,
    p_parent_node_id,
    actor_id,
    actor_id
  );

  SELECT node.*
  INTO created_node
  FROM public.knowledge_nodes node
  WHERE node.id = created_node_id;

  IF created_node.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_CREATE_FORBIDDEN';
  END IF;

  RETURN created_node;
END;
$$;

REVOKE ALL ON FUNCTION public.create_knowledge_node(
  uuid,
  text,
  uuid,
  public.knowledge_node_type,
  text,
  text,
  text,
  text,
  jsonb,
  public.knowledge_node_status,
  public.knowledge_visibility,
  text,
  uuid,
  uuid
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_knowledge_node(
  uuid,
  text,
  uuid,
  public.knowledge_node_type,
  text,
  text,
  text,
  text,
  jsonb,
  public.knowledge_node_status,
  public.knowledge_visibility,
  text,
  uuid,
  uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_knowledge_edge(
  p_workspace_id uuid,
  p_source_node_id uuid,
  p_target_node_id uuid,
  p_relation_type public.knowledge_relation_type,
  p_label text DEFAULT '',
  p_direction public.knowledge_relation_direction DEFAULT 'directed',
  p_visibility public.knowledge_visibility DEFAULT 'workspace',
  p_properties jsonb DEFAULT '{}'::jsonb
)
RETURNS public.knowledge_edges
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  created_edge_id uuid := gen_random_uuid();
  created_edge public.knowledge_edges;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_EDGE_CREATE_FORBIDDEN';
  END IF;

  IF p_source_node_id IS NULL
    OR p_target_node_id IS NULL
    OR p_source_node_id = p_target_node_id
    OR p_relation_type IS NULL
    OR char_length(coalesce(p_label, '')) > 160
    OR jsonb_typeof(coalesce(p_properties, '{}'::jsonb)) <> 'object'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_EDGE_CREATE_INVALID';
  END IF;

  INSERT INTO public.knowledge_edges (
    id,
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
    created_edge_id,
    p_workspace_id,
    p_source_node_id,
    p_target_node_id,
    p_relation_type,
    btrim(coalesce(p_label, '')),
    coalesce(
      p_direction,
      'directed'::public.knowledge_relation_direction
    ),
    coalesce(
      p_visibility,
      'workspace'::public.knowledge_visibility
    ),
    coalesce(p_properties, '{}'::jsonb),
    actor_id
  );

  SELECT edge.*
  INTO created_edge
  FROM public.knowledge_edges edge
  WHERE edge.id = created_edge_id;

  IF created_edge.id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_EDGE_CREATE_FORBIDDEN';
  END IF;

  RETURN created_edge;
END;
$$;

REVOKE ALL ON FUNCTION public.create_knowledge_edge(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_knowledge_edge(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb
) TO authenticated;

COMMENT ON FUNCTION public.create_knowledge_node(
  uuid,
  text,
  uuid,
  public.knowledge_node_type,
  text,
  text,
  text,
  text,
  jsonb,
  public.knowledge_node_status,
  public.knowledge_visibility,
  text,
  uuid,
  uuid
) IS
  'Creates one knowledge node under RLS and reads it in a separate statement so self-referential SELECT policies see it.';

COMMENT ON FUNCTION public.create_knowledge_edge(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb
) IS
  'Creates one semantic edge under RLS and reads it in a separate statement so self-referential SELECT policies see it.';

NOTIFY pgrst, 'reload schema';
