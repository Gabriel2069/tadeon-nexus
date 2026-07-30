-- O Nexus: bounded RLS-aware metadata graph for the local view.

CREATE OR REPLACE FUNCTION public.get_knowledge_local_graph(
  p_workspace_id uuid,
  p_focus_node_id uuid,
  p_campaign_id uuid DEFAULT NULL,
  p_include_workspace boolean DEFAULT true,
  p_depth integer DEFAULT 1,
  p_limit integer DEFAULT 120,
  p_node_types public.knowledge_node_type[] DEFAULT NULL,
  p_relation_types public.knowledge_relation_type[] DEFAULT NULL,
  p_visibilities public.knowledge_visibility[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  graph_result jsonb;
BEGIN
  IF p_workspace_id IS NULL
    OR p_focus_node_id IS NULL
    OR p_depth NOT BETWEEN 1 AND 2
    OR p_limit NOT BETWEEN 10 AND 250
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_GRAPH_INVALID';
  END IF;

  IF NOT private.is_feature_enabled('nexus_graph_enabled') THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'KNOWLEDGE_GRAPH_DISABLED';
  END IF;

  WITH RECURSIVE walk(node_id, depth) AS (
    SELECT focus.id, 0
    FROM public.knowledge_nodes focus
    WHERE focus.id = p_focus_node_id
      AND focus.workspace_id = p_workspace_id
      AND focus.deleted_at IS NULL
      AND (
        (
          p_campaign_id IS NULL
          AND focus.campaign_id IS NULL
        )
        OR (
          p_campaign_id IS NOT NULL
          AND (
            focus.campaign_id = p_campaign_id
            OR (p_include_workspace AND focus.campaign_id IS NULL)
          )
        )
      )

    UNION

    SELECT
      CASE
        WHEN edge.source_node_id = walk.node_id THEN edge.target_node_id
        ELSE edge.source_node_id
      END,
      walk.depth + 1
    FROM walk
    JOIN public.knowledge_edges edge
      ON edge.deleted_at IS NULL
      AND (
        edge.source_node_id = walk.node_id
        OR edge.target_node_id = walk.node_id
      )
      AND (
        p_relation_types IS NULL
        OR edge.relation_type = ANY (p_relation_types)
      )
    JOIN public.knowledge_nodes neighbor
      ON neighbor.id = CASE
        WHEN edge.source_node_id = walk.node_id THEN edge.target_node_id
        ELSE edge.source_node_id
      END
      AND neighbor.workspace_id = p_workspace_id
      AND neighbor.deleted_at IS NULL
      AND (
        (
          p_campaign_id IS NULL
          AND neighbor.campaign_id IS NULL
        )
        OR (
          p_campaign_id IS NOT NULL
          AND (
            neighbor.campaign_id = p_campaign_id
            OR (p_include_workspace AND neighbor.campaign_id IS NULL)
          )
        )
      )
      AND (
        p_node_types IS NULL
        OR neighbor.node_type = ANY (p_node_types)
      )
      AND (
        p_visibilities IS NULL
        OR neighbor.visibility = ANY (p_visibilities)
      )
    WHERE walk.depth < p_depth
  ),
  limited AS MATERIALIZED (
    SELECT walk.node_id, min(walk.depth)::integer AS depth
    FROM walk
    GROUP BY walk.node_id
    ORDER BY min(walk.depth), walk.node_id
    LIMIT p_limit
  ),
  graph_nodes AS (
    SELECT
      limited.depth,
      node.id,
      node.title,
      node.node_type,
      node.icon,
      node.status,
      node.visibility,
      node.campaign_id,
      node.updated_at
    FROM limited
    JOIN public.knowledge_nodes node ON node.id = limited.node_id
    ORDER BY limited.depth, lower(node.title), node.id
  ),
  graph_edges AS (
    SELECT
      edge.id,
      edge.source_node_id,
      edge.target_node_id,
      edge.relation_type,
      edge.label,
      edge.direction,
      edge.visibility
    FROM public.knowledge_edges edge
    JOIN limited source ON source.node_id = edge.source_node_id
    JOIN limited target ON target.node_id = edge.target_node_id
    WHERE edge.deleted_at IS NULL
      AND (
        p_relation_types IS NULL
        OR edge.relation_type = ANY (p_relation_types)
      )
    ORDER BY edge.created_at, edge.id
    LIMIT p_limit * 4
  )
  SELECT jsonb_build_object(
    'focusNodeId', p_focus_node_id,
    'depth', p_depth,
    'limit', p_limit,
    'truncated', (SELECT count(DISTINCT walk.node_id) > p_limit FROM walk),
    'nodes', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', graph_nodes.id,
            'title', graph_nodes.title,
            'nodeType', graph_nodes.node_type,
            'icon', graph_nodes.icon,
            'status', graph_nodes.status,
            'visibility', graph_nodes.visibility,
            'campaignId', graph_nodes.campaign_id,
            'updatedAt', graph_nodes.updated_at,
            'depth', graph_nodes.depth
          )
        )
        FROM graph_nodes
      ),
      '[]'::jsonb
    ),
    'edges', coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', graph_edges.id,
            'sourceNodeId', graph_edges.source_node_id,
            'targetNodeId', graph_edges.target_node_id,
            'relationType', graph_edges.relation_type,
            'label', graph_edges.label,
            'direction', graph_edges.direction,
            'visibility', graph_edges.visibility
          )
        )
        FROM graph_edges
      ),
      '[]'::jsonb
    )
  )
  INTO graph_result;

  IF graph_result IS NULL
    OR jsonb_array_length(graph_result -> 'nodes') = 0
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0002',
      MESSAGE = 'KNOWLEDGE_GRAPH_FOCUS_NOT_FOUND';
  END IF;

  RETURN graph_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_knowledge_local_graph(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_knowledge_local_graph(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) TO authenticated;

COMMENT ON FUNCTION public.get_knowledge_local_graph(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) IS
  'Returns a bounded local graph with RLS-visible metadata only; page content is never included.';

NOTIFY pgrst, 'reload schema';
