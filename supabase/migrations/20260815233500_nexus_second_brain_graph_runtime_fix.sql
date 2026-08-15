do $migration$
declare
  definition text;
  old_fragment text := $old$
  if graph_result is null
    or not exists (
      select 1
      from candidate
      where candidate.id = p_focus_node_id
    )
  then
$old$;
  new_fragment text := $new$
  if graph_result is null
    or coalesce(jsonb_array_length(graph_result -> 'nodes'), 0) = 0
    or not exists (
      select 1
      from jsonb_array_elements(graph_result -> 'nodes') as item(value)
      where item.value ->> 'id' = p_focus_node_id::text
    )
  then
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
    raise exception 'get_knowledge_graph_memory body changed unexpectedly';
  end if;
end;
$migration$;
