-- Mesa Nexus: persistent scenes, layers, entities, snapshots and minimal log.
-- Additive only. Realtime, computed lighting, fog and rules automation remain
-- independent and are not enabled by this migration.

CREATE TABLE public.tabletop_scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  background_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  width integer NOT NULL DEFAULT 2400 CHECK (width BETWEEN 64 AND 100000),
  height integer NOT NULL DEFAULT 1600 CHECK (height BETWEEN 64 AND 100000),
  grid_type text NOT NULL DEFAULT 'square' CHECK (grid_type IN ('square', 'none')),
  grid_size integer NOT NULL DEFAULT 64 CHECK (grid_size BETWEEN 8 AND 2048),
  grid_offset_x numeric NOT NULL DEFAULT 0 CHECK (abs(grid_offset_x) <= 100000),
  grid_offset_y numeric NOT NULL DEFAULT 0 CHECK (abs(grid_offset_y) <= 100000),
  grid_scale numeric NOT NULL DEFAULT 1 CHECK (grid_scale BETWEEN 0.01 AND 100),
  snap_enabled boolean NOT NULL DEFAULT true,
  global_illumination numeric NOT NULL DEFAULT 1 CHECK (global_illumination BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.tabletop_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.tabletop_scenes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  layer_type text NOT NULL CHECK (layer_type IN ('map', 'objects', 'tokens', 'drawings', 'master')),
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0),
  visible boolean NOT NULL DEFAULT true,
  locked boolean NOT NULL DEFAULT false,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (id, scene_id)
);

CREATE TABLE public.tabletop_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.tabletop_scenes(id) ON DELETE CASCADE,
  layer_id uuid NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN (
    'token', 'creature', 'npc', 'character', 'object', 'tile', 'drawing',
    'text', 'marker', 'note', 'area', 'light', 'handout_pin'
  )),
  name text NOT NULL DEFAULT '' CHECK (char_length(name) <= 240),
  linked_sheet_id uuid REFERENCES public.character_sheets(id) ON DELETE SET NULL,
  linked_knowledge_node_id uuid REFERENCES public.knowledge_nodes(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  x numeric NOT NULL DEFAULT 0 CHECK (abs(x) <= 1000000),
  y numeric NOT NULL DEFAULT 0 CHECK (abs(y) <= 1000000),
  width numeric NOT NULL DEFAULT 64 CHECK (width BETWEEN 1 AND 100000),
  height numeric NOT NULL DEFAULT 64 CHECK (height BETWEEN 1 AND 100000),
  rotation numeric NOT NULL DEFAULT 0 CHECK (abs(rotation) <= 360000),
  elevation numeric NOT NULL DEFAULT 0 CHECK (abs(elevation) <= 100000),
  z_index integer NOT NULL DEFAULT 0,
  hidden boolean NOT NULL DEFAULT false,
  locked boolean NOT NULL DEFAULT false,
  owner_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(properties) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT tabletop_entities_layer_scene_fkey
    FOREIGN KEY (layer_id, scene_id)
    REFERENCES public.tabletop_layers(id, scene_id)
    ON DELETE CASCADE
);

CREATE TABLE public.tabletop_scene_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid NOT NULL REFERENCES public.tabletop_scenes(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  scene_version integer NOT NULL CHECK (scene_version > 0),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.tabletop_scene_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  scene_id uuid NOT NULL REFERENCES public.tabletop_scenes(id) ON DELETE CASCADE,
  entity_id uuid REFERENCES public.tabletop_entities(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type ~ '^[a-z][a-z0-9_.-]{2,79}$'),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX tabletop_scenes_campaign_order_idx
  ON public.tabletop_scenes (campaign_id, status, order_index, created_at);
CREATE INDEX tabletop_scenes_background_asset_idx
  ON public.tabletop_scenes (background_asset_id) WHERE background_asset_id IS NOT NULL;
CREATE INDEX tabletop_scenes_created_by_idx ON public.tabletop_scenes (created_by);
CREATE INDEX tabletop_scenes_updated_by_idx ON public.tabletop_scenes (updated_by);
CREATE INDEX tabletop_layers_scene_order_idx ON public.tabletop_layers (scene_id, order_index);
CREATE INDEX tabletop_layers_created_by_idx ON public.tabletop_layers (created_by);
CREATE INDEX tabletop_layers_updated_by_idx ON public.tabletop_layers (updated_by);
CREATE INDEX tabletop_entities_scene_order_idx
  ON public.tabletop_entities (scene_id, layer_id, z_index);
CREATE INDEX tabletop_entities_layer_idx ON public.tabletop_entities (layer_id);
CREATE INDEX tabletop_entities_asset_idx
  ON public.tabletop_entities (asset_id) WHERE asset_id IS NOT NULL;
CREATE INDEX tabletop_entities_owner_idx
  ON public.tabletop_entities (owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE INDEX tabletop_entities_sheet_idx
  ON public.tabletop_entities (linked_sheet_id) WHERE linked_sheet_id IS NOT NULL;
CREATE INDEX tabletop_entities_knowledge_idx
  ON public.tabletop_entities (linked_knowledge_node_id) WHERE linked_knowledge_node_id IS NOT NULL;
CREATE INDEX tabletop_entities_created_by_idx ON public.tabletop_entities (created_by);
CREATE INDEX tabletop_entities_updated_by_idx ON public.tabletop_entities (updated_by);
CREATE INDEX tabletop_snapshots_scene_created_idx
  ON public.tabletop_scene_snapshots (scene_id, created_at DESC);
CREATE INDEX tabletop_snapshots_created_by_idx ON public.tabletop_scene_snapshots (created_by);
CREATE INDEX tabletop_events_scene_created_idx
  ON public.tabletop_scene_events (scene_id, created_at DESC);
CREATE INDEX tabletop_events_entity_idx
  ON public.tabletop_scene_events (entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX tabletop_events_created_by_idx ON public.tabletop_scene_events (created_by);

ALTER TABLE public.tabletop_scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabletop_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabletop_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabletop_scene_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabletop_scene_events ENABLE ROW LEVEL SECURITY;

-- Command 10 is a manager editor. Players must never query raw entity properties;
-- the Realtime phase will expose a dedicated recipient-filtered projection.
CREATE POLICY "Tabletop scenes: campaign managers read"
  ON public.tabletop_scenes FOR SELECT TO authenticated
  USING ((SELECT private.can_co_manage_campaign(campaign_id)));
CREATE POLICY "Tabletop scenes: campaign managers insert"
  ON public.tabletop_scenes FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND (SELECT private.can_co_manage_campaign(campaign_id))
  );
CREATE POLICY "Tabletop scenes: campaign managers update"
  ON public.tabletop_scenes FOR UPDATE TO authenticated
  USING ((SELECT private.can_co_manage_campaign(campaign_id)))
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND (SELECT private.can_co_manage_campaign(campaign_id))
  );
CREATE POLICY "Tabletop scenes: campaign managers delete"
  ON public.tabletop_scenes FOR DELETE TO authenticated
  USING ((SELECT private.can_co_manage_campaign(campaign_id)));

CREATE POLICY "Tabletop layers: campaign managers read"
  ON public.tabletop_layers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_layers.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));
CREATE POLICY "Tabletop layers: campaign managers insert"
  ON public.tabletop_layers FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_layers.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );
CREATE POLICY "Tabletop layers: campaign managers update"
  ON public.tabletop_layers FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_layers.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ))
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_layers.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );
CREATE POLICY "Tabletop layers: campaign managers delete"
  ON public.tabletop_layers FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_layers.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));

CREATE POLICY "Tabletop entities: campaign managers read"
  ON public.tabletop_entities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_entities.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));
CREATE POLICY "Tabletop entities: campaign managers insert"
  ON public.tabletop_entities FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_entities.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );
CREATE POLICY "Tabletop entities: campaign managers update"
  ON public.tabletop_entities FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_entities.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ))
  WITH CHECK (
    updated_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_entities.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );
CREATE POLICY "Tabletop entities: campaign managers delete"
  ON public.tabletop_entities FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_entities.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));

CREATE POLICY "Tabletop snapshots: campaign managers read"
  ON public.tabletop_scene_snapshots FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_scene_snapshots.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));
CREATE POLICY "Tabletop snapshots: campaign managers insert"
  ON public.tabletop_scene_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_scene_snapshots.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );
CREATE POLICY "Tabletop snapshots: campaign managers delete"
  ON public.tabletop_scene_snapshots FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_scene_snapshots.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));

CREATE POLICY "Tabletop events: campaign managers read"
  ON public.tabletop_scene_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tabletop_scenes scene
    WHERE scene.id = tabletop_scene_events.scene_id
      AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  ));
CREATE POLICY "Tabletop events: campaign managers insert"
  ON public.tabletop_scene_events FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.tabletop_scenes scene
      WHERE scene.id = tabletop_scene_events.scene_id
        AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
    )
  );

REVOKE ALL ON TABLE
  public.tabletop_scenes,
  public.tabletop_layers,
  public.tabletop_entities,
  public.tabletop_scene_snapshots,
  public.tabletop_scene_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, DELETE ON TABLE
  public.tabletop_scenes,
  public.tabletop_layers,
  public.tabletop_entities
TO authenticated;
GRANT UPDATE (
  name, background_asset_id, width, height, grid_type, grid_size,
  grid_offset_x, grid_offset_y, grid_scale, snap_enabled,
  global_illumination, status, order_index, updated_by
) ON public.tabletop_scenes TO authenticated;
GRANT UPDATE (name, layer_type, order_index, visible, locked, updated_by)
  ON public.tabletop_layers TO authenticated;
GRANT UPDATE (
  layer_id, entity_type, name, linked_sheet_id, linked_knowledge_node_id,
  asset_id, x, y, width, height, rotation, elevation, z_index, hidden,
  locked, owner_user_id, properties, updated_by
) ON public.tabletop_entities TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.tabletop_scene_snapshots TO authenticated;
GRANT SELECT, INSERT ON public.tabletop_scene_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.tabletop_scene_events_id_seq TO authenticated;

CREATE OR REPLACE FUNCTION public.tabletop_bump_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.version := OLD.version + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tabletop_bump_version() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER tabletop_scenes_bump_version
  BEFORE UPDATE ON public.tabletop_scenes
  FOR EACH ROW EXECUTE FUNCTION public.tabletop_bump_version();
CREATE TRIGGER tabletop_layers_bump_version
  BEFORE UPDATE ON public.tabletop_layers
  FOR EACH ROW EXECUTE FUNCTION public.tabletop_bump_version();
CREATE TRIGGER tabletop_entities_bump_version
  BEFORE UPDATE ON public.tabletop_entities
  FOR EACH ROW EXECUTE FUNCTION public.tabletop_bump_version();

CREATE OR REPLACE FUNCTION public.tabletop_create_default_layers()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.tabletop_skip_default_layers', true) = '1' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.tabletop_layers (
    scene_id, name, layer_type, order_index, visible, locked, created_by, updated_by
  ) VALUES
    (NEW.id, 'Mapa', 'map', 0, true, true, NEW.created_by, NEW.created_by),
    (NEW.id, 'Objetos', 'objects', 1, true, false, NEW.created_by, NEW.created_by),
    (NEW.id, 'Tokens', 'tokens', 2, true, false, NEW.created_by, NEW.created_by),
    (NEW.id, 'Desenhos', 'drawings', 3, true, false, NEW.created_by, NEW.created_by),
    (NEW.id, 'Mestre', 'master', 4, true, false, NEW.created_by, NEW.created_by);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tabletop_create_default_layers()
  FROM PUBLIC, anon, authenticated;
CREATE TRIGGER tabletop_scenes_default_layers
  AFTER INSERT ON public.tabletop_scenes
  FOR EACH ROW EXECUTE FUNCTION public.tabletop_create_default_layers();

CREATE OR REPLACE FUNCTION public.create_tabletop_scene_snapshot(
  target_scene_id uuid,
  snapshot_name text DEFAULT 'Snapshot manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  result_id uuid;
  current_version integer;
  document jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF char_length(btrim(snapshot_name)) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SNAPSHOT_NAME';
  END IF;

  SELECT scene.version,
         jsonb_build_object(
           'schema_version', 1,
           'scene', to_jsonb(scene),
           'layers', COALESCE((
             SELECT jsonb_agg(to_jsonb(layer) ORDER BY layer.order_index, layer.id)
             FROM public.tabletop_layers layer
             WHERE layer.scene_id = scene.id
           ), '[]'::jsonb),
           'entities', COALESCE((
             SELECT jsonb_agg(to_jsonb(entity) ORDER BY entity.z_index, entity.id)
             FROM public.tabletop_entities entity
             WHERE entity.scene_id = scene.id
           ), '[]'::jsonb)
         )
    INTO current_version, document
  FROM public.tabletop_scenes scene
  WHERE scene.id = target_scene_id
    AND (SELECT private.can_co_manage_campaign(scene.campaign_id));

  IF document IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  END IF;

  INSERT INTO public.tabletop_scene_snapshots (
    scene_id, name, scene_version, snapshot, created_by
  ) VALUES (
    target_scene_id, btrim(snapshot_name), current_version, document, actor_id
  ) RETURNING id INTO result_id;

  INSERT INTO public.tabletop_scene_events (scene_id, event_type, payload, created_by)
  VALUES (
    target_scene_id,
    'snapshot.created',
    jsonb_build_object('snapshot_id', result_id, 'scene_version', current_version),
    actor_id
  );
  RETURN result_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.duplicate_tabletop_scene(
  source_scene_id uuid,
  duplicate_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  source_scene public.tabletop_scenes%ROWTYPE;
  source_layer public.tabletop_layers%ROWTYPE;
  new_scene_id uuid;
  new_layer_id uuid;
  final_name text;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;

  SELECT * INTO source_scene
  FROM public.tabletop_scenes scene
  WHERE scene.id = source_scene_id
    AND (SELECT private.can_co_manage_campaign(scene.campaign_id));
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  END IF;

  final_name := COALESCE(NULLIF(btrim(duplicate_name), ''), source_scene.name || ' · cópia');
  IF char_length(final_name) > 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SCENE_NAME';
  END IF;

  PERFORM set_config('app.tabletop_skip_default_layers', '1', true);
  INSERT INTO public.tabletop_scenes (
    campaign_id, name, background_asset_id, width, height, grid_type,
    grid_size, grid_offset_x, grid_offset_y, grid_scale, snap_enabled,
    global_illumination, status, order_index, created_by, updated_by
  ) VALUES (
    source_scene.campaign_id, final_name, source_scene.background_asset_id,
    source_scene.width, source_scene.height, source_scene.grid_type,
    source_scene.grid_size, source_scene.grid_offset_x, source_scene.grid_offset_y,
    source_scene.grid_scale, source_scene.snap_enabled, source_scene.global_illumination,
    'draft', source_scene.order_index + 1, actor_id, actor_id
  ) RETURNING id INTO new_scene_id;

  FOR source_layer IN
    SELECT * FROM public.tabletop_layers
    WHERE scene_id = source_scene_id
    ORDER BY order_index, id
  LOOP
    INSERT INTO public.tabletop_layers (
      scene_id, name, layer_type, order_index, visible, locked, created_by, updated_by
    ) VALUES (
      new_scene_id, source_layer.name, source_layer.layer_type, source_layer.order_index,
      source_layer.visible, source_layer.locked, actor_id, actor_id
    ) RETURNING id INTO new_layer_id;

    INSERT INTO public.tabletop_entities (
      scene_id, layer_id, entity_type, name, linked_sheet_id,
      linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
      elevation, z_index, hidden, locked, owner_user_id, properties,
      created_by, updated_by
    )
    SELECT
      new_scene_id, new_layer_id, entity.entity_type, entity.name,
      entity.linked_sheet_id, entity.linked_knowledge_node_id, entity.asset_id,
      entity.x, entity.y, entity.width, entity.height, entity.rotation,
      entity.elevation, entity.z_index, entity.hidden, entity.locked,
      entity.owner_user_id, entity.properties, actor_id, actor_id
    FROM public.tabletop_entities entity
    WHERE entity.scene_id = source_scene_id
      AND entity.layer_id = source_layer.id;
  END LOOP;

  INSERT INTO public.tabletop_scene_events (scene_id, event_type, payload, created_by)
  VALUES (
    new_scene_id,
    'scene.duplicated',
    jsonb_build_object('source_scene_id', source_scene_id),
    actor_id
  );
  RETURN new_scene_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_tabletop_scene_snapshot(
  target_snapshot_id uuid,
  expected_scene_version integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  stored public.tabletop_scene_snapshots%ROWTYPE;
  current_version integer;
  restored_version integer;
  layer_document jsonb;
  entity_document jsonb;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;

  SELECT * INTO stored
  FROM public.tabletop_scene_snapshots snapshot_row
  WHERE snapshot_row.id = target_snapshot_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SNAPSHOT_NOT_MANAGEABLE';
  END IF;

  SELECT scene.version INTO current_version
  FROM public.tabletop_scenes scene
  WHERE scene.id = stored.scene_id
    AND (SELECT private.can_co_manage_campaign(scene.campaign_id))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_SCENE_NOT_MANAGEABLE';
  END IF;
  IF current_version <> expected_scene_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = 'TABLETOP_VERSION_CONFLICT',
      DETAIL = format('expected=%s actual=%s', expected_scene_version, current_version);
  END IF;

  PERFORM public.create_tabletop_scene_snapshot(
    stored.scene_id,
    'Antes de restaurar · ' || to_char(clock_timestamp(), 'YYYY-MM-DD HH24:MI:SS')
  );

  UPDATE public.tabletop_scenes
  SET name = stored.snapshot #>> '{scene,name}',
      background_asset_id = NULLIF(stored.snapshot #>> '{scene,background_asset_id}', '')::uuid,
      width = (stored.snapshot #>> '{scene,width}')::integer,
      height = (stored.snapshot #>> '{scene,height}')::integer,
      grid_type = stored.snapshot #>> '{scene,grid_type}',
      grid_size = (stored.snapshot #>> '{scene,grid_size}')::integer,
      grid_offset_x = (stored.snapshot #>> '{scene,grid_offset_x}')::numeric,
      grid_offset_y = (stored.snapshot #>> '{scene,grid_offset_y}')::numeric,
      grid_scale = (stored.snapshot #>> '{scene,grid_scale}')::numeric,
      snap_enabled = (stored.snapshot #>> '{scene,snap_enabled}')::boolean,
      global_illumination = (stored.snapshot #>> '{scene,global_illumination}')::numeric,
      status = stored.snapshot #>> '{scene,status}',
      order_index = (stored.snapshot #>> '{scene,order_index}')::integer,
      updated_by = actor_id
  WHERE id = stored.scene_id AND version = expected_scene_version
  RETURNING version INTO restored_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_VERSION_CONFLICT';
  END IF;

  DELETE FROM public.tabletop_entities WHERE scene_id = stored.scene_id;
  DELETE FROM public.tabletop_layers WHERE scene_id = stored.scene_id;

  FOR layer_document IN
    SELECT value FROM jsonb_array_elements(stored.snapshot -> 'layers')
  LOOP
    INSERT INTO public.tabletop_layers (
      id, scene_id, name, layer_type, order_index, visible, locked, version,
      created_by, updated_by, created_at, updated_at
    ) VALUES (
      (layer_document ->> 'id')::uuid, stored.scene_id,
      layer_document ->> 'name', layer_document ->> 'layer_type',
      (layer_document ->> 'order_index')::integer,
      (layer_document ->> 'visible')::boolean,
      (layer_document ->> 'locked')::boolean,
      greatest((layer_document ->> 'version')::integer, 1),
      actor_id, actor_id,
      (layer_document ->> 'created_at')::timestamptz,
      clock_timestamp()
    );
  END LOOP;

  FOR entity_document IN
    SELECT value FROM jsonb_array_elements(stored.snapshot -> 'entities')
  LOOP
    INSERT INTO public.tabletop_entities (
      id, scene_id, layer_id, entity_type, name, linked_sheet_id,
      linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
      elevation, z_index, hidden, locked, owner_user_id, properties, version,
      created_by, updated_by, created_at, updated_at
    ) VALUES (
      (entity_document ->> 'id')::uuid, stored.scene_id,
      (entity_document ->> 'layer_id')::uuid,
      entity_document ->> 'entity_type', entity_document ->> 'name',
      NULLIF(entity_document ->> 'linked_sheet_id', '')::uuid,
      NULLIF(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
      NULLIF(entity_document ->> 'asset_id', '')::uuid,
      (entity_document ->> 'x')::numeric, (entity_document ->> 'y')::numeric,
      (entity_document ->> 'width')::numeric, (entity_document ->> 'height')::numeric,
      (entity_document ->> 'rotation')::numeric,
      (entity_document ->> 'elevation')::numeric,
      (entity_document ->> 'z_index')::integer,
      (entity_document ->> 'hidden')::boolean,
      (entity_document ->> 'locked')::boolean,
      NULLIF(entity_document ->> 'owner_user_id', '')::uuid,
      entity_document -> 'properties',
      greatest((entity_document ->> 'version')::integer, 1),
      actor_id, actor_id,
      (entity_document ->> 'created_at')::timestamptz,
      clock_timestamp()
    );
  END LOOP;

  INSERT INTO public.tabletop_scene_events (scene_id, event_type, payload, created_by)
  VALUES (
    stored.scene_id,
    'snapshot.restored',
    jsonb_build_object(
      'snapshot_id', target_snapshot_id,
      'previous_version', current_version,
      'restored_version', restored_version
    ),
    actor_id
  );
  RETURN restored_version;
END;
$$;

REVOKE ALL ON FUNCTION public.create_tabletop_scene_snapshot(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.duplicate_tabletop_scene(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_tabletop_scene_snapshot(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tabletop_scene_snapshot(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_tabletop_scene(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_tabletop_scene_snapshot(uuid, integer) TO authenticated;

COMMENT ON TABLE public.tabletop_scenes IS
  'Persistent Mesa Nexus scenes. Realtime and computed lighting are independent.';
COMMENT ON TABLE public.tabletop_entities IS
  'Persistent entities with optimistic versioning and explicit sheet/page/asset links.';
COMMENT ON TABLE public.tabletop_scene_snapshots IS
  'Immutable manual snapshots. Restore first creates a recovery snapshot.';
