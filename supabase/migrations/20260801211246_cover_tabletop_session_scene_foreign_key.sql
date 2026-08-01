-- Cover the composite current-scene/campaign foreign key in its declared order.
CREATE INDEX tabletop_sessions_scene_campaign_idx
  ON public.tabletop_sessions (current_scene_id, campaign_id)
  WHERE current_scene_id IS NOT NULL;

DROP INDEX public.tabletop_sessions_scene_idx;
