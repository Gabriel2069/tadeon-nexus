BEGIN;

SELECT plan(13);

SELECT has_table('public', 'workspaces', 'workspaces exists');
SELECT has_table('public', 'workspace_members', 'workspace_members exists');
SELECT has_table('public', 'campaigns', 'campaigns exists');
SELECT has_table('public', 'campaign_members', 'campaign_members exists');
SELECT has_table('public', 'feature_flags', 'feature_flags exists');
SELECT has_table('public', 'audit_events', 'audit_events exists');

SELECT has_column(
  'public',
  'character_sheets',
  'campaign_id',
  'character sheets have a campaign link'
);
SELECT has_column(
  'public',
  'game_settings',
  'campaign_id',
  'legacy game settings have a campaign link'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_class relation
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN (
        'workspaces',
        'workspace_members',
        'campaigns',
        'campaign_members',
        'feature_flags',
        'audit_events'
      )
      AND relation.relrowsecurity
  ),
  6,
  'RLS is enabled on every Phase 1 table'
);

SELECT is(
  (SELECT count(*)::integer FROM public.feature_flags),
  7,
  'all seven feature flags are seeded'
);
SELECT is(
  (SELECT bool_and(NOT enabled) FROM public.feature_flags),
  true,
  'all expansion flags start disabled'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'workspace_role'
  ),
  '{owner,admin,member,viewer}',
  'workspace roles match the central contract'
);

SELECT is(
  (
    SELECT array_agg(value.enumlabel ORDER BY value.enumsortorder)::text
    FROM pg_enum value
    JOIN pg_type type ON type.oid = value.enumtypid
    JOIN pg_namespace namespace ON namespace.oid = type.typnamespace
    WHERE namespace.nspname = 'public'
      AND type.typname = 'campaign_role'
  ),
  '{master,co_master,player,observer}',
  'campaign roles match the central contract'
);

SELECT * FROM finish();

ROLLBACK;
