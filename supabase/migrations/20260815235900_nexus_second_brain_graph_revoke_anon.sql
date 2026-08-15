revoke execute on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) from anon;

revoke execute on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) from public;

grant execute on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) to authenticated;
