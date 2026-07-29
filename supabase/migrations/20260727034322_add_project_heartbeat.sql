-- Harmless Data API endpoint used by the scheduled GitHub Action to generate
-- genuine user database activity on the Supabase Free Plan.

CREATE OR REPLACE FUNCTION public.project_heartbeat()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT now();
$$;

REVOKE ALL ON FUNCTION public.project_heartbeat() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.project_heartbeat() TO anon;

COMMENT ON FUNCTION public.project_heartbeat() IS
  'Returns the current transaction timestamp without reading or changing application data.';

NOTIFY pgrst, 'reload schema';
