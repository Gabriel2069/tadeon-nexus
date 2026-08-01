-- Mesa Nexus: atomically reorder every scene in one manager-visible campaign.
-- Additive only. The RPC stays SECURITY INVOKER and preserves optimistic versions.

CREATE OR REPLACE FUNCTION public.reorder_tabletop_scenes(
  target_campaign_id uuid,
  scene_documents jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  document_count integer;
  actual_count integer;
  matched_count integer;
  distinct_ids integer;
  distinct_orders integer;
  minimum_order integer;
  maximum_order integer;
  changed_count integer := 0;
  event_scene_id uuid;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_AUTH_REQUIRED';
  END IF;
  IF NOT (SELECT private.can_co_manage_campaign(target_campaign_id)) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'TABLETOP_CAMPAIGN_NOT_MANAGEABLE';
  END IF;
  IF jsonb_typeof(scene_documents) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SCENE_ORDER';
  END IF;

  document_count := jsonb_array_length(scene_documents);
  IF document_count NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SCENE_ORDER';
  END IF;

  PERFORM scene.id
  FROM public.tabletop_scenes scene
  WHERE scene.campaign_id = target_campaign_id
  ORDER BY scene.id
  FOR UPDATE;

  SELECT count(*) INTO actual_count
  FROM public.tabletop_scenes scene
  WHERE scene.campaign_id = target_campaign_id;

  SELECT
    count(*),
    count(DISTINCT document.id),
    count(DISTINCT document.order_index),
    min(document.order_index),
    max(document.order_index)
  INTO document_count, distinct_ids, distinct_orders, minimum_order, maximum_order
  FROM jsonb_to_recordset(scene_documents)
    AS document(id uuid, version integer, order_index integer);

  IF document_count <> actual_count
     OR distinct_ids <> document_count
     OR distinct_orders <> document_count
     OR minimum_order <> 0
     OR maximum_order <> document_count - 1 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'TABLETOP_INVALID_SCENE_ORDER';
  END IF;

  SELECT count(*) INTO matched_count
  FROM jsonb_to_recordset(scene_documents)
    AS document(id uuid, version integer, order_index integer)
  JOIN public.tabletop_scenes scene
    ON scene.id = document.id
   AND scene.campaign_id = target_campaign_id
   AND scene.version = document.version;

  IF matched_count <> document_count THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'TABLETOP_VERSION_CONFLICT';
  END IF;

  WITH documents AS (
    SELECT *
    FROM jsonb_to_recordset(scene_documents)
      AS document(id uuid, version integer, order_index integer)
  )
  UPDATE public.tabletop_scenes scene
  SET order_index = documents.order_index,
      updated_by = actor_id
  FROM documents
  WHERE scene.id = documents.id
    AND scene.campaign_id = target_campaign_id
    AND scene.order_index IS DISTINCT FROM documents.order_index;
  GET DIAGNOSTICS changed_count = ROW_COUNT;

  SELECT document.id INTO event_scene_id
  FROM jsonb_to_recordset(scene_documents)
    AS document(id uuid, version integer, order_index integer)
  ORDER BY document.order_index
  LIMIT 1;

  INSERT INTO public.tabletop_scene_events (
    scene_id, event_type, payload, created_by
  ) VALUES (
    event_scene_id,
    'scene.reordered',
    jsonb_build_object('campaign_id', target_campaign_id, 'changed', changed_count),
    actor_id
  );

  RETURN changed_count;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_tabletop_scenes(uuid, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_tabletop_scenes(uuid, jsonb)
  TO authenticated;

COMMENT ON FUNCTION public.reorder_tabletop_scenes(uuid, jsonb) IS
  'Atomically reorders the complete manager-visible scene set with optimistic versions.';
