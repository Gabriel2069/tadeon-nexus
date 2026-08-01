-- O Nexus: structured libraries, editable templates and reversible links.
-- Additive only. Existing pages and character sheets are never rewritten.

ALTER TABLE public.knowledge_templates
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS required_fields text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS suggested_relations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT;

UPDATE public.knowledge_templates
SET updated_by = created_by
WHERE updated_by IS NULL;

ALTER TABLE public.knowledge_templates
  ALTER COLUMN updated_by SET NOT NULL;

ALTER TABLE public.knowledge_templates
  DROP CONSTRAINT IF EXISTS knowledge_templates_suggested_relations_array;

ALTER TABLE public.knowledge_templates
  ADD CONSTRAINT knowledge_templates_suggested_relations_array
  CHECK (jsonb_typeof(suggested_relations) = 'array');

CREATE UNIQUE INDEX IF NOT EXISTS knowledge_templates_active_name_key
  ON public.knowledge_templates (workspace_id, lower(name))
  WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS knowledge_templates_set_updated_at
  ON public.knowledge_templates;

CREATE TRIGGER knowledge_templates_set_updated_at
  BEFORE UPDATE ON public.knowledge_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS knowledge_templates_insert
  ON public.knowledge_templates;

CREATE POLICY knowledge_templates_insert
  ON public.knowledge_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND private.can_manage_workspace(workspace_id)
  );

DROP POLICY IF EXISTS knowledge_templates_update
  ON public.knowledge_templates;

CREATE POLICY knowledge_templates_update
  ON public.knowledge_templates
  FOR UPDATE
  TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_workspace(workspace_id)
  )
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND updated_by = (SELECT auth.uid())
    AND private.can_manage_workspace(workspace_id)
  );

REVOKE ALL ON TABLE public.knowledge_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.knowledge_templates
  TO authenticated;
GRANT ALL
  ON TABLE public.knowledge_templates
  TO service_role;

CREATE TABLE IF NOT EXISTS public.knowledge_campaign_links (
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL
    REFERENCES public.campaigns(id) ON DELETE CASCADE,
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (node_id, campaign_id)
);

COMMENT ON TABLE public.knowledge_campaign_links IS
  'Reversible many-to-many campaign references. Linking never moves or duplicates the source knowledge page.';

CREATE INDEX IF NOT EXISTS knowledge_campaign_links_campaign_idx
  ON public.knowledge_campaign_links (campaign_id, created_at DESC);

ALTER TABLE public.knowledge_campaign_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_campaign_links_select
  ON public.knowledge_campaign_links
  FOR SELECT
  TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_read_knowledge_node(node_id)
    AND private.can_access_campaign(campaign_id)
  );

CREATE POLICY knowledge_campaign_links_insert
  ON public.knowledge_campaign_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND created_by = (SELECT auth.uid())
    AND private.can_manage_knowledge_node(node_id)
    AND private.can_co_manage_campaign(campaign_id)
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_nodes node
      JOIN public.campaigns campaign
        ON campaign.workspace_id = node.workspace_id
      WHERE node.id = node_id
        AND campaign.id = campaign_id
        AND node.deleted_at IS NULL
    )
  );

CREATE POLICY knowledge_campaign_links_delete
  ON public.knowledge_campaign_links
  FOR DELETE
  TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_knowledge_node(node_id)
    AND private.can_co_manage_campaign(campaign_id)
  );

REVOKE ALL ON TABLE public.knowledge_campaign_links FROM anon;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.knowledge_campaign_links
  TO authenticated;
GRANT ALL
  ON TABLE public.knowledge_campaign_links
  TO service_role;

CREATE TABLE IF NOT EXISTS public.knowledge_sheet_links (
  node_id uuid NOT NULL
    REFERENCES public.knowledge_nodes(id) ON DELETE CASCADE,
  sheet_id uuid NOT NULL
    REFERENCES public.character_sheets(id) ON DELETE CASCADE,
  target_slot text NOT NULL DEFAULT 'reference'
    CHECK (target_slot IN (
      'reference',
      'plot',
      'ability',
      'fragment',
      'weapon',
      'inventory',
      'note'
    )),
  created_by uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (node_id, sheet_id, target_slot)
);

COMMENT ON TABLE public.knowledge_sheet_links IS
  'Reversible provenance links from a library page to a character sheet. Source content remains in O Nexus.';

CREATE INDEX IF NOT EXISTS knowledge_sheet_links_sheet_idx
  ON public.knowledge_sheet_links (sheet_id, created_at DESC);

ALTER TABLE public.knowledge_sheet_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY knowledge_sheet_links_select
  ON public.knowledge_sheet_links
  FOR SELECT
  TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_read_knowledge_node(node_id)
    AND EXISTS (
      SELECT 1
      FROM public.character_sheets sheet
      WHERE sheet.id = sheet_id
    )
  );

CREATE POLICY knowledge_sheet_links_insert
  ON public.knowledge_sheet_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND created_by = (SELECT auth.uid())
    AND private.can_manage_knowledge_node(node_id)
    AND EXISTS (
      SELECT 1
      FROM public.knowledge_nodes node
      JOIN public.character_sheets sheet
        ON sheet.id = sheet_id
      JOIN public.campaigns campaign
        ON campaign.id = sheet.campaign_id
       AND campaign.workspace_id = node.workspace_id
      WHERE node.id = node_id
        AND node.deleted_at IS NULL
    )
  );

CREATE POLICY knowledge_sheet_links_delete
  ON public.knowledge_sheet_links
  FOR DELETE
  TO authenticated
  USING (
    private.is_feature_enabled('nexus_knowledge_enabled')
    AND private.can_manage_knowledge_node(node_id)
    AND EXISTS (
      SELECT 1
      FROM public.character_sheets sheet
      WHERE sheet.id = sheet_id
    )
  );

REVOKE ALL ON TABLE public.knowledge_sheet_links FROM anon;
GRANT SELECT, INSERT, DELETE
  ON TABLE public.knowledge_sheet_links
  TO authenticated;
GRANT ALL
  ON TABLE public.knowledge_sheet_links
  TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_default_knowledge_templates(
  p_workspace_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  inserted_count integer := 0;
BEGIN
  IF current_user_id IS NULL
    OR NOT private.is_feature_enabled('nexus_knowledge_enabled')
    OR NOT private.can_manage_workspace(p_workspace_id)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'KNOWLEDGE_TEMPLATE_PERMISSION_DENIED';
  END IF;

  INSERT INTO public.knowledge_templates (
    workspace_id,
    node_type,
    name,
    description,
    icon,
    default_content,
    default_properties,
    required_fields,
    suggested_relations,
    is_default,
    created_by,
    updated_by
  )
  SELECT
    p_workspace_id,
    template.node_type,
    template.name,
    template.description,
    template.icon,
    template.default_content,
    template.default_properties,
    template.required_fields,
    template.suggested_relations,
    true,
    current_user_id,
    current_user_id
  FROM (
    VALUES
      (
        'plot'::public.knowledge_node_type,
        'Trama',
        'Linha narrativa com estado, etapas, envolvidos e revelações.',
        'route',
        E'# {{title}}\n\n## Premissa\n\n## Etapas\n\n## Envolvidos\n\n## Pistas e revelações\n',
        '{"status":"planejada","prioridade":"normal"}'::jsonb,
        ARRAY['status']::text[],
        '[{"relation_type":"reveals","label":"revela"}]'::jsonb
      ),
      (
        'transcendental_ability'::public.knowledge_node_type,
        'Habilidade transcendental',
        'Referência de habilidade sem impor campos de outros tipos.',
        'sparkles',
        E'# {{title}}\n\n## Efeito\n\n## Limites\n\n## Manifestações\n',
        '{"tier":1}'::jsonb,
        ARRAY['tier']::text[],
        '[]'::jsonb
      ),
      (
        'fragment'::public.knowledge_node_type,
        'Fragmento',
        'Origem, influência e manifestações de um Fragmento.',
        'gem',
        E'# {{title}}\n\n## Origem\n\n## Influência\n\n## Portadores\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"custom","label":"influencia"}]'::jsonb
      ),
      (
        'weapon'::public.knowledge_node_type,
        'Arma',
        'Arma, procedência cultural e propriedades narrativas.',
        'swords',
        E'# {{title}}\n\n## Descrição\n\n## Procedência\n\n## Propriedades\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"part_of","label":"pertence a"}]'::jsonb
      ),
      (
        'creature'::public.knowledge_node_type,
        'Criatura',
        'Criatura, habitat, comportamento e sinais.',
        'paw-print',
        E'# {{title}}\n\n## Aparência\n\n## Habitat\n\n## Comportamento\n\n## Sinais\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"located_in","label":"habita"}]'::jsonb
      ),
      (
        'npc'::public.knowledge_node_type,
        'NPC',
        'Pessoa do mundo, vínculos, objetivos e segredos.',
        'user-round',
        E'# {{title}}\n\n## Aparência\n\n## Objetivos\n\n## Vínculos\n\n## Segredos do mestre\n',
        '{"status":"ativo"}'::jsonb,
        ARRAY['status']::text[],
        '[{"relation_type":"located_in","label":"encontra-se em"}]'::jsonb
      ),
      (
        'character'::public.knowledge_node_type,
        'Personagem',
        'Personagem conectado a locais, eventos e fichas.',
        'contact',
        E'# {{title}}\n\n## História\n\n## Objetivos\n\n## Relações\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"located_in","label":"nasceu em"}]'::jsonb
      ),
      (
        'object'::public.knowledge_node_type,
        'Objeto',
        'Objeto relevante, origem, uso e localização.',
        'package',
        E'# {{title}}\n\n## Descrição\n\n## Origem\n\n## Uso\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"owns","label":"pertence a"}]'::jsonb
      ),
      (
        'culture'::public.knowledge_node_type,
        'Cultura',
        'Costumes, símbolos, território e relações culturais.',
        'landmark',
        E'# {{title}}\n\n## Visão geral\n\n## Costumes\n\n## Símbolos\n\n## Território\n',
        '{}'::jsonb,
        '{}'::text[],
        '[]'::jsonb
      ),
      (
        'location'::public.knowledge_node_type,
        'Local',
        'Local, região, atmosfera, habitantes e ganchos.',
        'map-pin',
        E'# {{title}}\n\n## Visão geral\n\n## Atmosfera\n\n## Habitantes\n\n## Ganchos\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"located_in","label":"localiza-se em"}]'::jsonb
      ),
      (
        'map'::public.knowledge_node_type,
        'Mapa',
        'Mapa com escala, área representada e notas de uso.',
        'map',
        E'# {{title}}\n\n## Área representada\n\n## Escala\n\n## Notas\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"related_to","label":"representa"}]'::jsonb
      ),
      (
        'document'::public.knowledge_node_type,
        'Documento',
        'Documento, autoria, data, procedência e conteúdo.',
        'file-text',
        E'# {{title}}\n\n## Procedência\n\n## Conteúdo\n\n## Notas do mestre\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"created_by","label":"escrito por"}]'::jsonb
      ),
      (
        'historical_event'::public.knowledge_node_type,
        'Evento',
        'Evento, período, participantes, local e consequências.',
        'calendar-days',
        E'# {{title}}\n\n## Contexto\n\n## Acontecimentos\n\n## Participantes\n\n## Consequências\n',
        '{}'::jsonb,
        '{}'::text[],
        '[{"relation_type":"located_in","label":"ocorreu em"}]'::jsonb
      ),
      (
        'clue'::public.knowledge_node_type,
        'Pista',
        'Pista, modo de descoberta, interpretação e trama.',
        'search-check',
        E'# {{title}}\n\n## Evidência\n\n## Descoberta\n\n## Interpretação\n\n## Revelação\n',
        '{"status":"oculta"}'::jsonb,
        ARRAY['status']::text[],
        '[{"relation_type":"reveals","label":"revela"}]'::jsonb
      )
  ) AS template(
    node_type,
    name,
    description,
    icon,
    default_content,
    default_properties,
    required_fields,
    suggested_relations
  )
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_default_knowledge_templates(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_knowledge_templates(uuid)
  TO authenticated;

COMMENT ON FUNCTION public.ensure_default_knowledge_templates(uuid) IS
  'Idempotently installs editable starter templates for workspace administrators under existing RLS.';

NOTIFY pgrst, 'reload schema';
