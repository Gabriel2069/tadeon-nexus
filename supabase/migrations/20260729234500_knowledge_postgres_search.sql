-- O Nexus: RLS-aware PostgreSQL full-text search across connected knowledge.

CREATE OR REPLACE FUNCTION public.search_knowledge_nodes(
  p_workspace_id uuid,
  p_query text DEFAULT '',
  p_campaign_id uuid DEFAULT NULL,
  p_include_workspace boolean DEFAULT true,
  p_node_types public.knowledge_node_type[] DEFAULT NULL,
  p_statuses public.knowledge_node_status[] DEFAULT NULL,
  p_visibilities public.knowledge_visibility[] DEFAULT NULL,
  p_relation_types public.knowledge_relation_type[] DEFAULT NULL,
  p_only_canonical boolean DEFAULT false,
  p_order text DEFAULT 'relevance',
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  node_data public.knowledge_nodes,
  relevance real,
  snippet text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  normalized_query text := btrim(coalesce(p_query, ''));
  parsed_query tsquery;
BEGIN
  IF p_workspace_id IS NULL
    OR char_length(normalized_query) > 160
    OR p_order NOT IN ('relevance', 'updated', 'title')
    OR p_limit NOT BETWEEN 1 AND 100
    OR p_offset NOT BETWEEN 0 AND 100000
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_SEARCH_INVALID';
  END IF;

  IF normalized_query <> '' THEN
    parsed_query := websearch_to_tsquery('simple', normalized_query);
  END IF;

  RETURN QUERY
  WITH scoped AS MATERIALIZED (
    SELECT node.*
    FROM public.knowledge_nodes node
    WHERE node.workspace_id = p_workspace_id
      AND node.deleted_at IS NULL
      AND (
        (
          p_campaign_id IS NULL
          AND node.campaign_id IS NULL
        )
        OR (
          p_campaign_id IS NOT NULL
          AND (
            node.campaign_id = p_campaign_id
            OR (p_include_workspace AND node.campaign_id IS NULL)
          )
        )
      )
      AND (
        p_node_types IS NULL
        OR node.node_type = ANY (p_node_types)
      )
      AND (
        p_statuses IS NULL
        OR node.status = ANY (p_statuses)
      )
      AND (
        p_visibilities IS NULL
        OR node.visibility = ANY (p_visibilities)
      )
      AND (
        NOT p_only_canonical
        OR node.status = 'canonical'::public.knowledge_node_status
      )
      AND (
        p_relation_types IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.knowledge_edges edge_filter
          WHERE edge_filter.deleted_at IS NULL
            AND (
              edge_filter.source_node_id = node.id
              OR edge_filter.target_node_id = node.id
            )
            AND edge_filter.relation_type = ANY (p_relation_types)
        )
      )
  ),
  searchable AS (
    SELECT
      node AS node_data,
      (
        node.search_document
        || setweight(
          to_tsvector('simple', coalesce(alias_terms.value, '')),
          'A'
        )
        || setweight(
          to_tsvector(
            'simple',
            concat_ws(
              ' ',
              node.node_type::text,
              node.properties::text,
              tag_terms.value,
              relation_terms.value
            )
          ),
          'B'
        )
      ) AS full_document,
      concat_ws(
        ' ',
        node.title,
        node.summary,
        left(node.plain_text, 8000),
        alias_terms.value,
        tag_terms.value,
        relation_terms.value,
        node.properties::text,
        node.node_type::text
      ) AS headline_text
    FROM scoped node
    LEFT JOIN LATERAL (
      SELECT string_agg(alias.alias, ' ' ORDER BY alias.alias) AS value
      FROM public.knowledge_aliases alias
      WHERE alias.node_id = node.id
    ) alias_terms ON true
    LEFT JOIN LATERAL (
      SELECT string_agg(
        concat_ws(' ', tag.name, tag.slug),
        ' ' ORDER BY tag.name
      ) AS value
      FROM public.knowledge_node_tags assignment
      JOIN public.knowledge_tags tag
        ON tag.id = assignment.tag_id
      WHERE assignment.node_id = node.id
        AND tag.deleted_at IS NULL
    ) tag_terms ON true
    LEFT JOIN LATERAL (
      SELECT string_agg(
        concat_ws(
          ' ',
          edge.relation_type::text,
          edge.label,
          related.title
        ),
        ' ' ORDER BY edge.created_at
      ) AS value
      FROM public.knowledge_edges edge
      JOIN public.knowledge_nodes related
        ON related.id = CASE
          WHEN edge.source_node_id = node.id THEN edge.target_node_id
          ELSE edge.source_node_id
        END
      WHERE edge.deleted_at IS NULL
        AND (
          edge.source_node_id = node.id
          OR edge.target_node_id = node.id
        )
    ) relation_terms ON true
  ),
  ranked AS (
    SELECT
      searchable.node_data,
      CASE
        WHEN normalized_query = '' THEN 0::real
        ELSE ts_rank_cd(
          searchable.full_document,
          parsed_query,
          32
        )::real
      END AS relevance,
      CASE
        WHEN normalized_query = '' THEN left(
          coalesce(
            nullif((searchable.node_data).summary, ''),
            nullif((searchable.node_data).plain_text, ''),
            (searchable.node_data).title
          ),
          280
        )
        ELSE ts_headline(
          'simple',
          searchable.headline_text,
          parsed_query,
          'StartSel=⟦, StopSel=⟧, MaxWords=32, MinWords=12, MaxFragments=2, FragmentDelimiter= … '
        )
      END AS snippet
    FROM searchable
    WHERE normalized_query = ''
      OR searchable.full_document @@ parsed_query
  )
  SELECT
    ranked.node_data,
    ranked.relevance,
    ranked.snippet,
    count(*) OVER ()::bigint AS total_count
  FROM ranked
  ORDER BY
    CASE
      WHEN p_order = 'relevance' AND normalized_query <> ''
      THEN ranked.relevance
    END DESC NULLS LAST,
    CASE
      WHEN p_order = 'updated'
        OR (p_order = 'relevance' AND normalized_query = '')
      THEN (ranked.node_data).updated_at
    END DESC NULLS LAST,
    CASE
      WHEN p_order = 'title'
      THEN lower((ranked.node_data).title)
    END ASC NULLS LAST,
    (ranked.node_data).updated_at DESC,
    (ranked.node_data).id
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_knowledge_nodes(
  uuid,
  text,
  uuid,
  boolean,
  public.knowledge_node_type[],
  public.knowledge_node_status[],
  public.knowledge_visibility[],
  public.knowledge_relation_type[],
  boolean,
  text,
  integer,
  integer
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_knowledge_nodes(
  uuid,
  text,
  uuid,
  boolean,
  public.knowledge_node_type[],
  public.knowledge_node_status[],
  public.knowledge_visibility[],
  public.knowledge_relation_type[],
  boolean,
  text,
  integer,
  integer
) TO authenticated;

COMMENT ON FUNCTION public.search_knowledge_nodes(
  uuid,
  text,
  uuid,
  boolean,
  public.knowledge_node_type[],
  public.knowledge_node_status[],
  public.knowledge_visibility[],
  public.knowledge_relation_type[],
  boolean,
  text,
  integer,
  integer
) IS
  'RLS-aware PostgreSQL full-text search over node text, aliases, tags, properties, types and visible semantic relations with filters, snippets and pagination.';

NOTIFY pgrst, 'reload schema';
