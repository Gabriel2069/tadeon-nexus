-- Cover the two composite campaign/workspace foreign keys reported by the
-- Supabase Database Advisor after the Nexus Assets foundation migration.

CREATE INDEX IF NOT EXISTS assets_campaign_workspace_fk_idx
  ON public.assets (campaign_id, workspace_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS asset_upload_sessions_campaign_workspace_fk_idx
  ON public.asset_upload_sessions (campaign_id, workspace_id)
  WHERE campaign_id IS NOT NULL;
