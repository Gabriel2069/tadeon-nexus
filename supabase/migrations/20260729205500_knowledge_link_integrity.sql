-- O Nexus: persisted headings, broken links and transactional backlink refresh.

ALTER TABLE public.knowledge_mentions
  ADD COLUMN IF NOT EXISTS target_heading text
    CHECK (
      target_heading IS NULL
      OR char_length(target_heading) BETWEEN 1 AND 300
    ),
  ADD COLUMN IF NOT EXISTS target_heading_slug text
    CHECK (
      target_heading_slug IS NULL
      OR target_heading_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    );

CREATE TABLE public.knowledge_node_headings (
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  anchor_slug text NOT NULL
    CHECK (anchor_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  heading_text text NOT NULL
    CHECK (char_length(btrim(heading_text)) BETWEEN 1 AND 300),
  level smallint NOT NULL
    CHECK (level BETWEEN 1 AND 6),
  occurrence integer NOT NULL
    CHECK (occurrence > 0),
  start_position integer NOT NULL
    CHECK (start_position >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (node_id, anchor_slug)
);

CREATE TABLE public.knowledge_broken_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  raw_text text NOT NULL
    CHECK (char_length(raw_text) BETWEEN 1 AND 500),
  target_text text NOT NULL
    CHECK (char_length(btrim(target_text)) BETWEEN 1 AND 300),
  normalized_target text NOT NULL
    CHECK (char_length(btrim(normalized_target)) BETWEEN 1 AND 300),
  target_heading text
    CHECK (
      target_heading IS NULL
      OR char_length(target_heading) BETWEEN 1 AND 300
    ),
  target_heading_slug text
    CHECK (
      target_heading_slug IS NULL
      OR target_heading_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    ),
  reason text NOT NULL
    CHECK (reason IN ('missing_node', 'missing_heading')),
  start_position integer NOT NULL
    CHECK (start_position >= 0),
  end_position integer NOT NULL
    CHECK (end_position > start_position),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (source_node_id, start_position, end_position)
);

CREATE INDEX knowledge_broken_links_source_idx
  ON public.knowledge_broken_links (source_node_id, start_position);
CREATE INDEX knowledge_broken_links_lookup_idx
  ON public.knowledge_broken_links (normalized_target, source_node_id);

ALTER TABLE public.knowledge_node_headings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_broken_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_node_headings_select
  ON public.knowledge_node_headings
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(node_id));
CREATE POLICY knowledge_node_headings_insert
  ON public.knowledge_node_headings
  FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_knowledge_node(node_id));
CREATE POLICY knowledge_node_headings_delete
  ON public.knowledge_node_headings
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(node_id));

CREATE POLICY knowledge_broken_links_select
  ON public.knowledge_broken_links
  FOR SELECT TO authenticated
  USING (private.can_read_knowledge_node(source_node_id));
CREATE POLICY knowledge_broken_links_insert
  ON public.knowledge_broken_links
  FOR INSERT TO authenticated
  WITH CHECK (private.can_edit_knowledge_node(source_node_id));
CREATE POLICY knowledge_broken_links_delete
  ON public.knowledge_broken_links
  FOR DELETE TO authenticated
  USING (private.can_edit_knowledge_node(source_node_id));

REVOKE ALL ON TABLE
  public.knowledge_node_headings,
  public.knowledge_broken_links
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE
  public.knowledge_node_headings,
  public.knowledge_broken_links
TO authenticated;

GRANT UPDATE (target_heading, target_heading_slug)
  ON public.knowledge_mentions
  TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_knowledge_link_index(
  p_source_node_id uuid,
  p_mentions jsonb DEFAULT '[]'::jsonb,
  p_broken_links jsonb DEFAULT '[]'::jsonb,
  p_headings jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL
    OR NOT private.can_edit_knowledge_node(p_source_node_id)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_LINK_INDEX_FORBIDDEN';
  END IF;

  IF jsonb_typeof(coalesce(p_mentions, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(p_broken_links, '[]'::jsonb)) <> 'array'
    OR jsonb_typeof(coalesce(p_headings, '[]'::jsonb)) <> 'array'
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'KNOWLEDGE_LINK_INDEX_INVALID';
  END IF;

  IF jsonb_array_length(coalesce(p_mentions, '[]'::jsonb)) > 1000
    OR jsonb_array_length(coalesce(p_broken_links, '[]'::jsonb)) > 1000
    OR jsonb_array_length(coalesce(p_headings, '[]'::jsonb)) > 1000
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'KNOWLEDGE_LINK_LIMIT_EXCEEDED';
  END IF;

  DELETE FROM public.knowledge_mentions mention
    WHERE mention.source_node_id = p_source_node_id;
  DELETE FROM public.knowledge_broken_links broken
    WHERE broken.source_node_id = p_source_node_id;
  DELETE FROM public.knowledge_node_headings heading
    WHERE heading.node_id = p_source_node_id;

  INSERT INTO public.knowledge_node_headings (
    node_id,
    anchor_slug,
    heading_text,
    level,
    occurrence,
    start_position
  )
  SELECT
    p_source_node_id,
    item.anchor_slug,
    item.heading_text,
    item.level,
    item.occurrence,
    item.start_position
  FROM jsonb_to_recordset(coalesce(p_headings, '[]'::jsonb)) AS item(
    anchor_slug text,
    heading_text text,
    level smallint,
    occurrence integer,
    start_position integer
  );

  INSERT INTO public.knowledge_mentions (
    source_node_id,
    target_node_id,
    raw_text,
    start_position,
    end_position,
    target_heading,
    target_heading_slug
  )
  SELECT
    p_source_node_id,
    item.target_node_id,
    item.raw_text,
    item.start_position,
    item.end_position,
    item.target_heading,
    item.target_heading_slug
  FROM jsonb_to_recordset(coalesce(p_mentions, '[]'::jsonb)) AS item(
    target_node_id uuid,
    raw_text text,
    start_position integer,
    end_position integer,
    target_heading text,
    target_heading_slug text
  );

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
  )
  SELECT
    p_source_node_id,
    item.raw_text,
    item.target_text,
    item.normalized_target,
    item.target_heading,
    item.target_heading_slug,
    item.reason,
    item.start_position,
    item.end_position
  FROM jsonb_to_recordset(coalesce(p_broken_links, '[]'::jsonb)) AS item(
    raw_text text,
    target_text text,
    normalized_target text,
    target_heading text,
    target_heading_slug text,
    reason text,
    start_position integer,
    end_position integer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_knowledge_link_index(
  uuid,
  jsonb,
  jsonb,
  jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.replace_knowledge_link_index(
  uuid,
  jsonb,
  jsonb,
  jsonb
) TO authenticated;

COMMENT ON TABLE public.knowledge_node_headings IS
  'Persisted Markdown heading anchors used to validate and navigate wikilinks.';
COMMENT ON TABLE public.knowledge_broken_links IS
  'Unresolved page or heading references, visible only with their source node.';
COMMENT ON FUNCTION public.replace_knowledge_link_index(uuid, jsonb, jsonb, jsonb) IS
  'Atomically replaces headings, resolved mentions and broken links for one editable node.';

NOTIFY pgrst, 'reload schema';
