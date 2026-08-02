import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_LAYER_TYPES = new Set(["map", "objects", "tokens", "drawings"]);
const ENTITY_COLORS: Record<string, number> = {
  token: 0x8d3152,
  character: 0x8d3152,
  npc: 0x7b4058,
  creature: 0x70333b,
  object: 0x345d6f,
  tile: 0x345d6f,
  drawing: 0x6a5d3e,
  text: 0x5a5368,
  marker: 0x765c2f,
  note: 0x765c2f,
  area: 0x4b5d47,
  light: 0x8a7538,
  handout_pin: 0x5d4770,
};

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

interface VisibilityPoint { x: number; y: number }
interface VisibilityWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: string;
  blocksVision: boolean;
}

function raySegmentDistance(
  origin: VisibilityPoint,
  direction: VisibilityPoint,
  wall: VisibilityWall,
) {
  const segment = { x: wall.x2 - wall.x1, y: wall.y2 - wall.y1 };
  const denominator = direction.x * segment.y - direction.y * segment.x;
  if (Math.abs(denominator) < 1e-9) return null;
  const offset = { x: wall.x1 - origin.x, y: wall.y1 - origin.y };
  const rayDistance =
    (offset.x * segment.y - offset.y * segment.x) / denominator;
  const segmentPosition =
    (offset.x * direction.y - offset.y * direction.x) / denominator;
  return rayDistance >= 0 && segmentPosition >= 0 && segmentPosition <= 1
    ? rayDistance
    : null;
}

function buildVisibilityPolygon(
  light: { x: number; y: number; radius: number; castsShadows: boolean },
  walls: VisibilityWall[],
  width: number,
  height: number,
) {
  const boundary: VisibilityWall[] = [
    { x1: 0, y1: 0, x2: width, y2: 0, wallType: "wall", blocksVision: true },
    { x1: width, y1: 0, x2: width, y2: height, wallType: "wall", blocksVision: true },
    { x1: width, y1: height, x2: 0, y2: height, wallType: "wall", blocksVision: true },
    { x1: 0, y1: height, x2: 0, y2: 0, wallType: "wall", blocksVision: true },
  ];
  const nearbyWalls = walls
    .filter((wall) => wall.blocksVision && wall.wallType !== "door_open")
    .map((wall) => ({
      wall,
      distance:
        (wall.x1 + wall.x2) / 2 - light.x,
      verticalDistance:
        (wall.y1 + wall.y2) / 2 - light.y,
    }))
    .filter(({ distance, verticalDistance }) =>
      Math.abs(distance) <= light.radius && Math.abs(verticalDistance) <= light.radius
    )
    .sort((left, right) =>
      left.distance ** 2 + left.verticalDistance ** 2 -
      (right.distance ** 2 + right.verticalDistance ** 2)
    )
    .slice(0, 64)
    .map(({ wall }) => wall);
  const blockers = light.castsShadows
    ? [...nearbyWalls, ...boundary]
    : boundary;
  const angles: number[] = [];
  for (let index = 0; index < 64; index += 1) {
    angles.push((index / 64) * Math.PI * 2);
  }
  for (const wall of blockers) {
    for (const point of [
      { x: wall.x1, y: wall.y1 },
      { x: wall.x2, y: wall.y2 },
    ]) {
      const angle = Math.atan2(point.y - light.y, point.x - light.x);
      angles.push(angle - 0.0001, angle, angle + 0.0001);
    }
  }
  return angles.sort((left, right) => left - right).map((angle) => {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = Math.max(8, light.radius);
    for (const wall of blockers) {
      const hit = raySegmentDistance(
        { x: light.x, y: light.y },
        direction,
        wall,
      );
      if (hit !== null && hit < distance) distance = hit;
    }
    return {
      x: light.x + direction.x * distance,
      y: light.y + direction.y * distance,
    };
  });
}

function safeFogPoints(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 64).map((point) => {
    const source = objectValue(point);
    return { x: finiteNumber(source.x), y: finiteNumber(source.y) };
  });
}

function publicProperties(value: unknown) {
  const properties = objectValue(value);
  const status = boundedText(properties.status, 80);
  const icons = Array.isArray(properties.icons)
    ? properties.icons
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 16))
      .filter(Boolean)
      .slice(0, 8)
    : [];
  const visualConditions = Array.isArray(properties.visual_conditions)
    ? properties.visual_conditions
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 40))
      .filter(Boolean)
      .slice(0, 8)
    : [];
  const barMax = Math.max(0, Math.min(1_000_000, finiteNumber(properties.bar_max)));
  const barCurrent = Math.max(0, Math.min(barMax, finiteNumber(properties.bar_current)));
  return {
    ...(status ? { status } : {}),
    ...(icons.length ? { icons } : {}),
    ...(visualConditions.length ? { visual_conditions: visualConditions } : {}),
    ...(barMax > 0 ? { bar_max: barMax, bar_current: barCurrent } : {}),
  };
}

async function isFlagEnabled(admin: ReturnType<typeof createClient>, userId: string, key: string) {
  const { data: override, error: overrideError } = await admin
    .from("feature_flag_user_overrides")
    .select("enabled")
    .eq("flag_key", key)
    .eq("user_id", userId)
    .maybeSingle();
  if (overrideError) return false;
  if (override) return override.enabled === true;

  const { data: flag, error: flagError } = await admin
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .maybeSingle();
  return !flagError && flag?.enabled === true;
}

async function signAssets(
  admin: ReturnType<typeof createClient>,
  assetIds: string[],
) {
  const urls = new Map<string, string>();
  if (assetIds.length === 0) return urls;
  const { data: assets, error } = await admin
    .from("assets")
    .select("id,provider,bucket,object_key,status,deleted_at")
    .in("id", assetIds)
    .eq("status", "ready")
    .is("deleted_at", null);
  if (error) return urls;

  await Promise.all((assets ?? []).map(async (asset) => {
    if (asset.provider !== "supabase") return;
    const { data, error: signError } = await admin.storage
      .from(asset.bucket)
      .createSignedUrl(asset.object_key, 300);
    if (!signError && data?.signedUrl) urls.set(asset.id, data.signedUrl);
  }));
  return urls;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond({ error: "Método não permitido." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicApiKey =
    request.headers.get("apikey") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[tabletop-view] Server environment is unavailable.");
    return respond({ error: "Visualização da Mesa indisponível." }, 503);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return respond({ error: "Sessão inválida." }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return respond({ error: "Solicitação inválida." }, 400);
  }
  const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : "";
  if (!UUID_PATTERN.test(sessionId)) {
    return respond({ error: "Sala inválida." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) return respond({ error: "Sessão inválida." }, 401);

  const [tabletopEnabled, realtimeEnabled, knowledgeEnabled] = await Promise.all([
    isFlagEnabled(admin, user.id, "nexus_tabletop_enabled"),
    isFlagEnabled(admin, user.id, "nexus_realtime_enabled"),
    isFlagEnabled(admin, user.id, "nexus_knowledge_enabled"),
  ]);
  if (!tabletopEnabled || !realtimeEnabled) {
    return respond({ error: "Mesa ao vivo desativada para esta conta." }, 403);
  }

  const { data: session, error: sessionError } = await admin
    .from("tabletop_sessions")
    .select("id,campaign_id,current_scene_id,name,status,join_locked,version")
    .eq("id", sessionId)
    .maybeSingle();
  if (sessionError) {
    console.error("[tabletop-view] Could not load session metadata.");
    return respond({ error: "Não foi possível carregar a sala." }, 500);
  }
  if (!session || session.status !== "open") {
    return respond({ error: "Sala não encontrada." }, 404);
  }

  const { data: participant, error: participantError } = await admin
    .from("tabletop_session_participants")
    .select("role,state")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (participantError || !participant || participant.state !== "active") {
    return respond({ error: "Entre na sala para visualizar a cena." }, 403);
  }

  const { data: appRole } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (appRole?.role !== "mestre") {
    const { data: membership } = await admin
      .from("campaign_members")
      .select("role")
      .eq("campaign_id", session.campaign_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership || membership.role !== participant.role) {
      return respond({ error: "Acesso à campanha revogado." }, 403);
    }
  }

  const sessionView = {
    id: session.id,
    name: boundedText(session.name, 160),
    campaignId: session.campaign_id,
    currentSceneId: session.current_scene_id,
    version: session.version,
    joinLocked: session.join_locked,
  };
  const participantView = {
    role: participant.role,
    canInteract: participant.role !== "observer",
  };
  if (!session.current_scene_id) {
    return respond({
      session: sessionView,
      participant: participantView,
      scene: null,
      visibility: null,
    });
  }

  const [{ data: scene, error: sceneError }, { data: layers, error: layerError }, { data: entities, error: entityError }] =
    await Promise.all([
      admin.from("tabletop_scenes")
        .select("id,campaign_id,name,background_asset_id,width,height,grid_type,grid_size,grid_scale,snap_enabled,global_illumination,fog_enabled,fog_opacity,visibility_version")
        .eq("id", session.current_scene_id)
        .eq("campaign_id", session.campaign_id)
        .maybeSingle(),
      admin.from("tabletop_layers")
        .select("id,name,layer_type,order_index,visible,locked")
        .eq("scene_id", session.current_scene_id)
        .eq("visible", true)
        .order("order_index"),
      admin.from("tabletop_entities")
        .select("id,layer_id,entity_type,name,asset_id,linked_knowledge_node_id,x,y,width,height,rotation,elevation,z_index,hidden,locked,owner_user_id,properties")
        .eq("scene_id", session.current_scene_id)
        .eq("hidden", false)
        .order("z_index"),
    ]);
  if (sceneError || layerError || entityError || !scene) {
    console.error("[tabletop-view] Could not build participant projection.");
    return respond({ error: "Não foi possível carregar a cena." }, 500);
  }

  const [
    { data: walls, error: wallError },
    { data: lights, error: lightError },
    { data: fogStrokes, error: fogError },
  ] = await Promise.all([
    admin.from("tabletop_walls")
      .select("x1,y1,x2,y2,wall_type,blocks_vision")
      .eq("scene_id", scene.id)
      .order("created_at"),
    admin.from("tabletop_lights")
      .select("id,x,y,radius,intensity,color,enabled,casts_shadows")
      .eq("scene_id", scene.id)
      .eq("enabled", true)
      .order("created_at"),
    admin.from("tabletop_fog_strokes")
      .select("id,operation,points,radius,sequence_index")
      .eq("scene_id", scene.id)
      .order("sequence_index"),
  ]);
  if (wallError || lightError || fogError) {
    console.error("[tabletop-view] Could not build visibility projection.");
    return respond({ error: "Não foi possível proteger a visão da cena." }, 500);
  }
  const safeWalls: VisibilityWall[] = (walls ?? []).map((wall) => ({
    x1: finiteNumber(wall.x1),
    y1: finiteNumber(wall.y1),
    x2: finiteNumber(wall.x2),
    y2: finiteNumber(wall.y2),
    wallType: boundedText(wall.wall_type, 24),
    blocksVision: wall.blocks_vision === true,
  }));
  const visibility = {
    version: Math.max(1, Math.trunc(finiteNumber(scene.visibility_version, 1))),
    globalIllumination: Math.max(
      0,
      Math.min(1, finiteNumber(scene.global_illumination, 1)),
    ),
    fogEnabled: scene.fog_enabled === true,
    fogOpacity: Math.max(0, Math.min(1, finiteNumber(scene.fog_opacity, 0.92))),
    // Segmentos de paredes nunca saem do servidor: eles podem revelar salas secretas.
    walls: [],
    lights: (lights ?? []).slice(0, 64).map((light) => {
      const intensity = Math.max(0, Math.min(1, finiteNumber(light.intensity, 1)));
      const radius = Math.max(8, Math.min(100_000, finiteNumber(light.radius, 320)));
      const safeLight = {
        x: finiteNumber(light.x),
        y: finiteNumber(light.y),
        radius: radius * Math.max(0.12, intensity),
        castsShadows: light.casts_shadows === true,
      };
      return {
        id: light.id,
        entityId: null,
        x: safeLight.x,
        y: safeLight.y,
        radius,
        intensity,
        color: /^#[0-9a-f]{6}$/i.test(light.color) ? light.color : "#f2c66d",
        enabled: true,
        castsShadows: safeLight.castsShadows,
        visibilityPolygon: buildVisibilityPolygon(
          safeLight,
          safeWalls,
          scene.width,
          scene.height,
        ),
      };
    }),
    fogStrokes: (fogStrokes ?? []).map((stroke, sequenceIndex) => ({
      id: stroke.id,
      operation: stroke.operation === "hide" ? "hide" : "reveal",
      points: safeFogPoints(stroke.points),
      radius: Math.max(8, Math.min(1024, finiteNumber(stroke.radius, 160))),
      sequenceIndex,
    })).filter((stroke) => stroke.points.length > 0),
  };

  const publicLayers = (layers ?? []).filter((layer) =>
    PUBLIC_LAYER_TYPES.has(layer.layer_type)
  );
  const publicLayerIds = new Set(publicLayers.map((layer) => layer.id));
  const publicEntityCandidates = (entities ?? []).filter((entity) =>
    publicLayerIds.has(entity.layer_id)
  );
  const handoutNodeIds = [...new Set(publicEntityCandidates
    .filter((entity) => entity.entity_type === "handout_pin")
    .map((entity) => entity.linked_knowledge_node_id)
    .filter((value): value is string =>
      typeof value === "string" && UUID_PATTERN.test(value)
    ))].slice(0, 64);
  const handoutNodes = new Map<string, {
    nodeId: string;
    title: string;
    summary: string;
    nodeType: string;
    coverAssetId: string | null;
  }>();
  if (knowledgeEnabled && handoutNodeIds.length > 0) {
    if (!publicApiKey) {
      console.error("[tabletop-view] Public server key unavailable.");
      return respond({ error: "Integração com O Nexus indisponível." }, 503);
    }
    const authorized = createClient(supabaseUrl, publicApiKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: nodes, error: nodeError } = await authorized
      .from("knowledge_nodes")
      .select("id,title,summary,node_type,cover_asset_id")
      .in("id", handoutNodeIds)
      .is("archived_at", null)
      .is("deleted_at", null);
    if (nodeError) {
      console.error("[tabletop-view] Could not authorize Nexus handouts.");
      return respond({ error: "Não foi possível validar os handouts." }, 500);
    }
    for (const node of nodes ?? []) {
      handoutNodes.set(node.id, {
        nodeId: node.id,
        title: boundedText(node.title, 160),
        summary: boundedText(node.summary, 600),
        nodeType: boundedText(node.node_type, 80),
        coverAssetId:
          typeof node.cover_asset_id === "string" ? node.cover_asset_id : null,
      });
    }
  }
  // Um pin sem página autorizada desaparece por completo, inclusive seu título.
  const publicEntities = publicEntityCandidates.filter((entity) =>
    entity.entity_type !== "handout_pin" ||
    (
      typeof entity.linked_knowledge_node_id === "string" &&
      handoutNodes.has(entity.linked_knowledge_node_id)
    )
  );
  const assetIds = [...new Set([
    scene.background_asset_id,
    ...publicEntities.map((entity) => entity.asset_id),
    ...[...handoutNodes.values()].map((node) => node.coverAssetId),
  ].filter((value): value is string =>
    typeof value === "string" && UUID_PATTERN.test(value)
  ))];
  const assetUrls = await signAssets(admin, assetIds);
  const handoutViews = new Map([...handoutNodes].map(([nodeId, node]) => [
    nodeId,
    {
      nodeId: node.nodeId,
      title: node.title,
      summary: node.summary,
      nodeType: node.nodeType,
      ...(node.coverAssetId && assetUrls.has(node.coverAssetId)
        ? { coverUrl: assetUrls.get(node.coverAssetId) }
        : {}),
    },
  ]));

  return respond({
    session: sessionView,
    participant: participantView,
    scene: {
      id: scene.id,
      name: boundedText(scene.name, 160),
      width: scene.width,
      height: scene.height,
      gridMode: scene.grid_type,
      gridSize: scene.grid_size,
      gridScale: finiteNumber(scene.grid_scale, 1),
      snap: scene.snap_enabled,
      ...(scene.background_asset_id && assetUrls.has(scene.background_asset_id)
        ? { backgroundAssetUrl: assetUrls.get(scene.background_asset_id) }
        : {}),
      layers: publicLayers.map((layer) => ({
        id: layer.id,
        name: boundedText(layer.name, 160),
        order: layer.order_index,
        visible: true,
        locked: layer.locked,
        layerType: layer.layer_type,
      })),
      entities: publicEntities.map((entity) => ({
        id: entity.id,
        layerId: entity.layer_id,
        type: entity.entity_type,
        label: boundedText(entity.name, 240) || "Entidade",
        x: finiteNumber(entity.x),
        y: finiteNumber(entity.y),
        width: Math.max(8, finiteNumber(entity.width, 64)),
        height: Math.max(8, finiteNumber(entity.height, 64)),
        rotation: finiteNumber(entity.rotation),
        elevation: finiteNumber(entity.elevation),
        zIndex: entity.z_index,
        hidden: false,
        locked: entity.locked || participant.role === "observer",
        color: ENTITY_COLORS[entity.entity_type] ?? 0x4f5560,
        ...(entity.asset_id && assetUrls.has(entity.asset_id)
          ? { assetUrl: assetUrls.get(entity.asset_id) }
          : {}),
        controllable:
          participant.role === "player" && entity.owner_user_id === user.id && !entity.locked,
        properties: publicProperties(entity.properties),
        ...(typeof entity.linked_knowledge_node_id === "string" &&
        handoutViews.has(entity.linked_knowledge_node_id)
          ? { handout: handoutViews.get(entity.linked_knowledge_node_id) }
          : {}),
      })),
    },
    visibility,
  });
});
