-- Mesa Nexus: private per-user viewport persistence.
-- Camera navigation never bumps or conflicts with the shared scene version.

CREATE TABLE public.tabletop_view_preferences (
  scene_id uuid NOT NULL REFERENCES public.tabletop_scenes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  projection text NOT NULL DEFAULT 'plan'
    CHECK (projection IN ('plan', 'isometric')),
  camera_x numeric NOT NULL DEFAULT 0 CHECK (abs(camera_x) <= 1000000),
  camera_y numeric NOT NULL DEFAULT 0 CHECK (abs(camera_y) <= 1000000),
  zoom numeric NOT NULL DEFAULT 1 CHECK (zoom BETWEEN 0.15 AND 4),
  yaw numeric NOT NULL DEFAULT 45 CHECK (yaw >= 0 AND yaw < 360),
  tilt numeric NOT NULL DEFAULT 0.5 CHECK (tilt BETWEEN 0.18 AND 0.9),
  elevation_scale numeric NOT NULL DEFAULT 1
    CHECK (elevation_scale BETWEEN 0.25 AND 2.5),
  active_level_id uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (scene_id, user_id)
);

CREATE INDEX tabletop_view_preferences_user_idx
  ON public.tabletop_view_preferences(user_id);

ALTER TABLE public.tabletop_view_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.tabletop_view_preferences
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tabletop_view_preferences
  TO authenticated;

CREATE POLICY "Tabletop view preferences: owner managers read"
ON public.tabletop_view_preferences FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_view_preferences.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  )
);

CREATE POLICY "Tabletop view preferences: owner managers insert"
ON public.tabletop_view_preferences FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_view_preferences.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  )
);

CREATE POLICY "Tabletop view preferences: owner managers update"
ON public.tabletop_view_preferences FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_view_preferences.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_view_preferences.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  )
);

CREATE POLICY "Tabletop view preferences: owner managers delete"
ON public.tabletop_view_preferences FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_view_preferences.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  )
);

COMMENT ON TABLE public.tabletop_view_preferences IS
  'Private camera and orbital orientation per manager and scene; isolated from shared scene optimistic versioning.';
