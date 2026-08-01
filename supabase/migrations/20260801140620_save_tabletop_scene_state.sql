-- Mesa Nexus: atomically persist the editable state of one scene.
-- The function remains SECURITY INVOKER so every row operation continues to
-- honor the existing manager-only RLS policies and column grants.

CREATE OR REPLACE FUNCTION public.save_tabletop_scene_state(
  target_scene_id uuid,
  expected_scene_version integer,
  scene_document jsonb,
  layer_documents jsonb DEFAULT '[]'::jsonb,
  entity_documents jsonb DEFAULT '[]'::jsonb,
  deleted_entity_documents jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  current_version integer;
  saved_version integer;
  layer_document jsonb;
  entity_document jsonb;
  deleted_document jsonb;
  saved_layers integer := 0;
  saved_entities integer := 0;
  deleted_entities integer := 0;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF jsonb_typeof(scene_document) <> 'object'
     OR jsonb_typeof(layer_documents) <> 'array'
     OR jsonb_typeof(entity_documents) <> 'array'
     OR jsonb_typeof(deleted_entity_documents) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SAVE_DOCUMENT';
  END IF;

  SELECT scene.version INTO current_version
  FROM public.tabletop_scenes scene
  WHERE scene.id = target_scene_id
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

  UPDATE public.tabletop_scenes
  SET name = btrim(scene_document ->> 'name'),
      background_asset_id = NULLIF(scene_document ->> 'background_asset_id', '')::uuid,
      width = (scene_document ->> 'width')::integer,
      height = (scene_document ->> 'height')::integer,
      grid_type = scene_document ->> 'grid_type',
      grid_size = (scene_document ->> 'grid_size')::integer,
      grid_offset_x = (scene_document ->> 'grid_offset_x')::numeric,
      grid_offset_y = (scene_document ->> 'grid_offset_y')::numeric,
      grid_scale = (scene_document ->> 'grid_scale')::numeric,
      snap_enabled = (scene_document ->> 'snap_enabled')::boolean,
      global_illumination = (scene_document ->> 'global_illumination')::numeric,
      status = scene_document ->> 'status',
      order_index = (scene_document ->> 'order_index')::integer,
      updated_by = actor_id
  WHERE id = target_scene_id AND version = expected_scene_version
  RETURNING version INTO saved_version;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_VERSION_CONFLICT';
  END IF;

  FOR layer_document IN
    SELECT value FROM jsonb_array_elements(layer_documents)
  LOOP
    UPDATE public.tabletop_layers
    SET name = btrim(layer_document ->> 'name'),
        layer_type = layer_document ->> 'layer_type',
        order_index = (layer_document ->> 'order_index')::integer,
        visible = (layer_document ->> 'visible')::boolean,
        locked = (layer_document ->> 'locked')::boolean,
        updated_by = actor_id
    WHERE id = (layer_document ->> 'id')::uuid
      AND scene_id = target_scene_id
      AND version = (layer_document ->> 'version')::integer;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'TABLETOP_VERSION_CONFLICT',
        DETAIL = 'layer=' || COALESCE(layer_document ->> 'id', 'invalid');
    END IF;
    saved_layers := saved_layers + 1;
  END LOOP;

  FOR deleted_document IN
    SELECT value FROM jsonb_array_elements(deleted_entity_documents)
  LOOP
    DELETE FROM public.tabletop_entities
    WHERE id = (deleted_document ->> 'id')::uuid
      AND scene_id = target_scene_id
      AND version = (deleted_document ->> 'version')::integer;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '40001',
        MESSAGE = 'TABLETOP_VERSION_CONFLICT',
        DETAIL = 'deleted_entity=' || COALESCE(deleted_document ->> 'id', 'invalid');
    END IF;
    deleted_entities := deleted_entities + 1;
  END LOOP;

  FOR entity_document IN
    SELECT value FROM jsonb_array_elements(entity_documents)
  LOOP
    IF (entity_document ->> 'version')::integer = 0 THEN
      INSERT INTO public.tabletop_entities (
        id, scene_id, layer_id, entity_type, name, linked_sheet_id,
        linked_knowledge_node_id, asset_id, x, y, width, height, rotation,
        elevation, z_index, hidden, locked, owner_user_id, properties,
        created_by, updated_by
      ) VALUES (
        (entity_document ->> 'id')::uuid,
        target_scene_id,
        (entity_document ->> 'layer_id')::uuid,
        entity_document ->> 'entity_type',
        entity_document ->> 'name',
        NULLIF(entity_document ->> 'linked_sheet_id', '')::uuid,
        NULLIF(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
        NULLIF(entity_document ->> 'asset_id', '')::uuid,
        (entity_document ->> 'x')::numeric,
        (entity_document ->> 'y')::numeric,
        (entity_document ->> 'width')::numeric,
        (entity_document ->> 'height')::numeric,
        (entity_document ->> 'rotation')::numeric,
        (entity_document ->> 'elevation')::numeric,
        (entity_document ->> 'z_index')::integer,
        (entity_document ->> 'hidden')::boolean,
        (entity_document ->> 'locked')::boolean,
        NULLIF(entity_document ->> 'owner_user_id', '')::uuid,
        COALESCE(entity_document -> 'properties', '{}'::jsonb),
        actor_id,
        actor_id
      );
    ELSE
      UPDATE public.tabletop_entities
      SET layer_id = (entity_document ->> 'layer_id')::uuid,
          entity_type = entity_document ->> 'entity_type',
          name = entity_document ->> 'name',
          linked_sheet_id = NULLIF(entity_document ->> 'linked_sheet_id', '')::uuid,
          linked_knowledge_node_id = NULLIF(entity_document ->> 'linked_knowledge_node_id', '')::uuid,
          asset_id = NULLIF(entity_document ->> 'asset_id', '')::uuid,
          x = (entity_document ->> 'x')::numeric,
          y = (entity_document ->> 'y')::numeric,
          width = (entity_document ->> 'width')::numeric,
          height = (entity_document ->> 'height')::numeric,
          rotation = (entity_document ->> 'rotation')::numeric,
          elevation = (entity_document ->> 'elevation')::numeric,
          z_index = (entity_document ->> 'z_index')::integer,
          hidden = (entity_document ->> 'hidden')::boolean,
          locked = (entity_document ->> 'locked')::boolean,
          owner_user_id = NULLIF(entity_document ->> 'owner_user_id', '')::uuid,
          properties = COALESCE(entity_document -> 'properties', '{}'::jsonb),
          updated_by = actor_id
      WHERE id = (entity_document ->> 'id')::uuid
        AND scene_id = target_scene_id
        AND version = (entity_document ->> 'version')::integer;
      IF NOT FOUND THEN
        RAISE EXCEPTION USING
          ERRCODE = '40001',
          MESSAGE = 'TABLETOP_VERSION_CONFLICT',
          DETAIL = 'entity=' || COALESCE(entity_document ->> 'id', 'invalid');
      END IF;
    END IF;
    saved_entities := saved_entities + 1;
  END LOOP;

  INSERT INTO public.tabletop_scene_events (scene_id, event_type, payload, created_by)
  VALUES (
    target_scene_id,
    'scene.saved',
    jsonb_build_object(
      'previous_version', current_version,
      'saved_version', saved_version,
      'layers', saved_layers,
      'entities', saved_entities,
      'deleted_entities', deleted_entities
    ),
    actor_id
  );

  RETURN saved_version;
END;
$$;

REVOKE ALL ON FUNCTION public.save_tabletop_scene_state(
  uuid, integer, jsonb, jsonb, jsonb, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_tabletop_scene_state(
  uuid, integer, jsonb, jsonb, jsonb, jsonb
) TO authenticated;

COMMENT ON FUNCTION public.save_tabletop_scene_state(
  uuid, integer, jsonb, jsonb, jsonb, jsonb
) IS 'Atomically saves one manager-visible Mesa Nexus scene with optimistic conflicts.';
