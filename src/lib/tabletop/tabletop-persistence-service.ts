import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { assetService, type NexusAsset } from "@/lib/assets/asset-service";
import type {
  GridMode,
  TabletopEntity,
  TabletopLayer,
  TabletopLevel,
  TabletopScene,
} from "@/lib/tabletop/types";

const tabletopDatabase = supabase as unknown as SupabaseClient;

export type TabletopServiceErrorCode =
  | "TABLETOP_AUTH_REQUIRED"
  | "TABLETOP_CONFLICT"
  | "TABLETOP_INVALID_INPUT"
  | "TABLETOP_NOT_FOUND"
  | "TABLETOP_DATABASE_ERROR";

export class TabletopServiceError extends Error {
  constructor(public readonly code: TabletopServiceErrorCode) {
    super(code);
    this.name = "TabletopServiceError";
  }
}

interface SceneRow {
  id: string;
  campaign_id: string;
  name: string;
  background_asset_id: string | null;
  width: number;
  height: number;
  grid_type: GridMode;
  grid_size: number;
  grid_offset_x: number | string;
  grid_offset_y: number | string;
  grid_scale: number | string;
  snap_enabled: boolean;
  global_illumination: number | string;
  status: "draft" | "active" | "archived";
  order_index: number;
  version: number;
  created_at: string;
  updated_at: string;
}

interface LayerRow {
  id: string;
  scene_id: string;
  name: string;
  layer_type: "map" | "objects" | "tokens" | "drawings" | "master";
  order_index: number;
  visible: boolean;
  locked: boolean;
  version: number;
}

interface LevelRow {
  id: string;
  scene_id: string;
  name: string;
  order_index: number;
  base_elevation: number | string;
  height: number | string;
  visible: boolean;
  locked: boolean;
  version: number;
}

interface EntityRow {
  id: string;
  scene_id: string;
  layer_id: string;
  level_id: string;
  entity_type: TabletopEntity["type"];
  name: string;
  linked_sheet_id: string | null;
  linked_knowledge_node_id: string | null;
  asset_id: string | null;
  x: number | string;
  y: number | string;
  width: number | string;
  height: number | string;
  rotation: number | string;
  elevation: number | string;
  z_index: number;
  hidden: boolean;
  locked: boolean;
  owner_user_id: string | null;
  properties: Json;
  version: number;
}

export interface PersistedTabletopLayer extends TabletopLayer {
  layerType: LayerRow["layer_type"];
  version: number;
}

export interface PersistedTabletopLevel extends TabletopLevel {
  sceneId: string;
}

export interface PersistedTabletopEntity extends TabletopEntity {
  sceneId: string;
  version: number;
  elevation: number;
  levelId: string;
  assetId: string | null;
  linkedSheetId: string | null;
  linkedKnowledgeNodeId: string | null;
  ownerUserId: string | null;
  properties: Json;
}

export interface PersistedTabletopScene extends TabletopScene {
  campaignId: string;
  backgroundAssetId: string | null;
  gridOffsetX: number;
  gridOffsetY: number;
  globalIllumination: number;
  status: SceneRow["status"];
  orderIndex: number;
  version: number;
  createdAt: string;
  updatedAt: string;
  levels: PersistedTabletopLevel[];
  layers: PersistedTabletopLayer[];
  entities: PersistedTabletopEntity[];
}

export interface TabletopSceneSummary {
  id: string;
  campaignId: string;
  name: string;
  status: SceneRow["status"];
  orderIndex: number;
  version: number;
  updatedAt: string;
}

export interface TabletopCampaignSummary {
  id: string;
  name: string;
  workspaceId: string;
  status: string;
}

export interface TabletopSheetTarget {
  id: string;
  name: string;
  ownerId: string;
}

export interface TabletopKnowledgeTarget {
  id: string;
  title: string;
  nodeType: string;
}

export interface TabletopEntityLinkTargets {
  sheets: TabletopSheetTarget[];
  knowledge: TabletopKnowledgeTarget[];
}

export interface TabletopAssetTarget {
  id: string;
  displayName: string;
  mimeType: string;
  width: number;
  height: number;
  previewUrl?: string;
}

export interface TabletopSceneSnapshotSummary {
  id: string;
  sceneId: string;
  name: string;
  sceneVersion: number;
  createdAt: string;
}

export interface TabletopSaveOverrides {
  name?: string;
  status?: SceneRow["status"];
  orderIndex?: number;
}

export interface TabletopSavePayload {
  sceneDocument: Json;
  layerDocuments: Json[];
  entityDocuments: Json[];
  deletedEntityDocuments: Json[];
}

export function moveTabletopScene(
  scenes: TabletopSceneSummary[],
  sceneId: string,
  direction: -1 | 1,
) {
  const index = scenes.findIndex((scene) => scene.id === sceneId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= scenes.length) return scenes;
  const reordered = [...scenes];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered.map((scene, orderIndex) => ({ ...scene, orderIndex }));
}

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

function numeric(value: number | string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fitTabletopAssetSize(
  width: number | null,
  height: number | null,
  maxSize = 256,
) {
  const sourceWidth = width && width > 0 ? width : 128;
  const sourceHeight = height && height > 0 ? height : 96;
  const scale = Math.min(1, maxSize / Math.max(sourceWidth, sourceHeight));
  return {
    width: Math.max(32, Math.round(sourceWidth * scale)),
    height: Math.max(32, Math.round(sourceHeight * scale)),
  };
}

function requireName(value: string, max = 160) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max)
    throw new TabletopServiceError("TABLETOP_INVALID_INPUT");
  return normalized;
}

function serviceError(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? "";
  if (error?.code === "40001" || message.includes("TABLETOP_VERSION_CONFLICT"))
    return new TabletopServiceError("TABLETOP_CONFLICT");
  if (error?.code === "42501" && message.includes("TABLETOP_AUTH_REQUIRED"))
    return new TabletopServiceError("TABLETOP_AUTH_REQUIRED");
  if (error?.code?.startsWith("22") || error?.code === "23514")
    return new TabletopServiceError("TABLETOP_INVALID_INPUT");
  return new TabletopServiceError("TABLETOP_DATABASE_ERROR");
}

export function buildTabletopSavePayload(
  original: PersistedTabletopScene,
  current: TabletopScene,
  overrides: TabletopSaveOverrides = {},
): TabletopSavePayload {
  const originalLayers = new Map(
    original.layers.map((layer) => [layer.id, layer]),
  );
  const originalLevels = new Map(
    original.levels.map((level) => [level.id, level]),
  );
  const originalEntities = new Map(
    original.entities.map((entity) => [entity.id, entity]),
  );
  const currentEntityIds = new Set(current.entities.map((entity) => entity.id));
  const hasBackgroundAsset = Object.prototype.hasOwnProperty.call(
    current,
    "backgroundAssetId",
  );

  const layerDocuments = current.layers.map((layer) => {
    const persisted = originalLayers.get(layer.id);
    if (!persisted) throw new TabletopServiceError("TABLETOP_INVALID_INPUT");
    return {
      id: layer.id,
      name: layer.name,
      layer_type: persisted.layerType,
      order_index: layer.order,
      visible: layer.visible,
      locked: layer.locked,
      version: persisted.version,
    } as Json;
  });

  const entityDocuments = current.entities.map((entity) => {
    const persisted = originalEntities.get(entity.id);
    const runtime = entity as TabletopEntity & Partial<PersistedTabletopEntity>;
    const has = (key: keyof PersistedTabletopEntity) =>
      Object.prototype.hasOwnProperty.call(runtime, key);
    return {
      id: entity.id,
      layer_id: entity.layerId,
      entity_type: entity.type,
      name: entity.label,
      linked_sheet_id: has("linkedSheetId")
        ? (runtime.linkedSheetId ?? null)
        : (persisted?.linkedSheetId ?? null),
      linked_knowledge_node_id: has("linkedKnowledgeNodeId")
        ? (runtime.linkedKnowledgeNodeId ?? null)
        : (persisted?.linkedKnowledgeNodeId ?? null),
      asset_id: has("assetId")
        ? (runtime.assetId ?? null)
        : (persisted?.assetId ?? null),
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
      rotation: entity.rotation,
      elevation: has("elevation")
        ? (runtime.elevation ?? 0)
        : (persisted?.elevation ?? 0),
      level_id: has("levelId")
        ? (runtime.levelId ?? original.levels[0]?.id)
        : (persisted?.levelId ?? original.levels[0]?.id),
      z_index: entity.zIndex,
      hidden: entity.hidden,
      locked: entity.locked,
      owner_user_id: has("ownerUserId")
        ? (runtime.ownerUserId ?? null)
        : (persisted?.ownerUserId ?? null),
      properties: has("properties")
        ? ((runtime.properties ?? {}) as Json)
        : (persisted?.properties ?? {}),
      version: persisted?.version ?? 0,
    } as Json;
  });

  return {
    sceneDocument: {
      name: overrides.name ?? current.name,
      background_asset_id: hasBackgroundAsset
        ? (current.backgroundAssetId ?? null)
        : original.backgroundAssetId,
      width: current.width,
      height: current.height,
      grid_type: current.gridMode,
      grid_size: current.gridSize,
      grid_offset_x: original.gridOffsetX,
      grid_offset_y: original.gridOffsetY,
      grid_scale: current.gridScale,
      snap_enabled: current.snap,
      global_illumination: original.globalIllumination,
      status: overrides.status ?? original.status,
      order_index: overrides.orderIndex ?? original.orderIndex,
      levels: (current.levels ?? original.levels).map((level) => ({
        id: level.id,
        name: level.name,
        order_index: level.order,
        base_elevation: level.baseElevation,
        height: level.height,
        visible: level.visible,
        locked: level.locked,
        version: originalLevels.get(level.id)?.version ?? level.version ?? 0,
      })),
    },
    layerDocuments,
    entityDocuments,
    deletedEntityDocuments: original.entities
      .filter((entity) => !currentEntityIds.has(entity.id))
      .map((entity) => ({ id: entity.id, version: entity.version }) as Json),
  };
}

export function mapTabletopScene(
  scene: SceneRow,
  layers: LayerRow[],
  entities: EntityRow[],
  levels: LevelRow[] = [],
): PersistedTabletopScene {
  return {
    id: scene.id,
    campaignId: scene.campaign_id,
    name: scene.name,
    backgroundAssetId: scene.background_asset_id,
    width: scene.width,
    height: scene.height,
    gridMode: scene.grid_type,
    gridSize: scene.grid_size,
    gridScale: numeric(scene.grid_scale),
    gridOffsetX: numeric(scene.grid_offset_x),
    gridOffsetY: numeric(scene.grid_offset_y),
    globalIllumination: numeric(scene.global_illumination),
    snap: scene.snap_enabled,
    backgroundAssetUrl: undefined,
    status: scene.status,
    orderIndex: scene.order_index,
    version: scene.version,
    createdAt: scene.created_at,
    updatedAt: scene.updated_at,
    levels: levels.map((level) => ({
      id: level.id,
      sceneId: level.scene_id,
      name: level.name,
      order: level.order_index,
      baseElevation: numeric(level.base_elevation),
      height: numeric(level.height),
      visible: level.visible,
      locked: level.locked,
      version: level.version,
    })),
    layers: layers.map((layer) => ({
      id: layer.id,
      name: layer.name,
      order: layer.order_index,
      visible: layer.visible,
      locked: layer.locked,
      layerType: layer.layer_type,
      version: layer.version,
    })),
    entities: entities.map((entity) => ({
      id: entity.id,
      sceneId: entity.scene_id,
      layerId: entity.layer_id,
      type: entity.entity_type,
      label: entity.name,
      x: numeric(entity.x),
      y: numeric(entity.y),
      width: numeric(entity.width),
      height: numeric(entity.height),
      rotation: numeric(entity.rotation),
      elevation: numeric(entity.elevation),
      levelId: entity.level_id,
      zIndex: entity.z_index,
      hidden: entity.hidden,
      locked: entity.locked,
      color: ENTITY_COLORS[entity.entity_type] ?? 0x4f5560,
      version: entity.version,
      assetId: entity.asset_id,
      linkedSheetId: entity.linked_sheet_id,
      linkedKnowledgeNodeId: entity.linked_knowledge_node_id,
      ownerUserId: entity.owner_user_id,
      properties: entity.properties,
    })),
  };
}

export class TabletopPersistenceService {
  constructor(
    private readonly database: SupabaseClient = tabletopDatabase,
    private readonly auth = supabase.auth,
  ) {}

  private async userId() {
    const { data } = await this.auth.getSession();
    if (!data.session?.user.id)
      throw new TabletopServiceError("TABLETOP_AUTH_REQUIRED");
    return data.session.user.id;
  }

  async listCampaigns(): Promise<TabletopCampaignSummary[]> {
    const { data, error } = await this.database
      .from("campaigns")
      .select("id,name,workspace_id,status")
      .eq("status", "active")
      .order("name");
    if (error) throw serviceError(error);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      workspaceId: String(row.workspace_id),
      status: String(row.status),
    }));
  }

  async listEntityLinkTargets(
    campaignId: string,
    workspaceId: string,
  ): Promise<TabletopEntityLinkTargets> {
    const [sheetsResult, knowledgeResult] = await Promise.all([
      this.database
        .from("character_sheets")
        .select("id,name,owner_id")
        .eq("campaign_id", campaignId)
        .order("name"),
      this.database
        .from("knowledge_nodes")
        .select("id,title,node_type")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .neq("status", "archived")
        .or(`campaign_id.is.null,campaign_id.eq.${campaignId}`)
        .order("title")
        .limit(500),
    ]);
    if (sheetsResult.error || knowledgeResult.error)
      throw serviceError(sheetsResult.error ?? knowledgeResult.error);
    return {
      sheets: (sheetsResult.data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        ownerId: String(row.owner_id),
      })),
      knowledge: (knowledgeResult.data ?? []).map((row) => ({
        id: String(row.id),
        title: String(row.title),
        nodeType: String(row.node_type),
      })),
    };
  }

  async listPaletteAssets(
    workspaceId: string,
    campaignId: string,
  ): Promise<TabletopAssetTarget[]> {
    const { data, error } = await this.database
      .from("assets")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "ready")
      .is("deleted_at", null)
      .like("mime_type", "image/%")
      .or(`campaign_id.is.null,campaign_id.eq.${campaignId}`)
      .order("created_at", { ascending: false })
      .limit(48);
    if (error) throw serviceError(error);
    return Promise.all(
      ((data ?? []) as NexusAsset[]).map(async (asset) => {
        const size = fitTabletopAssetSize(asset.width, asset.height);
        const previewUrl = await assetService
          .createTemporaryAccess(asset, 300)
          .catch(() => undefined);
        return {
          id: asset.id,
          displayName: asset.display_name,
          mimeType: asset.mime_type,
          ...size,
          previewUrl,
        };
      }),
    );
  }

  async listScenes(campaignId: string): Promise<TabletopSceneSummary[]> {
    const { data, error } = await this.database
      .from("tabletop_scenes")
      .select("id,campaign_id,name,status,order_index,version,updated_at")
      .eq("campaign_id", campaignId)
      .order("order_index")
      .order("created_at");
    if (error) throw serviceError(error);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      campaignId: String(row.campaign_id),
      name: String(row.name),
      status: row.status as SceneRow["status"],
      orderIndex: Number(row.order_index),
      version: Number(row.version),
      updatedAt: String(row.updated_at),
    }));
  }

  async reorderScenes(
    campaignId: string,
    orderedScenes: TabletopSceneSummary[],
  ) {
    await this.userId();
    const { error } = await this.database.rpc("reorder_tabletop_scenes", {
      target_campaign_id: campaignId,
      scene_documents: orderedScenes.map((scene, orderIndex) => ({
        id: scene.id,
        version: scene.version,
        order_index: orderIndex,
      })),
    });
    if (error) throw serviceError(error);
    return this.listScenes(campaignId);
  }

  async loadScene(sceneId: string) {
    const [{ data: scene, error }, levelsResult, layersResult, entitiesResult] =
      await Promise.all([
        this.database
          .from("tabletop_scenes")
          .select("*")
          .eq("id", sceneId)
          .maybeSingle(),
        this.database
          .from("tabletop_levels")
          .select("*")
          .eq("scene_id", sceneId)
          .order("order_index"),
        this.database
          .from("tabletop_layers")
          .select("*")
          .eq("scene_id", sceneId)
          .order("order_index"),
        this.database
          .from("tabletop_entities")
          .select("*")
          .eq("scene_id", sceneId)
          .order("z_index"),
      ]);
    if (
      error ||
      levelsResult.error ||
      layersResult.error ||
      entitiesResult.error
    )
      throw serviceError(
        error ??
          levelsResult.error ??
          layersResult.error ??
          entitiesResult.error,
      );
    if (!scene) throw new TabletopServiceError("TABLETOP_NOT_FOUND");
    const mapped = mapTabletopScene(
      scene as SceneRow,
      (layersResult.data ?? []) as LayerRow[],
      (entitiesResult.data ?? []) as EntityRow[],
      (levelsResult.data ?? []) as LevelRow[],
    );
    return this.withTemporaryAssetUrls(mapped);
  }

  private async withTemporaryAssetUrls(scene: PersistedTabletopScene) {
    const assetIds = [
      ...new Set(
        [
          scene.backgroundAssetId,
          ...scene.entities.map((entity) => entity.assetId),
        ].filter((id): id is string => Boolean(id)),
      ),
    ];
    if (assetIds.length === 0) return scene;

    const { data, error } = await this.database
      .from("assets")
      .select("*")
      .in("id", assetIds)
      .eq("status", "ready")
      .is("deleted_at", null);
    if (error) throw serviceError(error);

    const urls = new Map(
      (
        await Promise.all(
          ((data ?? []) as NexusAsset[]).map(async (asset) => {
            const url = await assetService
              .createTemporaryAccess(asset, 300)
              .catch(() => undefined);
            return url ? ([asset.id, url] as const) : null;
          }),
        )
      ).filter((entry): entry is readonly [string, string] => entry !== null),
    );
    return {
      ...scene,
      backgroundAssetUrl: scene.backgroundAssetId
        ? urls.get(scene.backgroundAssetId)
        : undefined,
      entities: scene.entities.map((entity) => ({
        ...entity,
        assetUrl: entity.assetId ? urls.get(entity.assetId) : undefined,
      })),
    };
  }

  async createScene(campaignId: string, name: string) {
    const userId = await this.userId();
    const { data, error } = await this.database
      .from("tabletop_scenes")
      .insert({
        campaign_id: campaignId,
        name: requireName(name),
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (error || !data) throw serviceError(error);
    return this.loadScene(String(data.id));
  }

  async saveScene(scene: PersistedTabletopScene) {
    const userId = await this.userId();
    const { data, error } = await this.database
      .from("tabletop_scenes")
      .update({
        name: requireName(scene.name),
        width: scene.width,
        height: scene.height,
        grid_type: scene.gridMode,
        grid_size: scene.gridSize,
        grid_offset_x: scene.gridOffsetX,
        grid_offset_y: scene.gridOffsetY,
        grid_scale: scene.gridScale,
        snap_enabled: scene.snap,
        background_asset_id: scene.backgroundAssetId,
        global_illumination: scene.globalIllumination,
        status: scene.status,
        order_index: scene.orderIndex,
        updated_by: userId,
      })
      .eq("id", scene.id)
      .eq("version", scene.version)
      .select("*")
      .maybeSingle();
    if (error) throw serviceError(error);
    if (!data) throw new TabletopServiceError("TABLETOP_CONFLICT");
    return this.loadScene(scene.id);
  }

  async saveWorkspace(
    original: PersistedTabletopScene,
    current: TabletopScene,
    overrides: TabletopSaveOverrides = {},
  ) {
    await this.userId();
    const payload = buildTabletopSavePayload(original, current, overrides);
    const { error } = await this.database.rpc("save_tabletop_scene_state", {
      target_scene_id: original.id,
      expected_scene_version: original.version,
      scene_document: payload.sceneDocument,
      layer_documents: payload.layerDocuments,
      entity_documents: payload.entityDocuments,
      deleted_entity_documents: payload.deletedEntityDocuments,
    });
    if (error) throw serviceError(error);
    return this.loadScene(original.id);
  }

  async saveEntity(sceneId: string, entity: PersistedTabletopEntity) {
    const userId = await this.userId();
    const values = {
      scene_id: sceneId,
      layer_id: entity.layerId,
      entity_type: entity.type,
      name: requireName(entity.label, 240),
      linked_sheet_id: entity.linkedSheetId,
      linked_knowledge_node_id: entity.linkedKnowledgeNodeId,
      asset_id: entity.assetId,
      level_id: entity.levelId,
      x: entity.x,
      y: entity.y,
      width: entity.width,
      height: entity.height,
      rotation: entity.rotation,
      elevation: entity.elevation,
      z_index: entity.zIndex,
      hidden: entity.hidden,
      locked: entity.locked,
      owner_user_id: entity.ownerUserId,
      properties: entity.properties,
      updated_by: userId,
    };
    const query =
      entity.version > 0
        ? this.database
            .from("tabletop_entities")
            .update(values)
            .eq("id", entity.id)
            .eq("version", entity.version)
        : this.database
            .from("tabletop_entities")
            .insert({ ...values, id: entity.id, created_by: userId });
    const { data, error } = await query.select("*").maybeSingle();
    if (error) throw serviceError(error);
    if (!data) throw new TabletopServiceError("TABLETOP_CONFLICT");
    return mapTabletopScene(
      {
        id: sceneId,
        campaign_id: "",
        name: "",
        background_asset_id: null,
        width: 64,
        height: 64,
        grid_type: "none",
        grid_size: 64,
        grid_offset_x: 0,
        grid_offset_y: 0,
        grid_scale: 1,
        snap_enabled: false,
        global_illumination: 1,
        status: "active",
        order_index: 0,
        version: 1,
        created_at: "",
        updated_at: "",
      },
      [],
      [data as EntityRow],
      [],
    ).entities[0];
  }

  async deleteEntity(entity: PersistedTabletopEntity) {
    const { data, error } = await this.database
      .from("tabletop_entities")
      .delete()
      .eq("id", entity.id)
      .eq("version", entity.version)
      .select("id")
      .maybeSingle();
    if (error) throw serviceError(error);
    if (!data) throw new TabletopServiceError("TABLETOP_CONFLICT");
  }

  async createSnapshot(sceneId: string, name: string) {
    const { data, error } = await this.database.rpc(
      "create_tabletop_scene_snapshot",
      {
        target_scene_id: sceneId,
        snapshot_name: requireName(name),
      },
    );
    if (error) throw serviceError(error);
    return String(data);
  }

  async listSnapshots(
    sceneId: string,
  ): Promise<TabletopSceneSnapshotSummary[]> {
    const { data, error } = await this.database
      .from("tabletop_scene_snapshots")
      .select("id,scene_id,name,scene_version,created_at")
      .eq("scene_id", sceneId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw serviceError(error);
    return (data ?? []).map((row) => ({
      id: String(row.id),
      sceneId: String(row.scene_id),
      name: String(row.name),
      sceneVersion: Number(row.scene_version),
      createdAt: String(row.created_at),
    }));
  }

  async restoreSnapshot(snapshotId: string, expectedVersion: number) {
    const { data, error } = await this.database.rpc(
      "restore_tabletop_scene_snapshot",
      {
        target_snapshot_id: snapshotId,
        expected_scene_version: expectedVersion,
      },
    );
    if (error) throw serviceError(error);
    return Number(data);
  }

  async duplicateScene(sceneId: string, name?: string) {
    const { data, error } = await this.database.rpc(
      "duplicate_tabletop_scene",
      {
        source_scene_id: sceneId,
        duplicate_name: name?.trim() || null,
      },
    );
    if (error) throw serviceError(error);
    return this.loadScene(String(data));
  }
}

export const tabletopPersistenceService = new TabletopPersistenceService();
