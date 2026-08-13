-- Finalize uploaded objects through one narrow authenticated transaction.
-- The client supplies only presentation metadata; ownership and storage identity
-- are derived from the locked reservation created before the upload.

create or replace function public.finalize_asset_upload(
  target_session_id uuid,
  target_original_name text,
  target_display_name text,
  target_visibility public.asset_visibility,
  target_metadata jsonb default '{}'::jsonb
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := (select auth.uid());
  upload_session public.asset_upload_sessions%rowtype;
  finalized_asset public.assets%rowtype;
  clean_original_name text := btrim(coalesce(target_original_name, ''));
  clean_display_name text := btrim(coalesce(target_display_name, ''));
  clean_metadata jsonb := coalesce(target_metadata, '{}'::jsonb);
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'ASSET_AUTH_REQUIRED';
  end if;

  -- A repeated request after a lost response must be safe and deterministic.
  select asset.*
  into finalized_asset
  from public.assets asset
  join public.asset_upload_sessions session
    on session.expected_asset_id = asset.id
  where session.id = target_session_id
    and session.user_id = actor_id
    and asset.created_by = actor_id
    and asset.status = 'ready'::public.asset_status;

  if finalized_asset.id is not null then
    return finalized_asset;
  end if;

  select session.*
  into upload_session
  from public.asset_upload_sessions session
  where session.id = target_session_id
    and session.user_id = actor_id
    and session.status in (
      'initiated'::public.asset_upload_status,
      'uploading'::public.asset_upload_status
    )
    and session.expires_at > clock_timestamp()
  for update;

  if upload_session.id is null then
    raise exception using errcode = '42501', message = 'ASSET_SESSION_NOT_FINALIZABLE';
  end if;

  if not (
    (select private.can_contribute_workspace(upload_session.workspace_id))
    or (
      upload_session.campaign_id is not null
      and (select private.can_contribute_campaign(upload_session.campaign_id))
    )
  ) then
    raise exception using errcode = '42501', message = 'ASSET_PERMISSION_DENIED';
  end if;

  if length(clean_original_name) not between 1 and 255
     or length(clean_display_name) not between 1 and 255 then
    raise exception using errcode = '22023', message = 'ASSET_NAME_INVALID';
  end if;

  if jsonb_typeof(clean_metadata) <> 'object'
     or pg_column_size(clean_metadata) > 65536 then
    raise exception using errcode = '22023', message = 'ASSET_METADATA_INVALID';
  end if;

  if target_visibility = 'campaign'::public.asset_visibility
     and upload_session.campaign_id is null then
    raise exception using errcode = '22023', message = 'ASSET_CAMPAIGN_REQUIRED';
  end if;

  insert into public.assets (
    id,
    workspace_id,
    campaign_id,
    provider,
    bucket,
    object_key,
    original_name,
    display_name,
    mime_type,
    extension,
    size_bytes,
    visibility,
    status,
    created_by,
    metadata
  ) values (
    upload_session.expected_asset_id,
    upload_session.workspace_id,
    upload_session.campaign_id,
    upload_session.expected_provider,
    upload_session.expected_bucket,
    upload_session.expected_key,
    clean_original_name,
    clean_display_name,
    upload_session.expected_mime,
    upload_session.expected_extension,
    upload_session.expected_size,
    target_visibility,
    'pending'::public.asset_status,
    actor_id,
    clean_metadata
  )
  returning * into finalized_asset;

  return finalized_asset;
end;
$function$;

revoke all on function public.finalize_asset_upload(
  uuid,
  text,
  text,
  public.asset_visibility,
  jsonb
) from public, anon;

grant execute on function public.finalize_asset_upload(
  uuid,
  text,
  text,
  public.asset_visibility,
  jsonb
) to authenticated, service_role;

comment on function public.finalize_asset_upload(
  uuid,
  text,
  text,
  public.asset_visibility,
  jsonb
) is 'Intentional authenticated SECURITY DEFINER boundary. Locks the caller owned reservation, rechecks contribution rights, derives storage identity server-side and lets the existing trigger verify the stored object before catalog finalization.';

