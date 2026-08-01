-- Mesa Nexus: authorize only active session participants on private Realtime channels.
-- Keep this migration limited to RLS policies on realtime.messages. The internal
-- Realtime schema is managed by Supabase and must not receive custom tables/functions.

drop policy if exists "Tabletop Realtime: active participants read"
  on realtime.messages;
drop policy if exists "Tabletop Realtime: active participants track presence"
  on realtime.messages;
drop policy if exists "Tabletop Realtime: managers send broadcasts"
  on realtime.messages;

create policy "Tabletop Realtime: active participants read"
on realtime.messages
for select
to authenticated
using (
  private is true
  and (select private.is_feature_enabled('nexus_realtime_enabled'))
  and (
    (
      extension = 'presence'
      and exists (
        select 1
        from public.tabletop_sessions as session_row
        join public.tabletop_session_participants as participant
          on participant.session_id = session_row.id
        where session_row.status = 'open'
          and participant.user_id = (select auth.uid())
          and participant.state = 'active'
          and participant.left_at is null
          and participant.removed_by is null
          and (select private.can_access_campaign(session_row.campaign_id))
          and (select realtime.topic()) = 'tabletop:session:' || session_row.id::text
      )
    )
    or
    (
      extension = 'broadcast'
      and exists (
        select 1
        from public.tabletop_sessions as session_row
        join public.tabletop_session_participants as participant
          on participant.session_id = session_row.id
        where session_row.status = 'open'
          and participant.user_id = (select auth.uid())
          and participant.state = 'active'
          and participant.left_at is null
          and participant.removed_by is null
          and (select private.can_access_campaign(session_row.campaign_id))
          and (
            (select realtime.topic()) = 'tabletop:session:' || session_row.id::text
            or (
              session_row.current_scene_id is not null
              and (select realtime.topic()) =
                'tabletop:scene:' || session_row.current_scene_id::text
            )
          )
      )
    )
  )
);

create policy "Tabletop Realtime: active participants track presence"
on realtime.messages
for insert
to authenticated
with check (
  private is true
  and extension = 'presence'
  and (select private.is_feature_enabled('nexus_realtime_enabled'))
  and exists (
    select 1
    from public.tabletop_sessions as session_row
    join public.tabletop_session_participants as participant
      on participant.session_id = session_row.id
    where session_row.status = 'open'
      and participant.user_id = (select auth.uid())
      and participant.state = 'active'
      and participant.left_at is null
      and participant.removed_by is null
      and (select private.can_access_campaign(session_row.campaign_id))
      and (select realtime.topic()) = 'tabletop:session:' || session_row.id::text
  )
);

create policy "Tabletop Realtime: managers send broadcasts"
on realtime.messages
for insert
to authenticated
with check (
  private is true
  and extension = 'broadcast'
  and (select private.is_feature_enabled('nexus_realtime_enabled'))
  and exists (
    select 1
    from public.tabletop_sessions as session_row
    join public.tabletop_session_participants as participant
      on participant.session_id = session_row.id
    where session_row.status = 'open'
      and participant.user_id = (select auth.uid())
      and participant.state = 'active'
      and participant.left_at is null
      and participant.removed_by is null
      and (select private.can_co_manage_campaign(session_row.campaign_id))
      and (
        (select realtime.topic()) = 'tabletop:session:' || session_row.id::text
        or (
          session_row.current_scene_id is not null
          and (select realtime.topic()) =
            'tabletop:scene:' || session_row.current_scene_id::text
        )
      )
  )
);
