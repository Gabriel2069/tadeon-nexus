import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  isTabletopStructureType,
  structureChannels,
  type TabletopStructureChannels,
  type TabletopStructureType,
} from "./tabletop-spatial";

const visibilityDatabase = supabase as unknown as SupabaseClient;

export interface TabletopWall {
  id: string;
  levelId?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: TabletopStructureType;
  blocksVision: boolean;
  blocksMovement: boolean;
  baseElevation?: number;
  height?: number;
  thickness?: number;
  playerOperable?: boolean;
  properties?: Partial<TabletopStructureChannels>;
  version?: number;
}

export type TabletopLightShape = "radial" | "cone" | "line" | "rectangle";
export interface TabletopLightProperties {
  shape?: TabletopLightShape;
  angle?: number;
  direction?: number;
  falloff?: number;
  softness?: number;
  temperature?: number;
  flicker?: number;
  particles?: "none" | "dust" | "embers" | "mist" | "sparks";
}

export interface TabletopLight {
  id: string;
  levelId?: string;
  entityId: string | null;
  x: number;
  y: number;
  elevation?: number;
  radius: number;
  intensity: number;
  color: string;
  enabled: boolean;
  castsShadows: boolean;
  properties?: TabletopLightProperties;
  visibilityPolygon?: Array<{ x: number; y: number }>;
}

export type TabletopFogShape = "brush" | "rectangle" | "ellipse" | "polygon";

export type TabletopFogAudience =
  | { scope: "global" }
  | { scope: "users"; userIds: string[] }
  | { scope: "roles"; roles: string[] };

export function isTabletopFogShape(value: unknown): value is TabletopFogShape {
  return value === "brush" || value === "rectangle" || value === "ellipse" || value === "polygon";
}

export function normalizeTabletopFogAudience(value: unknown): TabletopFogAudience {
  const source = objectValue(value);
  if (source.scope === "users") {
    const userIds = Array.isArray(source.userIds)
      ? source.userIds.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 128)
      : [];
    return userIds.length > 0 ? { scope: "users", userIds } : { scope: "global" };
  }
  if (source.scope === "roles") {
    const roles = Array.isArray(source.roles)
      ? source.roles.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 16)
      : [];
    return roles.length > 0 ? { scope: "roles", roles } : { scope: "global" };
  }
  return { scope: "global" };
}

export interface TabletopFogStroke {
  id: string;
  levelId?: string;
  operation: "reveal" | "hide";
  shape: TabletopFogShape;
  points: Array<{ x: number; y: number }>;
  radius: number;
  sequenceIndex: number;
  audience?: TabletopFogAudience;
}

export interface TabletopVisibilityState {
  version: number;
  globalIllumination: number;
  fogEnabled: boolean;
  fogOpacity: number;
  walls: TabletopWall[];
  lights: TabletopLight[];
  fogStrokes: TabletopFogStroke[];
}

export const EMPTY_TABLETOP_VISIBILITY: TabletopVisibilityState = {
  version: 1,
  globalIllumination: 1,
  fogEnabled: false,
  fogOpacity: 0.92,
  walls: [],
  lights: [],
  fogStrokes: [],
};

export function createEmptyVisibilityState(): TabletopVisibilityState {
  return { ...EMPTY_TABLETOP_VISIBILITY, walls: [], lights: [], fogStrokes: [] };
}

export type TabletopVisibilityErrorCode =
  | "TABLETOP_VISIBILITY_DISABLED"
  | "TABLETOP_VISIBILITY_FORBIDDEN"
  | "TABLETOP_VISIBILITY_CONFLICT"
  | "TABLETOP_VISIBILITY_INVALID"
  | "TABLETOP_VISIBILITY_DATABASE_ERROR";

export class TabletopVisibilityError extends Error {
  constructor(public readonly code: TabletopVisibilityErrorCode) {
    super(code);
    this.name = "TabletopVisibilityError";
  }
}

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function lightProperties(value: unknown): TabletopLightProperties {
  const source = objectValue(value);
  const shape: TabletopLightShape =
    source.shape === "cone" || source.shape === "line" || source.shape === "rectangle"
      ? source.shape
      : "radial";
  const particles =
    source.particles === "dust" || source.particles === "embers" || source.particles === "mist" || source.particles === "sparks"
      ? source.particles
      : "none";
  return {
    shape,
    angle: Math.max(1, Math.min(360, finite(source.angle, 90))),
    direction: finite(source.direction, 0) % 360,
    falloff: Math.max(0.1, Math.min(4, finite(source.falloff, 1.4))),
    softness: Math.max(0, Math.min(1, finite(source.softness, 0.4))),
    temperature: Math.max(1000, Math.min(12000, finite(source.temperature, 4200))),
    flicker: Math.max(0, Math.min(1, finite(source.flicker, 0))),
    particles,
  };
}

function serviceError(error: { code?: string; message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("TABLETOP_LIGHTING_DISABLED"))
    return new TabletopVisibilityError("TABLETOP_VISIBILITY_DISABLED");
  if (error?.code === "40001" || message.includes("VERSION_CONFLICT"))
    return new TabletopVisibilityError("TABLETOP_VISIBILITY_CONFLICT");
  if (error?.code === "42501" || message.includes("FORBIDDEN"))
    return new TabletopVisibilityError("TABLETOP_VISIBILITY_FORBIDDEN");
  if (error?.code?.startsWith("22") || error?.code === "23514")
    return new TabletopVisibilityError("TABLETOP_VISIBILITY_INVALID");
  return new TabletopVisibilityError("TABLETOP_VISIBILITY_DATABASE_ERROR");
}

export function clampVisibilityState(state: TabletopVisibilityState): TabletopVisibilityState {
  return {
    ...state,
    version: Math.max(1, Math.trunc(finite(state.version, 1))),
    globalIllumination: Math.max(0, Math.min(1, finite(state.globalIllumination, 1))),
    fogOpacity: Math.max(0, Math.min(1, finite(state.fogOpacity, 0.92))),
    walls: state.walls.slice(0, 512).map((wall) => ({
      ...wall,
      wallType: isTabletopStructureType(wall.wallType) ? wall.wallType : "wall",
      baseElevation: Math.max(-100_000, Math.min(100_000, finite(wall.baseElevation))),
      height: Math.max(8, Math.min(100_000, finite(wall.height, 64))),
      thickness: Math.max(1, Math.min(1024, finite(wall.thickness, 8))),
      properties: structureChannels(
        isTabletopStructureType(wall.wallType) ? wall.wallType : "wall",
        wall.properties,
      ),
      version: Math.max(1, Math.trunc(finite(wall.version, 1))),
    })),
    lights: state.lights.slice(0, 256).map((light) => ({
      ...light,
      elevation: Math.max(-100_000, Math.min(100_000, finite(light.elevation))),
      radius: Math.max(8, Math.min(100_000, finite(light.radius, 320))),
      intensity: Math.max(0, Math.min(1, finite(light.intensity, 1))),
      properties: lightProperties(light.properties),
      visibilityPolygon: light.visibilityPolygon
        ?.slice(0, 2048)
        .map((point) => ({ x: finite(point.x), y: finite(point.y) })),
    })),
    fogStrokes: state.fogStrokes.slice(0, 512).map((stroke, index) => ({
      ...stroke,
      shape: isTabletopFogShape(stroke.shape) ? stroke.shape : "brush",
      points: stroke.points.slice(0, 64),
      radius: Math.max(8, Math.min(1024, finite(stroke.radius, 160))),
      sequenceIndex: index,
      audience: normalizeTabletopFogAudience(stroke.audience),
    })),
  };
}

export class TabletopVisibilityService {
  constructor(private readonly database: SupabaseClient = visibilityDatabase) {}

  async load(sceneId: string): Promise<TabletopVisibilityState> {
    const [sceneResult, wallResult, lightResult, fogResult] = await Promise.all([
      this.database
        .from("tabletop_scenes")
        .select("global_illumination,fog_enabled,fog_opacity,visibility_version")
        .eq("id", sceneId)
        .single(),
      this.database
        .from("tabletop_walls")
        .select("id,level_id,x1,y1,x2,y2,wall_type,blocks_vision,blocks_movement,base_elevation,height,thickness,player_operable,properties,version")
        .eq("scene_id", sceneId)
        .order("created_at"),
      this.database
        .from("tabletop_lights")
        .select("id,level_id,entity_id,x,y,elevation,radius,intensity,color,enabled,casts_shadows,properties")
        .eq("scene_id", sceneId)
        .order("created_at"),
      this.database
        .from("tabletop_fog_strokes")
        .select("id,level_id,operation,geometry,points,radius,sequence_index,audience")
        .eq("scene_id", sceneId)
        .order("sequence_index"),
    ]);
    const error = sceneResult.error || wallResult.error || lightResult.error || fogResult.error;
    if (error) throw serviceError(error);
    const scene = sceneResult.data;
    return clampVisibilityState({
      version: scene.visibility_version,
      globalIllumination: finite(scene.global_illumination, 1),
      fogEnabled: scene.fog_enabled,
      fogOpacity: finite(scene.fog_opacity, 0.92),
      walls: (wallResult.data ?? []).map((wall) => ({
        id: wall.id,
        levelId: wall.level_id,
        x1: finite(wall.x1),
        y1: finite(wall.y1),
        x2: finite(wall.x2),
        y2: finite(wall.y2),
        wallType: isTabletopStructureType(wall.wall_type) ? wall.wall_type : "wall",
        blocksVision: wall.blocks_vision,
        blocksMovement: wall.blocks_movement,
        baseElevation: finite(wall.base_elevation),
        height: finite(wall.height, 64),
        thickness: finite(wall.thickness, 8),
        playerOperable: wall.player_operable,
        properties: objectValue(wall.properties) as Partial<TabletopStructureChannels>,
        version: Math.max(1, Math.trunc(finite(wall.version, 1))),
      })),
      lights: (lightResult.data ?? []).map((light) => ({
        id: light.id,
        levelId: light.level_id,
        entityId: light.entity_id,
        x: finite(light.x),
        y: finite(light.y),
        elevation: finite(light.elevation),
        radius: finite(light.radius, 320),
        intensity: finite(light.intensity, 1),
        color: light.color,
        enabled: light.enabled,
        castsShadows: light.casts_shadows,
        properties: lightProperties(light.properties),
      })),
      fogStrokes: (fogResult.data ?? []).map((stroke) => ({
        id: stroke.id,
        levelId: stroke.level_id,
        operation: stroke.operation,
        shape: isTabletopFogShape(stroke.geometry) ? stroke.geometry : "brush",
        points: Array.isArray(stroke.points)
          ? stroke.points.map((point: { x?: unknown; y?: unknown }) => ({ x: finite(point.x), y: finite(point.y) }))
          : [],
        radius: finite(stroke.radius, 160),
        sequenceIndex: stroke.sequence_index,
        audience: normalizeTabletopFogAudience(stroke.audience),
      })),
    });
  }

  async save(sceneId: string, state: TabletopVisibilityState) {
    const normalized = clampVisibilityState(state);
    const { data, error } = await this.database.rpc("save_tabletop_visibility_state", {
      target_scene_id: sceneId,
      expected_visibility_version: normalized.version,
      illumination: normalized.globalIllumination,
      fog_enabled: normalized.fogEnabled,
      fog_opacity: normalized.fogOpacity,
      wall_documents: normalized.walls.map((wall) => ({
        id: wall.id,
        level_id: wall.levelId,
        x1: wall.x1,
        y1: wall.y1,
        x2: wall.x2,
        y2: wall.y2,
        wall_type: wall.wallType,
        blocks_vision: wall.blocksVision,
        blocks_movement: wall.blocksMovement,
        base_elevation: wall.baseElevation,
        height: wall.height,
        thickness: wall.thickness,
        player_operable: wall.playerOperable,
        properties: wall.properties ?? {},
      })),
      light_documents: normalized.lights.map((light) => ({
        id: light.id,
        level_id: light.levelId,
        entity_id: light.entityId,
        x: light.x,
        y: light.y,
        elevation: light.elevation,
        radius: light.radius,
        intensity: light.intensity,
        color: light.color,
        enabled: light.enabled,
        casts_shadows: light.castsShadows,
        properties: light.properties ?? {},
      })),
      fog_documents: normalized.fogStrokes.map((stroke) => ({
        id: stroke.id,
        level_id: stroke.levelId,
        operation: stroke.operation,
        geometry: stroke.shape,
        points: stroke.points,
        radius: stroke.radius,
        sequence_index: stroke.sequenceIndex,
        audience: normalizeTabletopFogAudience(stroke.audience),
      })),
    });
    if (error || typeof data !== "number") throw serviceError(error);
    const { data: scene, error: sceneError } = await this.database
      .from("tabletop_scenes")
      .select("version")
      .eq("id", sceneId)
      .single();
    if (sceneError || typeof scene?.version !== "number") throw serviceError(sceneError);
    return { visibility: { ...normalized, version: data }, sceneVersion: scene.version };
  }
}

export const tabletopVisibilityService = new TabletopVisibilityService();
