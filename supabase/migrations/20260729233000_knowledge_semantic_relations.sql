-- O Nexus: atomically create a semantic relation and its optional configured inverse.

CREATE OR REPLACE FUNCTION public.create_knowledge_relation(
  p_workspace_id uuid,
  p_source_node_id uuid,
  p_target_node_id uuid,
  p_relation_type public.knowledge_relation_type,
  p_label text DEFAULT '',
  p_direction public.knowledge_relation_direction DEFAULT 'directed',
  p_visibility public.knowledge_visibility DEFAULT 'workspace',
  p_properties jsonb DEFAULT '{}'::jsonb,
  p_inverse_relation_type public.knowledge_relation_type DEFAULT NULL,
  p_inverse_label text DEFAULT NULL,
  p_inverse_properties jsonb DEFAULT NULL
)
RETURNS SETOF public.knowledge_edges
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.create_knowledge_edge(
    p_workspace_id,
    p_source_node_id,
    p_target_node_id,
    p_relation_type,
    p_label,
    p_direction,
    p_visibility,
    p_properties
  );

  IF p_inverse_relation_type IS NOT NULL THEN
    IF p_direction = 'bidirectional'::public.knowledge_relation_direction THEN
      RAISE EXCEPTION USING
        ERRCODE = '22023',
        MESSAGE = 'KNOWLEDGE_RELATION_INVERSE_REDUNDANT';
    END IF;

    RETURN QUERY
    SELECT *
    FROM public.create_knowledge_edge(
      p_workspace_id,
      p_target_node_id,
      p_source_node_id,
      p_inverse_relation_type,
      coalesce(p_inverse_label, ''),
      'directed'::public.knowledge_relation_direction,
      p_visibility,
      coalesce(p_inverse_properties, p_properties, '{}'::jsonb)
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.create_knowledge_relation(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb,
  public.knowledge_relation_type,
  text,
  jsonb
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_knowledge_relation(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb,
  public.knowledge_relation_type,
  text,
  jsonb
) TO authenticated;

COMMENT ON FUNCTION public.create_knowledge_relation(
  uuid,
  uuid,
  uuid,
  public.knowledge_relation_type,
  text,
  public.knowledge_relation_direction,
  public.knowledge_visibility,
  jsonb,
  public.knowledge_relation_type,
  text,
  jsonb
) IS
  'Creates a semantic edge and an optional configured inverse atomically under the existing RLS policies and active-edge uniqueness index.';

NOTIFY pgrst, 'reload schema';
