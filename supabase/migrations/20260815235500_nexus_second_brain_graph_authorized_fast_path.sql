do $migration$
declare
  definition text;
  old_fragment text := $old$
    where node.workspace_id = p_workspace_id
$old$;
  new_fragment text := $new$
    where node.workspace_id = p_workspace_id
      and private.can_read_knowledge_node(node.id)
$new$;
begin
  select pg_get_functiondef(proc.oid)
  into definition
  from pg_proc proc
  join pg_namespace namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'public'
    and proc.proname = 'get_knowledge_graph_memory'
    and proc.pronargs = 8;

  if definition is null then
    raise exception 'get_knowledge_graph_memory was not found';
  end if;

  if strpos(definition, new_fragment) > 0 then
    null;
  elsif strpos(definition, old_fragment) > 0 then
    execute replace(definition, old_fragment, new_fragment);
  else
    raise exception 'get_knowledge_graph_memory authorization site changed unexpectedly';
  end if;
end;
$migration$;

alter function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) security definer;

revoke all on function public.get_knowledge_graph_memory(
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

comment on function public.get_knowledge_graph_memory(
  uuid,
  uuid,
  uuid,
  boolean,
  integer,
  public.knowledge_node_type[],
  public.knowledge_relation_type[],
  public.knowledge_visibility[]
) is 'Second-brain graph memory. SECURITY DEFINER is intentionally bounded by private.can_read_knowledge_node for every candidate before any edge, mention, tag, hierarchy, or content signal can be returned.';
