-- Cover the composite entity-to-layer foreign key in constraint column order.
-- The existing layer-only index is retained until real workload evidence justifies removal.

CREATE INDEX IF NOT EXISTS tabletop_entities_layer_scene_fk_idx
  ON public.tabletop_entities (layer_id, scene_id);
