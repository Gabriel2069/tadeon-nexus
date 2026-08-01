-- Cover the three foreign keys introduced by the structured knowledge libraries.

CREATE INDEX IF NOT EXISTS knowledge_campaign_links_created_by_idx
  ON public.knowledge_campaign_links (created_by);

CREATE INDEX IF NOT EXISTS knowledge_sheet_links_created_by_idx
  ON public.knowledge_sheet_links (created_by);

CREATE INDEX IF NOT EXISTS knowledge_templates_updated_by_idx
  ON public.knowledge_templates (updated_by);
