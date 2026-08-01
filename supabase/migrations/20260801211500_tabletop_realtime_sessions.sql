-- Mesa Nexus Realtime: persistent session rooms and session-specific participants.
-- Additive only. Broadcast/Presence subscriptions remain disabled by feature flag.

ALTER TABLE public.tabletop_scenes
  ADD CONSTRAINT tabletop_scenes_id_campaign_key UNIQUE (id, campaign_id);

CREATE TABLE public.tabletop_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  current_scene_id uuid,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  join_locked boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  closed_at timestamptz,
  CONSTRAINT tabletop_sessions_scene_campaign_fkey
    FOREIGN KEY (current_scene_id, campaign_id)
    REFERENCES public.tabletop_scenes(id, campaign_id)
    ON DELETE RESTRICT,
  CONSTRAINT tabletop_sessions_closed_state_check CHECK (
    (status = 'open' AND closed_at IS NULL AND closed_by IS NULL)
    OR (status = 'closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
  )
);

CREATE TABLE public.tabletop_session_participants (
  session_id uuid NOT NULL REFERENCES public.tabletop_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.campaign_role NOT NULL,
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'left', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  left_at timestamptz,
  removed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (session_id, user_id),
  CONSTRAINT tabletop_session_participant_state_check CHECK (
    (state = 'active' AND left_at IS NULL AND removed_by IS NULL)
    OR (state = 'left' AND left_at IS NOT NULL AND removed_by IS NULL)
    OR (state = 'removed' AND left_at IS NOT NULL AND removed_by IS NOT NULL)
  )
);

CREATE UNIQUE INDEX tabletop_sessions_one_open_per_campaign_idx
  ON public.tabletop_sessions (campaign_id)
  WHERE status = 'open';
CREATE INDEX tabletop_sessions_scene_idx
  ON public.tabletop_sessions (current_scene_id)
  WHERE current_scene_id IS NOT NULL;
CREATE INDEX tabletop_sessions_created_by_idx
  ON public.tabletop_sessions (created_by);
CREATE INDEX tabletop_sessions_updated_by_idx
  ON public.tabletop_sessions (updated_by);
CREATE INDEX tabletop_sessions_closed_by_idx
  ON public.tabletop_sessions (closed_by)
  WHERE closed_by IS NOT NULL;
CREATE INDEX tabletop_session_participants_user_idx
  ON public.tabletop_session_participants (user_id, state, last_seen_at DESC);
CREATE INDEX tabletop_session_participants_removed_by_idx
  ON public.tabletop_session_participants (removed_by)
  WHERE removed_by IS NOT NULL;

ALTER TABLE public.tabletop_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabletop_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tabletop sessions: enabled campaign members read"
  ON public.tabletop_sessions FOR SELECT TO authenticated
  USING (
    (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
    AND (SELECT private.can_access_campaign(campaign_id))
  );
CREATE POLICY "Tabletop sessions: enabled campaign managers insert"
  ON public.tabletop_sessions FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
    AND created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND (SELECT private.can_co_manage_campaign(campaign_id))
  );
CREATE POLICY "Tabletop sessions: enabled campaign managers update"
  ON public.tabletop_sessions FOR UPDATE TO authenticated
  USING (
    (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
    AND (SELECT private.can_co_manage_campaign(campaign_id))
  )
  WITH CHECK (
    (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
    AND updated_by = (SELECT auth.uid())
    AND (SELECT private.can_co_manage_campaign(campaign_id))
  );

CREATE POLICY "Tabletop session participants: enabled campaign members read"
  ON public.tabletop_session_participants FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.tabletop_sessions session_row
    WHERE session_row.id = tabletop_session_participants.session_id
      AND (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
      AND (SELECT private.can_access_campaign(session_row.campaign_id))
  ));
CREATE POLICY "Tabletop session participants: join self"
  ON public.tabletop_session_participants FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.tabletop_sessions session_row
      WHERE session_row.id = tabletop_session_participants.session_id
        AND session_row.status = 'open'
        AND NOT session_row.join_locked
        AND (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
        AND (SELECT private.can_access_campaign(session_row.campaign_id))
        AND (
          EXISTS (
            SELECT 1
            FROM public.campaign_members member
            WHERE member.campaign_id = session_row.campaign_id
              AND member.user_id = (SELECT auth.uid())
              AND member.role = tabletop_session_participants.role
          )
          OR (
            (SELECT private.can_manage_campaign(session_row.campaign_id))
            AND tabletop_session_participants.role = 'master'::public.campaign_role
          )
          OR (
            (SELECT private.can_co_manage_campaign(session_row.campaign_id))
            AND tabletop_session_participants.role = 'co_master'::public.campaign_role
          )
        )
    )
  );
CREATE POLICY "Tabletop session participants: self or managers update"
  ON public.tabletop_session_participants FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.tabletop_sessions session_row
    WHERE session_row.id = tabletop_session_participants.session_id
      AND session_row.status = 'open'
      AND (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
      AND (
        tabletop_session_participants.user_id = (SELECT auth.uid())
        OR (SELECT private.can_co_manage_campaign(session_row.campaign_id))
      )
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.tabletop_sessions session_row
    WHERE session_row.id = tabletop_session_participants.session_id
      AND session_row.status = 'open'
      AND (SELECT private.is_feature_enabled('nexus_realtime_enabled'))
      AND (
        (
          tabletop_session_participants.user_id = (SELECT auth.uid())
          AND tabletop_session_participants.removed_by IS NULL
          AND (
            tabletop_session_participants.state = 'left'
            OR (
              tabletop_session_participants.state = 'active'
              AND NOT session_row.join_locked
            )
          )
          AND (
            EXISTS (
              SELECT 1
              FROM public.campaign_members member
              WHERE member.campaign_id = session_row.campaign_id
                AND member.user_id = (SELECT auth.uid())
                AND member.role = tabletop_session_participants.role
            )
            OR (SELECT private.can_co_manage_campaign(session_row.campaign_id))
          )
        )
        OR (
          (SELECT private.can_co_manage_campaign(session_row.campaign_id))
          AND (
            (
              tabletop_session_participants.state = 'removed'
              AND tabletop_session_participants.removed_by = (SELECT auth.uid())
            )
            OR (
              tabletop_session_participants.state IN ('active', 'left')
              AND tabletop_session_participants.removed_by IS NULL
            )
          )
        )
      )
  ));

REVOKE ALL ON TABLE
  public.tabletop_sessions,
  public.tabletop_session_participants
FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.tabletop_sessions TO authenticated;
GRANT UPDATE (
  current_scene_id, name, status, join_locked, updated_by, closed_by, closed_at
) ON public.tabletop_sessions TO authenticated;
GRANT SELECT, INSERT ON public.tabletop_session_participants TO authenticated;
GRANT UPDATE (role, state, last_seen_at, left_at, removed_by)
  ON public.tabletop_session_participants TO authenticated;

CREATE TRIGGER tabletop_sessions_bump_version
  BEFORE UPDATE ON public.tabletop_sessions
  FOR EACH ROW EXECUTE FUNCTION public.tabletop_bump_version();

CREATE OR REPLACE FUNCTION public.open_tabletop_session(
  target_campaign_id uuid,
  target_scene_id uuid,
  session_name text DEFAULT 'Sessão ao vivo'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  actor_role public.campaign_role;
  result_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF NOT (SELECT private.is_feature_enabled('nexus_realtime_enabled')) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_REALTIME_DISABLED';
  END IF;
  IF NOT (SELECT private.can_co_manage_campaign(target_campaign_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SESSION_NOT_MANAGEABLE';
  END IF;
  IF char_length(btrim(session_name)) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SESSION_NAME';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = target_scene_id
      AND scene.campaign_id = target_campaign_id
      AND scene.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SESSION_SCENE';
  END IF;

  SELECT member.role INTO actor_role
  FROM public.campaign_members member
  WHERE member.campaign_id = target_campaign_id
    AND member.user_id = actor_id;
  IF actor_role IS NULL THEN
    actor_role := CASE
      WHEN (SELECT private.can_manage_campaign(target_campaign_id))
        THEN 'master'::public.campaign_role
      ELSE 'co_master'::public.campaign_role
    END;
  END IF;

  INSERT INTO public.tabletop_sessions (
    campaign_id, current_scene_id, name, created_by, updated_by
  ) VALUES (
    target_campaign_id, target_scene_id, btrim(session_name), actor_id, actor_id
  ) RETURNING id INTO result_id;

  INSERT INTO public.tabletop_session_participants (
    session_id, user_id, role
  ) VALUES (
    result_id, actor_id, actor_role
  );
  RETURN result_id;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'TABLETOP_SESSION_ALREADY_OPEN';
END;
$$;

CREATE OR REPLACE FUNCTION public.join_tabletop_session(target_session_id uuid)
RETURNS public.campaign_role
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  target_campaign_id uuid;
  actor_role public.campaign_role;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF NOT (SELECT private.is_feature_enabled('nexus_realtime_enabled')) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_REALTIME_DISABLED';
  END IF;

  SELECT session_row.campaign_id INTO target_campaign_id
  FROM public.tabletop_sessions session_row
  WHERE session_row.id = target_session_id
    AND session_row.status = 'open'
    AND NOT session_row.join_locked
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SESSION_NOT_JOINABLE';
  END IF;

  SELECT member.role INTO actor_role
  FROM public.campaign_members member
  WHERE member.campaign_id = target_campaign_id
    AND member.user_id = actor_id;
  IF actor_role IS NULL AND (SELECT private.can_co_manage_campaign(target_campaign_id)) THEN
    actor_role := CASE
      WHEN (SELECT private.can_manage_campaign(target_campaign_id))
        THEN 'master'::public.campaign_role
      ELSE 'co_master'::public.campaign_role
    END;
  END IF;
  IF actor_role IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SESSION_NOT_JOINABLE';
  END IF;

  INSERT INTO public.tabletop_session_participants (
    session_id, user_id, role
  ) VALUES (
    target_session_id, actor_id, actor_role
  )
  ON CONFLICT (session_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        state = 'active',
        last_seen_at = clock_timestamp(),
        left_at = NULL,
        removed_by = NULL;
  RETURN actor_role;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_tabletop_session(target_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
BEGIN
  UPDATE public.tabletop_session_participants participant
  SET state = 'left',
      left_at = clock_timestamp(),
      last_seen_at = clock_timestamp(),
      removed_by = NULL
  WHERE participant.session_id = target_session_id
    AND participant.user_id = actor_id
    AND participant.state = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SESSION_NOT_LEAVABLE';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_tabletop_session_scene(
  target_session_id uuid,
  target_scene_id uuid,
  expected_session_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  target_campaign_id uuid;
  saved_version integer;
BEGIN
  SELECT session_row.campaign_id INTO target_campaign_id
  FROM public.tabletop_sessions session_row
  WHERE session_row.id = target_session_id
    AND session_row.status = 'open'
    AND (SELECT private.can_co_manage_campaign(session_row.campaign_id));
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = target_scene_id
      AND scene.campaign_id = target_campaign_id
      AND scene.status = 'active'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SESSION_NOT_MANAGEABLE';
  END IF;

  UPDATE public.tabletop_sessions session_row
  SET current_scene_id = target_scene_id,
      updated_by = actor_id
  WHERE session_row.id = target_session_id
    AND session_row.version = expected_session_version
  RETURNING session_row.version INTO saved_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_SESSION_VERSION_CONFLICT';
  END IF;
  RETURN saved_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tabletop_session_lock(
  target_session_id uuid,
  locked boolean,
  expected_session_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  saved_version integer;
BEGIN
  UPDATE public.tabletop_sessions session_row
  SET join_locked = locked,
      updated_by = actor_id
  WHERE session_row.id = target_session_id
    AND session_row.status = 'open'
    AND session_row.version = expected_session_version
    AND (SELECT private.can_co_manage_campaign(session_row.campaign_id))
  RETURNING session_row.version INTO saved_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_SESSION_VERSION_CONFLICT';
  END IF;
  RETURN saved_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_tabletop_session_participant(
  target_session_id uuid,
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
BEGIN
  UPDATE public.tabletop_session_participants participant
  SET state = 'removed',
      left_at = clock_timestamp(),
      last_seen_at = clock_timestamp(),
      removed_by = actor_id
  FROM public.tabletop_sessions session_row
  WHERE participant.session_id = target_session_id
    AND participant.user_id = target_user_id
    AND participant.state = 'active'
    AND session_row.id = participant.session_id
    AND (SELECT private.can_co_manage_campaign(session_row.campaign_id));
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_PARTICIPANT_NOT_REMOVABLE';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_tabletop_session(
  target_session_id uuid,
  expected_session_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  saved_version integer;
BEGIN
  UPDATE public.tabletop_sessions session_row
  SET status = 'closed',
      join_locked = true,
      closed_by = actor_id,
      closed_at = clock_timestamp(),
      updated_by = actor_id
  WHERE session_row.id = target_session_id
    AND session_row.status = 'open'
    AND session_row.version = expected_session_version
    AND (SELECT private.can_co_manage_campaign(session_row.campaign_id))
  RETURNING session_row.version INTO saved_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_SESSION_VERSION_CONFLICT';
  END IF;

  UPDATE public.tabletop_session_participants participant
  SET state = 'left',
      left_at = clock_timestamp(),
      last_seen_at = clock_timestamp(),
      removed_by = NULL
  WHERE participant.session_id = target_session_id
    AND participant.state = 'active';
  RETURN saved_version;
END;
$$;

REVOKE ALL ON FUNCTION public.open_tabletop_session(uuid, uuid, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_tabletop_session(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.leave_tabletop_session(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.move_tabletop_session_scene(uuid, uuid, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_tabletop_session_lock(uuid, boolean, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_tabletop_session_participant(uuid, uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_tabletop_session(uuid, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.open_tabletop_session(uuid, uuid, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_tabletop_session(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_tabletop_session(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_tabletop_session_scene(uuid, uuid, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tabletop_session_lock(uuid, boolean, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_tabletop_session_participant(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_tabletop_session(uuid, integer)
  TO authenticated;

COMMENT ON TABLE public.tabletop_sessions IS
  'Persistent Mesa Nexus rooms. Live transport remains behind nexus_realtime_enabled.';
COMMENT ON TABLE public.tabletop_session_participants IS
  'Session-specific attendance derived from existing campaign membership; not a membership duplicate.';
