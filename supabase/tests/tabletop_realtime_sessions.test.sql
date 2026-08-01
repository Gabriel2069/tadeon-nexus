BEGIN;

DO $$
DECLARE
  insecure_function_count integer;
BEGIN
  IF to_regclass('public.tabletop_sessions') IS NULL
     OR to_regclass('public.tabletop_session_participants') IS NULL THEN
    RAISE EXCEPTION 'TABLETOP_REALTIME_SESSION_TABLES_MISSING';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tabletop_sessions' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tabletop_session_participants' AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'TABLETOP_REALTIME_SESSION_RLS_DISABLED';
  END IF;

  SELECT count(*) INTO insecure_function_count
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'open_tabletop_session', 'join_tabletop_session', 'leave_tabletop_session',
      'move_tabletop_session_scene', 'set_tabletop_session_lock',
      'remove_tabletop_session_participant', 'close_tabletop_session'
    )
    AND p.prosecdef;
  IF insecure_function_count <> 0 THEN
    RAISE EXCEPTION 'TABLETOP_REALTIME_FUNCTION_MUST_BE_SECURITY_INVOKER';
  END IF;

  IF has_function_privilege('anon', 'public.open_tabletop_session(uuid,uuid,text)', 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       CROSS JOIN LATERAL aclexplode(
         COALESCE(p.proacl, acldefault('f', p.proowner))
       ) acl
       WHERE n.nspname = 'public'
         AND p.proname = 'join_tabletop_session'
         AND acl.grantee = 0
         AND acl.privilege_type = 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'TABLETOP_REALTIME_ANON_EXECUTE_NOT_REVOKED';
  END IF;
END;
$$;

ROLLBACK;
