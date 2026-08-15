-- Hotfix: optimistic Mesa conflicts are business conflicts, not PostgreSQL
-- serialization failures. SQLSTATE 40001 is retryable and caused a single
-- TABLETOP_VERSION_CONFLICT to be retried until PostgREST timed out, exhausting
-- the API pool and blocking unrelated authenticated bootstrap reads.
--
-- Keep the RPC signature, message and authorization contract unchanged. The
-- application already maps TABLETOP_VERSION_CONFLICT to TABLETOP_CONFLICT.
-- This migration is intentionally idempotent because production received the
-- emergency fix before the repository migration was recorded.

do $$
declare
  target_oid oid;
  definition text;
  updated_definition text;
begin
  select p.oid
    into target_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'save_tabletop_scene_state'
    and pg_get_function_identity_arguments(p.oid) =
      'target_scene_id uuid, expected_scene_version integer, scene_document jsonb, layer_documents jsonb, entity_documents jsonb, deleted_entity_documents jsonb';

  if target_oid is null then
    raise exception 'save_tabletop_scene_state signature not found';
  end if;

  definition := pg_get_functiondef(target_oid);

  if position('40001' in definition) > 0 then
    updated_definition := replace(
      definition,
      'errcode = ''40001''',
      'errcode = ''P0001'''
    );

    if updated_definition = definition then
      raise exception 'TABLETOP_VERSION_CONFLICT retryable SQLSTATE markers could not be replaced';
    end if;

    execute updated_definition;
  elsif position('P0001' in definition) = 0 then
    raise exception 'save_tabletop_scene_state has an unexpected conflict SQLSTATE';
  end if;
end
$$;

comment on function public.save_tabletop_scene_state(
  uuid, integer, jsonb, jsonb, jsonb, jsonb
) is
  'Atomic tabletop save with optimistic conflicts reported as non-retryable business errors; TABLETOP_VERSION_CONFLICT must not use SQLSTATE 40001.';
