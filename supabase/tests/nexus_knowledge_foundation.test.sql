BEGIN;

SELECT plan(20);

SELECT has_table('public', 'knowledge_nodes', 'knowledge nodes exist');
SELECT has_table('public', 'knowledge_edges', 'knowledge edges exist');
SELECT has_table('public', 'knowledge_aliases', 'knowledge aliases exist');
SELECT has_table('public', 'knowledge_tags', 'knowledge tags exist');
SELECT has_table('public', 'knowledge_versions', 'knowledge versions exist');
SELECT has_table('public', 'knowledge_templates', 'knowledge templates exist');
SELECT has_table('public', 'knowledge_node_acl', 'per-user node ACL exists');
SELECT has_table('public', 'knowledge_assets', 'knowledge asset links exist');

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relkind = 'r'
      AND relation.relname LIKE 'knowledge_%'
      AND relation.relrowsecurity
  ),
  13,
  'RLS is enabled on every O Nexus table'
);

SELECT is(
  (
    SELECT enabled
    FROM public.feature_flags
    WHERE key = 'nexus_knowledge_enabled'
  ),
  false,
  'O Nexus remains disabled after the migration'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'knowledge_node_status'
  ),
  '{draft,review,canonical,deprecated,archived}',
  'knowledge lifecycle matches the central contract'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'knowledge_visibility'
  ),
  '{author,masters,campaign,users,workspace,internal_public}',
  'knowledge visibility matches the central contract'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.columns column_info
    WHERE column_info.table_schema = 'public'
      AND column_info.table_name LIKE 'knowledge_%'
      AND column_info.data_type = 'bytea'
  ),
  0,
  'no binary payload is stored in Postgres'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.role_table_grants grant_entry
    WHERE grant_entry.table_schema = 'public'
      AND grant_entry.table_name LIKE 'knowledge_%'
      AND grant_entry.grantee = 'anon'
  ),
  0,
  'anonymous users have no O Nexus table privileges'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'private'
      AND function.proname IN (
        'validate_knowledge_node',
        'version_knowledge_node',
        'scope_knowledge_alias',
        'validate_knowledge_relation',
        'validate_knowledge_tag',
        'validate_knowledge_node_tag',
        'validate_knowledge_asset',
        'sync_knowledge_asset_link',
        'audit_knowledge_node',
        'create_knowledge_settings_for_workspace'
      )
      AND (
        has_function_privilege('anon', function.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', function.oid, 'EXECUTE')
      )
  ),
  0,
  'knowledge trigger functions cannot be executed by client roles'
);

SELECT is(
  (SELECT count(*)::integer FROM public.knowledge_workspace_settings),
  (SELECT count(*)::integer FROM public.workspaces),
  'each workspace receives bounded version settings'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_indexes index_info
    WHERE index_info.schemaname = 'public'
      AND index_info.tablename = 'knowledge_nodes'
      AND index_info.indexname = 'knowledge_nodes_search_idx'
      AND index_info.indexdef LIKE '%USING gin%'
  ),
  1,
  'full-text search is backed by a GIN index'
);

SELECT is(
  has_table_privilege('authenticated', 'public.knowledge_nodes', 'DELETE'),
  false,
  'authenticated clients cannot hard-delete knowledge nodes'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_trigger trigger
    WHERE trigger.tgrelid = 'public.knowledge_assets'::regclass
      AND NOT trigger.tgisinternal
      AND trigger.tgname IN (
        'knowledge_assets_sync_insert',
        'knowledge_assets_sync_delete'
      )
  ),
  2,
  'knowledge assets stay synchronized with the shared usage registry'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_indexes index_info
    WHERE index_info.schemaname = 'public'
      AND index_info.tablename = 'knowledge_nodes'
      AND index_info.indexname IN (
        'knowledge_nodes_workspace_slug_active_key',
        'knowledge_nodes_campaign_slug_active_key'
      )
      AND index_info.indexdef LIKE 'CREATE UNIQUE INDEX%'
  ),
  2,
  'active slugs are unique inside the correct scope'
);

SELECT * FROM finish();
ROLLBACK;
