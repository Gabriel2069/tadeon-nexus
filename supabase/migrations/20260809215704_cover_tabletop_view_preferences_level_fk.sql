-- Cover the composite floor preference FK for deletes and integrity checks.

CREATE INDEX IF NOT EXISTS tabletop_view_preferences_level_idx
  ON public.tabletop_view_preferences(scene_id, active_level_id);
