import { createClient } from "npm:@supabase/supabase-js@2.110.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  Vary: "Origin",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
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
    ? (value as Record<string, unknown>)
    : {};
}

function finiteNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedNumber(value: unknown) {
  return Math.max(-1_000_000, Math.min(1_000_000, finiteNumber(value)));
}

function activeConditionNames(value: unknown) {
  const names: string[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") names.push(entry);
      else {
        const condition = objectValue(entry);
        if (condition.active !== false)
          names.push(
            boundedText(condition.name ?? condition.label ?? condition.id, 80),
          );
      }
    }
  } else {
    for (const [key, entry] of Object.entries(objectValue(value))) {
      if (entry === true) names.push(key);
      else {
        const condition = objectValue(entry);
        if (condition.active === true || condition.value === true)
          names.push(boundedText(condition.name ?? condition.label ?? key, 80));
      }
    }
  }
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(
    0,
    12,
  );
}

interface VisibilityPoint {
  x: number;
  y: number;
}
interface VisibilityWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: string;
  blocksVision: boolean;
  baseElevation: number;
  height: number;
}

type PublicLightShape = "radial" | "cone" | "line" | "rectangle";

function normalizedAngleDelta(angle: number, reference: number) {
  let delta = angle - reference;
  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

function publicLightProperties(value: unknown) {
  const source = objectValue(value);
  const shape: PublicLightShape =
    source.shape === "cone" || source.shape === "line" || source.shape === "rectangle"
      ? source.shape
      : "radial";
  const particles =
    source.particles === "dust" || source.particles === "embers" || source.particles === "mist" || source.particles === "sparks"
      ? source.particles
      : "none";
  return {
    shape,
    angle: Math.max(1, Math.min(360, finiteNumber(source.angle, 90))),
    direction: finiteNumber(source.direction, 0) % 360,
    falloff: Math.max(0.1, Math.min(4, finiteNumber(source.falloff, 1.4))),
    softness: Math.max(0, Math.min(1, finiteNumber(source.softness, 0.4))),
    temperature: Math.max(1000, Math.min(12000, finiteNumber(source.temperature, 4200))),
    flicker: Math.max(0, Math.min(1, finiteNumber(source.flicker, 0))),
    particles,
  };
}

function lightDirection(light: { properties: ReturnType<typeof publicLightProperties> }) {
  return (light.properties.direction * Math.PI) / 180;
}

function lightRayLimit(light: { radius: number; properties: ReturnType<typeof publicLightProperties> }, angle: number) {
  const radius = Math.max(8, light.radius);
  if (light.properties.shape === "radial") return radius;
  const delta = normalizedAngleDelta(angle, lightDirection(light));
  if (light.properties.shape === "cone") {
    const aperture = Math.max(1, Math.min(359, light.properties.angle));
    return Math.abs(delta) <= (aperture * Math.PI) / 360 + 1e-6 ? radius : 0;
  }
  if (Math.cos(delta) < -1e-6 || Math.abs(delta) > Math.PI / 2 + 1e-6) return 0;
  const halfWidth = light.properties.shape === "line" ? Math.max(6, radius * 0.08) : radius * 0.42;
  const cosine = Math.max(1e-6, Math.cos(delta));
  const sine = Math.abs(Math.sin(delta));
  return Math.max(0, Math.min(radius / cosine, sine < 1e-6 ? Number.POSITIVE_INFINITY : halfWidth / sine));
}

function lightSeedAngles(light: { radius: number; properties: ReturnType<typeof publicLightProperties> }) {
  const direction = lightDirection(light);
  const angles: number[] = [];
  if (light.properties.shape === "radial") {
    for (let index = 0; index < 128; index += 1) angles.push((index / 128) * Math.PI * 2);
    return angles;
  }
  if (light.properties.shape === "cone") {
    const aperture = Math.max(1, Math.min(359, light.properties.angle));
    const half = (aperture * Math.PI) / 360;
    const steps = Math.max(16, Math.ceil(aperture / 5));
    for (let index = 0; index <= steps; index += 1) angles.push(direction - half + (index / steps) * half * 2);
    return angles;
  }
  for (let index = 0; index <= 72; index += 1) angles.push(direction - Math.PI / 2 + (index / 72) * Math.PI);
  return angles;
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
  light: {
    x: number;
    y: number;
    radius: number;
    castsShadows: boolean;
    elevation: number;
    properties: ReturnType<typeof publicLightProperties>;
  },
  walls: VisibilityWall[],
  width: number,
  height: number,
) {
  const boundary: VisibilityWall[] = [
    { x1: 0, y1: 0, x2: width, y2: 0, wallType: "wall", blocksVision: true, baseElevation: 0, height: 100_000 },
    { x1: width, y1: 0, x2: width, y2: height, wallType: "wall", blocksVision: true, baseElevation: 0, height: 100_000 },
    { x1: width, y1: height, x2: 0, y2: height, wallType: "wall", blocksVision: true, baseElevation: 0, height: 100_000 },
    { x1: 0, y1: height, x2: 0, y2: 0, wallType: "wall", blocksVision: true, baseElevation: 0, height: 100_000 },
  ];
  const blockers = light.castsShadows
    ? [...walls.filter((wall) => wall.blocksVision && wall.wallType !== "door_open" && light.elevation <= wall.baseElevation + wall.height + 0.5), ...boundary]
    : boundary;
  const angles = lightSeedAngles(light);
  for (const wall of blockers) {
    for (const point of [{ x: wall.x1, y: wall.y1 }, { x: wall.x2, y: wall.y2 }]) {
      const angle = Math.atan2(point.y - light.y, point.x - light.x);
      if (lightRayLimit(light, angle) <= 0) continue;
      angles.push(angle - 0.0001, angle, angle + 0.0001);
    }
  }
  const direction = lightDirection(light);
  const unique = [...new Map(angles.filter((angle) => lightRayLimit(light, angle) > 0).map((angle) => [Math.round(angle * 1_000_000), angle])).values()];
  unique.sort((left, right) =>
    light.properties.shape === "radial"
      ? ((left % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) - (((right % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2))
      : normalizedAngleDelta(left, direction) - normalizedAngleDelta(right, direction),
  );
  return unique.map((angle) => {
    const directionVector = { x: Math.cos(angle), y: Math.sin(angle) };
    let distance = lightRayLimit(light, angle);
    for (const wall of blockers) {
      const hit = raySegmentDistance({ x: light.x, y: light.y }, directionVector, wall);
      if (hit !== null && hit < distance) distance = hit;
    }
    return { x: light.x + directionVector.x * distance, y: light.y + directionVector.y * distance };
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
  const barMax = Math.max(
    0,
    Math.min(1_000_000, finiteNumber(properties.bar_max)),
  );
  const barCurrent = Math.max(
    0,
    Math.min(barMax, finiteNumber(properties.bar_current)),
  );
  const renderMode = properties.render_mode === "flat" || properties.render_mode === "billboard" ? properties.render_mode : undefined;
  const auraColor = typeof properties.aura_color === "string" && /^#[0-9a-f]{6}$/i.test(properties.aura_color) ? properties.aura_color : undefined;
  const audioUrl = typeof properties.audio_url === "string" && /^https?:\/\//i.test(properties.audio_url.trim()) ? properties.audio_url.trim().slice(0, 2048) : undefined;
  return {
    ...(status ? { status } : {}),
    ...(icons.length ? { icons } : {}),
    ...(visualConditions.length ? { visual_conditions: visualConditions } : {}),
    ...(barMax > 0 ? { bar_max: barMax, bar_current: barCurrent } : {}),
    ...(renderMode ? { render_mode: renderMode } : {}),
    billboard_anchor: properties.billboard_anchor === "center" ? "center" : "base",
    visual_scale: Math.max(0.5, Math.min(2.5, finiteNumber(properties.visual_scale, 1))),
    ground_shadow: properties.ground_shadow !== false,
    token_volume: properties.token_volume !== false,
    token_base_height: Math.max(4, Math.min(22, finiteNumber(properties.token_base_height, 8))),
    ...(auraColor ? { aura_color: auraColor } : {}),
    aura_intensity: Math.max(0, Math.min(1, finiteNumber(properties.aura_intensity, 0.56))),
    ...(audioUrl ? { audio_url: audioUrl } : {}),
    audio_enabled: properties.audio_enabled !== false,
    audio_loop: properties.audio_loop !== false,
    audio_volume: Math.max(0, Math.min(1, finiteNumber(properties.audio_volume, 0.72))),
    audio_radius: Math.max(8, Math.min(100_000, finiteNumber(properties.audio_radius, 512))),
  };
}

function publicDirectorState(value: unknown) {
  const state = objectValue(value);
  const camera = objectValue(state.camera);
  const mode = ["scene", "intermission", "blackout"].includes(
    String(state.mode),
  )
    ? String(state.mode)
    : "scene";
  const cameraMode = ["fit", "manual"].includes(String(camera.mode))
    ? String(camera.mode)
    : "fit";
  const projection = ["plan", "isometric"].includes(String(camera.projection))
    ? String(camera.projection)
    : "plan";
  const levelId =
    typeof camera.levelId === "string" && UUID_PATTERN.test(camera.levelId)
      ? camera.levelId
      : null;
  const yaw = ((finiteNumber(camera.yaw, 45) % 360) + 360) % 360;
  return {
    mode,
    title: boundedText(state.title, 160),
    subtitle: boundedText(state.subtitle, 320),
    showGrid: state.showGrid !== false,
    showHud: state.showHud === true,
    camera: {
      mode: cameraMode,
      x: Math.max(-1_000_000, Math.min(1_000_000, finiteNumber(camera.x))),
      y: Math.max(-1_000_000, Math.min(1_000_000, finiteNumber(camera.y))),
      zoom: Math.max(0.15, Math.min(4, finiteNumber(camera.zoom, 1))),
      projection,
      levelId,
      yaw,
      tilt: Math.max(0.18, Math.min(0.9, finiteNumber(camera.tilt, 0.5))),
      elevationScale: Math.max(
        0.25,
        Math.min(2.5, finiteNumber(camera.elevationScale, 1)),
      ),
    },
  };
}

async function isFlagEnabled(
  admin: ReturnType<typeof createClient>,
  userId: string,
  key: string,
) {
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

interface SignedAsset {
  url: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
}

async function signAssets(
  admin: ReturnType<typeof createClient>,
  assetIds: string[],
) {
  const signed = new Map<string, SignedAsset>();
  if (assetIds.length === 0) return signed;
  const { data: assets, error } = await admin
    .from("assets")
    .select(
      "id,provider,bucket,object_key,display_name,original_name,mime_type,size_bytes,status,deleted_at",
    )
    .in("id", assetIds)
    .eq("status", "ready")
    .is("deleted_at", null);
  if (error) return signed;

  await Promise.all(
    (assets ?? []).map(async (asset) => {
      if (asset.provider !== "supabase") return;
      const { data, error: signError } = await admin.storage
        .from(asset.bucket)
        .createSignedUrl(asset.object_key, 300);
      if (!signError && data?.signedUrl) {
        signed.set(asset.id, {
          url: data.signedUrl,
          name:
            boundedText(asset.display_name, 240) ||
            boundedText(asset.original_name, 240) ||
            "Arquivo",
          mimeType:
            boundedText(asset.mime_type, 160) || "application/octet-stream",
          sizeBytes: Math.max(
            0,
            Math.min(
              100 * 1024 * 1024,
              Math.trunc(finiteNumber(asset.size_bytes)),
            ),
          ),
        });
      }
    }),
  );
  return signed;
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
  const sessionId =
    typeof payload.sessionId === "string" ? payload.sessionId : "";
  if (!UUID_PATTERN.test(sessionId)) {
    return respond({ error: "Sala inválida." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = authorization.slice("Bearer ".length);
  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(token);
  if (userError || !user) return respond({ error: "Sessão inválida." }, 401);

  const [tabletopEnabled, realtimeEnabled, knowledgeEnabled, lightingEnabled] =
    await Promise.all([
      isFlagEnabled(admin, user.id, "nexus_tabletop_enabled"),
      isFlagEnabled(admin, user.id, "nexus_realtime_enabled"),
      isFlagEnabled(admin, user.id, "nexus_knowledge_enabled"),
      isFlagEnabled(admin, user.id, "nexus_lighting_enabled"),
    ]);
  if (!tabletopEnabled || !realtimeEnabled) {
    return respond({ error: "Mesa ao vivo desativada para esta conta." }, 403);
  }

  const { data: session, error: sessionError } = await admin
    .from("tabletop_sessions")
    .select(
      "id,campaign_id,current_scene_id,name,status,join_locked,version,director_state",
    )
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

  const directorState = publicDirectorState(session.director_state);
  const sessionView = {
    id: session.id,
    name: boundedText(session.name, 160),
    campaignId: session.campaign_id,
    currentSceneId: session.current_scene_id,
    version: session.version,
    joinLocked: session.join_locked,
    directorState,
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

  const [
    { data: scene, error: sceneError },
    { data: levels, error: levelError },
    { data: layers, error: layerError },
    { data: entities, error: entityError },
  ] = await Promise.all([
    admin
      .from("tabletop_scenes")
      .select(
        "id,campaign_id,name,background_asset_id,width,height,grid_type,grid_size,grid_scale,snap_enabled,global_illumination,fog_enabled,fog_opacity,visibility_version",
      )
      .eq("id", session.current_scene_id)
      .eq("campaign_id", session.campaign_id)
      .maybeSingle(),
    admin
      .from("tabletop_levels")
      .select(
        "id,name,order_index,base_elevation,height,visible,locked,version",
      )
      .eq("scene_id", session.current_scene_id)
      .eq("visible", true)
      .order("order_index"),
    admin
      .from("tabletop_layers")
      .select("id,name,layer_type,order_index,visible,locked")
      .eq("scene_id", session.current_scene_id)
      .eq("visible", true)
      .order("order_index"),
    admin
      .from("tabletop_entities")
      .select(
        "id,level_id,layer_id,entity_type,name,asset_id,linked_sheet_id,linked_knowledge_node_id,x,y,width,height,rotation,elevation,z_index,hidden,locked,owner_user_id,properties",
      )
      .eq("scene_id", session.current_scene_id)
      .eq("hidden", false)
      .order("z_index"),
  ]);
  if (
    sceneError ||
    levelError ||
    layerError ||
    entityError ||
    !scene ||
    !levels?.length
  ) {
    console.error("[tabletop-view] Could not build participant projection.");
    return respond({ error: "Não foi possível carregar a cena." }, 500);
  }

  const publicLayers = (layers ?? []).filter((layer) =>
    PUBLIC_LAYER_TYPES.has(layer.layer_type),
  );
  const publicLayerIds = new Set(publicLayers.map((layer) => layer.id));
  const controlledLevelId =
    participant.role === "player"
      ? (entities ?? []).find(
          (entity) =>
            entity.owner_user_id === user.id &&
            !entity.locked &&
            publicLayerIds.has(entity.layer_id),
        )?.level_id
      : null;
  const directorLevelId =
    participant.role === "master" || participant.role === "co_master"
      ? directorState.camera.levelId
      : null;
  const activeLevel =
    (levels ?? []).find((level) => level.id === directorLevelId) ??
    (levels ?? []).find((level) => level.id === controlledLevelId) ??
    levels[0];
  const activeLevelId = activeLevel.id;

  const [
    { data: walls, error: wallError },
    { data: lights, error: lightError },
    { data: fogStrokes, error: fogError },
  ] = await Promise.all([
    admin
      .from("tabletop_walls")
      .select(
        "id,level_id,x1,y1,x2,y2,wall_type,blocks_vision,blocks_movement,base_elevation,height,thickness,player_operable,version",
      )
      .eq("scene_id", scene.id)
      .eq("level_id", activeLevelId)
      .order("created_at"),
    admin
      .from("tabletop_lights")
      .select(
        "id,level_id,entity_id,x,y,elevation,radius,intensity,color,enabled,casts_shadows,properties",
      )
      .eq("scene_id", scene.id)
      .eq("level_id", activeLevelId)
      .eq("enabled", true)
      .order("created_at"),
    admin
      .from("tabletop_fog_strokes")
      .select("id,level_id,operation,geometry,points,radius,sequence_index")
      .eq("scene_id", scene.id)
      .eq("level_id", activeLevelId)
      .order("sequence_index"),
  ]);
  if (wallError || lightError || fogError) {
    console.error("[tabletop-view] Could not build visibility projection.");
    return respond(
      { error: "Não foi possível proteger a visão da cena." },
      500,
    );
  }
  const safeWalls: VisibilityWall[] = (walls ?? []).map((wall) => ({
    x1: finiteNumber(wall.x1),
    y1: finiteNumber(wall.y1),
    x2: finiteNumber(wall.x2),
    y2: finiteNumber(wall.y2),
    wallType: boundedText(wall.wall_type, 24),
    blocksVision: wall.blocks_vision === true,
    baseElevation: finiteNumber(wall.base_elevation),
    height: Math.max(8, finiteNumber(wall.height, 64)),
  }));
  const visibility = {
    version: Math.max(1, Math.trunc(finiteNumber(scene.visibility_version, 1))),
    globalIllumination: lightingEnabled
      ? Math.max(0, Math.min(1, finiteNumber(scene.global_illumination, 1)))
      : 1,
    fogEnabled: lightingEnabled && scene.fog_enabled === true,
    fogOpacity: Math.max(0, Math.min(1, finiteNumber(scene.fog_opacity, 0.92))),
    // A geometria completa continua no servidor. Somente portas explicitamente
    // operáveis saem para permitir a interação pontual do jogador.
    walls: (lightingEnabled ? (walls ?? []) : [])
      .filter(
        (wall) =>
          wall.player_operable === true &&
          (wall.wall_type === "door_closed" || wall.wall_type === "door_open"),
      )
      .slice(0, 128)
      .map((wall) => ({
        id: wall.id,
        levelId: wall.level_id,
        x1: finiteNumber(wall.x1),
        y1: finiteNumber(wall.y1),
        x2: finiteNumber(wall.x2),
        y2: finiteNumber(wall.y2),
        wallType: wall.wall_type,
        blocksVision: wall.blocks_vision === true,
        blocksMovement: wall.blocks_movement === true,
        baseElevation: finiteNumber(wall.base_elevation),
        height: Math.max(8, finiteNumber(wall.height, 64)),
        thickness: Math.max(1, finiteNumber(wall.thickness, 8)),
        playerOperable: true,
        version: Math.max(1, Math.trunc(finiteNumber(wall.version, 1))),
      })),
    lights: (lightingEnabled ? (lights ?? []) : [])
      .slice(0, 64)
      .map((light) => {
        const intensity = Math.max(
          0,
          Math.min(1, finiteNumber(light.intensity, 1)),
        );
        const radius = Math.max(
          8,
          Math.min(100_000, finiteNumber(light.radius, 320)),
        );
        const attachedEntity =
          typeof light.entity_id === "string"
            ? (entities ?? []).find((entity) => entity.id === light.entity_id && entity.level_id === activeLevelId)
            : null;
        const properties = publicLightProperties(light.properties);
        const safeLight = {
          x: attachedEntity ? finiteNumber(attachedEntity.x) + Math.max(8, finiteNumber(attachedEntity.width, 64)) / 2 : finiteNumber(light.x),
          y: attachedEntity ? finiteNumber(attachedEntity.y) + Math.max(8, finiteNumber(attachedEntity.height, 64)) / 2 : finiteNumber(light.y),
          elevation: finiteNumber(light.elevation) + (attachedEntity ? finiteNumber(attachedEntity.elevation) : 0),
          radius: radius * Math.max(0.12, intensity),
          castsShadows: light.casts_shadows === true,
          properties,
        };
        return {
          id: light.id,
          levelId: light.level_id,
          entityId: null,
          x: safeLight.x,
          y: safeLight.y,
          elevation: safeLight.elevation,
          radius,
          intensity,
          color: /^#[0-9a-f]{6}$/i.test(light.color) ? light.color : "#f2c66d",
          enabled: true,
          castsShadows: safeLight.castsShadows,
          properties,
          visibilityPolygon: buildVisibilityPolygon(
            safeLight,
            safeWalls,
            scene.width,
            scene.height,
          ),
        };
      }),
    fogStrokes: (lightingEnabled ? (fogStrokes ?? []) : [])
      .map((stroke, sequenceIndex) => ({
        id: stroke.id,
        levelId: stroke.level_id,
        operation: stroke.operation === "hide" ? "hide" : "reveal",
        shape:
          stroke.geometry === "rectangle" || stroke.geometry === "ellipse" || stroke.geometry === "polygon"
            ? stroke.geometry
            : "brush",
        points: safeFogPoints(stroke.points),
        radius: Math.max(8, Math.min(1024, finiteNumber(stroke.radius, 160))),
        sequenceIndex,
      }))
      .filter((stroke) => stroke.points.length > 0),
  };

  const publicEntityCandidates = (entities ?? []).filter(
    (entity) =>
      publicLayerIds.has(entity.layer_id) && entity.level_id === activeLevelId,
  );
  const sheetIds = [
    ...new Set(
      publicEntityCandidates
        .map((entity) => entity.linked_sheet_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && UUID_PATTERN.test(value),
        ),
    ),
  ].slice(0, 64);
  const handoutNodeIds = [
    ...new Set(
      publicEntityCandidates
        .filter((entity) => entity.entity_type === "handout_pin")
        .map((entity) => entity.linked_knowledge_node_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && UUID_PATTERN.test(value),
        ),
    ),
  ].slice(0, 64);
  const handoutNodes = new Map<
    string,
    {
      nodeId: string;
      title: string;
      summary: string;
      nodeType: string;
      coverAssetId: string | null;
    }
  >();
  const handoutAssetLinks = new Map<
    string,
    Array<{
      assetId: string;
      role: string;
      caption: string;
      sortOrder: number;
    }>
  >();
  const authorized = publicApiKey
    ? createClient(supabaseUrl, publicApiKey, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
  const sheetSummaries = new Map<string, Record<string, unknown>>();
  if (sheetIds.length > 0) {
    if (!authorized) {
      console.error("[tabletop-view] Public server key unavailable.");
      return respond({ error: "Integração com fichas indisponível." }, 503);
    }
    const { data: sheets, error: sheetError } = await authorized
      .from("character_sheets")
      .select(
        "id,name,occupation,brand,origin,exposure,equilibrium,condition,conditions,stats",
      )
      .in("id", sheetIds);
    if (sheetError) {
      console.error("[tabletop-view] Could not authorize sheet summaries.");
      return respond({ error: "Não foi possível validar as fichas." }, 500);
    }
    for (const sheet of sheets ?? []) {
      const stats = objectValue(sheet.stats);
      sheetSummaries.set(sheet.id, {
        sheetId: sheet.id,
        name: boundedText(sheet.name, 160) || "Ficha sem nome",
        occupation: boundedText(sheet.occupation, 160),
        brand: boundedText(sheet.brand, 160),
        origin: boundedText(sheet.origin, 160),
        exposure: boundedNumber(sheet.exposure),
        equilibrium: boundedNumber(sheet.equilibrium),
        condition: boundedText(sheet.condition, 160),
        resources: {
          pv: boundedNumber(stats.pv_current),
          pe: boundedNumber(stats.pe_current),
          ps: boundedNumber(stats.ps_current),
          pa: boundedNumber(stats.pa_current),
        },
        activeConditions: activeConditionNames(sheet.conditions),
      });
    }
  }
  if (knowledgeEnabled && handoutNodeIds.length > 0) {
    if (!authorized) {
      console.error("[tabletop-view] Public server key unavailable.");
      return respond({ error: "Integração com O Nexus indisponível." }, 503);
    }
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

    if (handoutNodes.size > 0) {
      const { data: links, error: linksError } = await authorized
        .from("knowledge_assets")
        .select("node_id,asset_id,asset_role,caption,sort_order")
        .in("node_id", [...handoutNodes.keys()])
        .order("sort_order", { ascending: true })
        .limit(1024);
      if (linksError) {
        console.error("[tabletop-view] Could not authorize Nexus attachments.");
        return respond(
          { error: "Não foi possível validar os anexos dos handouts." },
          500,
        );
      }
      for (const link of links ?? []) {
        if (
          typeof link.node_id !== "string" ||
          typeof link.asset_id !== "string" ||
          !UUID_PATTERN.test(link.asset_id)
        )
          continue;
        const current = handoutAssetLinks.get(link.node_id) ?? [];
        if (current.length >= 16) continue;
        current.push({
          assetId: link.asset_id,
          role: boundedText(link.asset_role, 80),
          caption: boundedText(link.caption, 500),
          sortOrder: Math.max(0, Math.trunc(finiteNumber(link.sort_order))),
        });
        handoutAssetLinks.set(link.node_id, current);
      }
    }
  }
  // Um pin sem página autorizada desaparece por completo, inclusive seu título.
  const publicEntities = publicEntityCandidates.filter(
    (entity) =>
      entity.entity_type !== "handout_pin" ||
      (typeof entity.linked_knowledge_node_id === "string" &&
        handoutNodes.has(entity.linked_knowledge_node_id)),
  );
  const assetIds = [
    ...new Set(
      [
        scene.background_asset_id,
        ...publicEntities.map((entity) => entity.asset_id),
        ...[...handoutNodes.values()].map((node) => node.coverAssetId),
        ...[...handoutAssetLinks.values()].flatMap((links) =>
          links.map((link) => link.assetId),
        ),
      ].filter(
        (value): value is string =>
          typeof value === "string" && UUID_PATTERN.test(value),
      ),
    ),
  ];
  const signedAssets = await signAssets(admin, assetIds);
  const handoutViews = new Map(
    [...handoutNodes].map(([nodeId, node]) => [
      nodeId,
      {
        nodeId: node.nodeId,
        title: node.title,
        summary: node.summary,
        nodeType: node.nodeType,
        ...(node.coverAssetId && signedAssets.has(node.coverAssetId)
          ? { coverUrl: signedAssets.get(node.coverAssetId)?.url }
          : {}),
        attachments: (handoutAssetLinks.get(nodeId) ?? []).flatMap((link) => {
          const asset = signedAssets.get(link.assetId);
          return asset
            ? [
                {
                  assetId: link.assetId,
                  name: asset.name,
                  mimeType: asset.mimeType,
                  sizeBytes: asset.sizeBytes,
                  role: link.role,
                  caption: link.caption,
                  url: asset.url,
                },
              ]
            : [];
        }),
      },
    ]),
  );

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
      activeLevelId,
      levels: [
        {
          id: activeLevel.id,
          name: boundedText(activeLevel.name, 120),
          order: activeLevel.order_index,
          baseElevation: finiteNumber(activeLevel.base_elevation),
          height: Math.max(8, finiteNumber(activeLevel.height, 192)),
          visible: true,
          locked: activeLevel.locked === true,
          version: Math.max(
            1,
            Math.trunc(finiteNumber(activeLevel.version, 1)),
          ),
        },
      ],
      ...(scene.background_asset_id &&
      signedAssets.has(scene.background_asset_id)
        ? {
            backgroundAssetUrl: signedAssets.get(scene.background_asset_id)
              ?.url,
          }
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
        levelId: entity.level_id,
        zIndex: entity.z_index,
        hidden: false,
        locked: entity.locked || participant.role === "observer",
        color: ENTITY_COLORS[entity.entity_type] ?? 0x4f5560,
        ...(entity.asset_id && signedAssets.has(entity.asset_id)
          ? { assetUrl: signedAssets.get(entity.asset_id)?.url }
          : {}),
        controllable:
          participant.role === "player" &&
          entity.owner_user_id === user.id &&
          !entity.locked,
        properties: publicProperties(entity.properties),
        ...(typeof entity.linked_sheet_id === "string" &&
        sheetSummaries.has(entity.linked_sheet_id)
          ? { sheetSummary: sheetSummaries.get(entity.linked_sheet_id) }
          : {}),
        ...(typeof entity.linked_knowledge_node_id === "string" &&
        handoutViews.has(entity.linked_knowledge_node_id)
          ? { handout: handoutViews.get(entity.linked_knowledge_node_id) }
          : {}),
      })),
    },
    visibility,
  });
});
