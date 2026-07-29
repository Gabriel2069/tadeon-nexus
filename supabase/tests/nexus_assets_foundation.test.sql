BEGIN;

SELECT plan(29);

SELECT has_table('public', 'assets', 'assets exists');
SELECT has_table('public', 'asset_links', 'asset_links exists');
SELECT has_table('public', 'asset_variants', 'asset_variants exists');
SELECT has_table('public', 'asset_upload_sessions', 'asset_upload_sessions exists');
SELECT has_table('public', 'asset_workspace_quotas', 'asset_workspace_quotas exists');
SELECT has_table(
  'public',
  'r2_asset_confirmations',
  'R2 completion confirmations exist'
);
SELECT has_view('public', 'asset_workspace_usage', 'asset usage view exists');

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'assets',
        'asset_links',
        'asset_variants',
        'asset_upload_sessions',
        'asset_workspace_quotas'
      )
      AND relation.relrowsecurity
  ),
  5,
  'RLS is enabled on every Nexus Assets table'
);

SELECT is(
  (SELECT NOT public FROM storage.buckets WHERE id = 'nexus-assets'),
  true,
  'the Nexus Assets bucket is private'
);

SELECT is(
  (SELECT file_size_limit FROM storage.buckets WHERE id = 'nexus-assets'),
  26214400::bigint,
  'the Supabase bucket has a 25 MiB hard limit'
);

SELECT is(
  (
    SELECT 'application/pdf' = ANY(allowed_mime_types)
    FROM storage.buckets
    WHERE id = 'nexus-assets'
  ),
  true,
  'PDF files are allowed'
);

SELECT is(
  (
    SELECT NOT (
      'application/octet-stream' = ANY(allowed_mime_types)
      OR 'application/x-msdownload' = ANY(allowed_mime_types)
    )
    FROM storage.buckets
    WHERE id = 'nexus-assets'
  ),
  true,
  'generic binaries and executables are not allowed'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'asset_provider'
  ),
  '{supabase,r2}',
  'asset providers match the central contract'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'asset_visibility'
  ),
  '{private,workspace,campaign}',
  'asset visibility matches the central contract'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'asset_upload_status'
  ),
  '{initiated,uploading,completed,cancelled,failed,expired}',
  'upload sessions have explicit terminal states'
);

SELECT is(
  (SELECT count(*)::integer FROM public.asset_workspace_quotas),
  (SELECT count(*)::integer * 2 FROM public.workspaces),
  'each workspace receives Supabase and R2 quota rows'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.role_table_grants grant_entry
    WHERE grant_entry.table_schema = 'public'
      AND grant_entry.table_name IN (
        'assets',
        'asset_links',
        'asset_variants',
        'asset_upload_sessions',
        'asset_workspace_quotas'
      )
      AND grant_entry.grantee = 'anon'
  ),
  0,
  'anonymous users have no Nexus Assets table privileges'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'public'
      AND function.proname IN ('soft_delete_asset', 'restore_asset')
      AND function.prosecdef
  ),
  0,
  'public asset RPCs do not use security definer'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'private'
      AND function.proname IN (
        'validate_asset_upload_session',
        'guard_asset_upload_session_update',
        'finalize_asset_from_upload',
        'guard_asset_update',
        'validate_asset_variant'
      )
      AND (
        has_function_privilege('anon', function.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', function.oid, 'EXECUTE')
      )
  ),
  0,
  'trigger functions cannot be executed through client roles'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies policy
    WHERE policy.schemaname = 'storage'
      AND policy.tablename = 'objects'
      AND policy.policyname LIKE 'Nexus assets:%'
  ),
  3,
  'storage has reserved upload, authorized download and confirmed removal policies'
);

SELECT is(
  (
    SELECT enabled
    FROM public.feature_flags
    WHERE key = 'nexus_assets_v2_enabled'
  ),
  false,
  'Nexus Assets remains disabled after the migration'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.columns column_info
    WHERE column_info.table_schema = 'public'
      AND column_info.table_name IN (
        'assets',
        'asset_links',
        'asset_variants',
        'asset_upload_sessions',
        'asset_workspace_quotas'
      )
      AND column_info.data_type = 'bytea'
  ),
  0,
  'no binary payload is stored in Postgres'
);

SELECT is(
  (
    SELECT coalesce(relation.reloptions @> ARRAY['security_invoker=true'], false)
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'asset_workspace_usage'
  ),
  true,
  'the usage view executes with caller permissions'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_indexes index_info
    WHERE index_info.schemaname = 'public'
      AND index_info.tablename IN (
        'assets',
        'asset_links',
        'asset_variants',
        'asset_upload_sessions',
        'asset_workspace_quotas'
      )
      AND index_info.indexname IN (
        'assets_workspace_created_idx',
        'assets_campaign_created_idx',
        'asset_links_entity_idx',
        'asset_upload_sessions_active_idx'
      )
  ),
  4,
  'core listing, linking and quota paths are indexed'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid = function.pronamespace
    WHERE namespace.nspname = 'private'
      AND function.proname IN (
        'can_contribute_workspace',
        'can_contribute_campaign'
      )
      AND (
        has_function_privilege('anon', function.oid, 'EXECUTE')
        OR has_function_privilege('authenticated', function.oid, 'EXECUTE')
      )
  ),
  0,
  'contributor role helpers cannot be called through client roles'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'asset_upload_sessions'
      AND policy.policyname = 'Asset sessions: contributors reserve'
  ),
  1,
  'upload reservations use the contributor-only policy'
);

SELECT is(
  (
    SELECT relation.relrowsecurity
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'r2_asset_confirmations'
  ),
  true,
  'R2 confirmations have RLS enabled'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM information_schema.role_table_grants grant_entry
    WHERE grant_entry.table_schema = 'public'
      AND grant_entry.table_name = 'r2_asset_confirmations'
      AND grant_entry.grantee IN ('anon', 'authenticated')
  ),
  0,
  'client roles have no confirmation table privileges'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'r2_asset_confirmations'
      AND policy.policyname = 'R2 confirmations: deny client access'
  ),
  1,
  'R2 confirmations explicitly deny all client access'
);

SELECT * FROM finish();

ROLLBACK;
