-- Restore only the column privileges used by the authenticated asset client.
-- Row policies and immutable-field triggers remain the authorization boundary.

grant update (status, error_code)
on table public.asset_upload_sessions
to authenticated;

grant update (display_name)
on table public.assets
to authenticated;

