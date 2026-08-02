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

  const [tabletopEnabled, realtimeEnabled] = await Promise.all([
    isFlagEnabled(admin, user.id, "nexus_tabletop_enabled"),
    isFlagEnabled(admin, user.id, "nexus_realtime_enabled"),
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
    return respond({ session: sessionView, participant: participantView, scene: null });
  }

  const [{ data: scene, error: sceneError }, { data: layers, error: layerError }, { data: entities, error: entityError }] =
    await Promise.all([
      admin.from("tabletop_scenes")
        .select("id,campaign_id,name,background_asset_id,width,height,grid_type,grid_size,grid_scale,snap_enabled")
        .eq("id", session.current_scene_id)
        .eq("campaign_id", session.campaign_id)
        .maybeSingle(),
      admin.from("tabletop_layers")
        .select("id,name,layer_type,order_index,visible,locked")
        .eq("scene_id", session.current_scene_id)
        .eq("visible", true)
        .order("order_index"),
      admin.from("tabletop_entities")
        .select("id,layer_id,entity_type,name,asset_id,x,y,width,height,rotation,elevation,z_index,hidden,locked,owner_user_id,properties")
        .eq("scene_id", session.current_scene_id)
        .eq("hidden", false)
        .order("z_index"),
    ]);
  if (sceneError || layerError || entityError || !scene) {
    console.error("[tabletop-view] Could not build participant projection.");
    return respond({ error: "Não foi possível carregar a cena." }, 500);
  }

  const publicLayers = (layers ?? []).filter((layer) => PUBLIC_LAYER_TYPES.has(layer.layer_type));
  const publicLayerIds = new Set(publicLayers.map((layer) => layer.id));
  const publicEntities = (entities ?? []).filter((entity) => publicLayerIds.has(entity.layer_id));
  const assetIds = [...new Set([
    scene.background_asset_id,
    ...publicEntities.map((entity) => entity.asset_id),
  ].filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value)))];
  const assetUrls = await signAssets(admin, assetIds);

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
      })),
    },
  });
});
