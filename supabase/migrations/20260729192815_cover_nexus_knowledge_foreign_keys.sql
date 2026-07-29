-- Cover every O Nexus foreign key reported by the Supabase Database Advisor.
-- Additive only: no rows, constraints, grants, policies or RLS settings change.

CREATE INDEX IF NOT EXISTS knowledge_aliases_campaign_workspace_fk_idx
  ON public.knowledge_aliases (campaign_id, workspace_id);
CREATE INDEX IF NOT EXISTS knowledge_aliases_created_by_idx
  ON public.knowledge_aliases (created_by);

CREATE INDEX IF NOT EXISTS knowledge_assets_created_by_idx
  ON public.knowledge_assets (created_by);

CREATE INDEX IF NOT EXISTS knowledge_edges_created_by_idx
  ON public.knowledge_edges (created_by);
CREATE INDEX IF NOT EXISTS knowledge_edges_workspace_id_idx
  ON public.knowledge_edges (workspace_id);

CREATE INDEX IF NOT EXISTS knowledge_favorites_node_id_idx
  ON public.knowledge_favorites (node_id);

CREATE INDEX IF NOT EXISTS knowledge_node_acl_created_by_idx
  ON public.knowledge_node_acl (created_by);

CREATE INDEX IF NOT EXISTS knowledge_node_tags_created_by_idx
  ON public.knowledge_node_tags (created_by);

CREATE INDEX IF NOT EXISTS knowledge_nodes_campaign_workspace_fk_idx
  ON public.knowledge_nodes (campaign_id, workspace_id);
CREATE INDEX IF NOT EXISTS knowledge_nodes_cover_asset_id_idx
  ON public.knowledge_nodes (cover_asset_id);
CREATE INDEX IF NOT EXISTS knowledge_nodes_created_by_idx
  ON public.knowledge_nodes (created_by);
CREATE INDEX IF NOT EXISTS knowledge_nodes_updated_by_idx
  ON public.knowledge_nodes (updated_by);

CREATE INDEX IF NOT EXISTS knowledge_recent_node_id_idx
  ON public.knowledge_recent (node_id);

CREATE INDEX IF NOT EXISTS knowledge_tags_created_by_idx
  ON public.knowledge_tags (created_by);

CREATE INDEX IF NOT EXISTS knowledge_templates_created_by_idx
  ON public.knowledge_templates (created_by);

CREATE INDEX IF NOT EXISTS knowledge_versions_created_by_idx
  ON public.knowledge_versions (created_by);

CREATE INDEX IF NOT EXISTS knowledge_workspace_settings_updated_by_idx
  ON public.knowledge_workspace_settings (updated_by);
