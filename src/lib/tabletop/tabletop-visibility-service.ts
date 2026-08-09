import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  isTabletopStructureType,
  type TabletopStructureType,
} from "./tabletop-spatial";

const visibilityDatabase = supabase as unknown as SupabaseClient;

export interface TabletopWall {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: TabletopStructureType;
  blocksVision: boolean;
  blocksMovement: boolean;
}

export interface TabletopLight {
  id: string;
  entityId: string | null;
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
  enabled: boolean;
  castsShadows: boolean;
  visibilityPolygon?: Array<{ x: number; y: number }>;
}

export interface TabletopFogStroke {
  id: string;
  operation: "reveal" | "hide";
  points: Array<{ x: number; y: number }>;
  radius: number;
  sequenceIndex: number;
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
  return {
    ...EMPTY_TABLETOP_VISIBILITY,
    walls: [],
    lights: [],
    fogStrokes: [],
  };
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

export function clampVisibilityState(
  state: TabletopVisibilityState,
): TabletopVisibilityState {
  return {
    ...state,
    version: Math.max(1, Math.trunc(finite(state.version, 1))),
    globalIllumination: Math.max(
      0,
      Math.min(1, finite(state.globalIllumination, 1)),
    ),
    fogOpacity: Math.max(0, Math.min(1, finite(state.fogOpacity, 0.92))),
    walls: state.walls.slice(0, 512).map((wall) => ({
      ...wall,
      wallType: isTabletopStructureType(wall.wallType) ? wall.wallType : "wall",
    })),
    lights: state.lights.slice(0, 256).map((light) => ({
      ...light,
      radius: Math.max(8, Math.min(100_000, finite(light.radius, 320))),
      intensity: Math.max(0, Math.min(1, finite(light.intensity, 1))),
      visibilityPolygon: light.visibilityPolygon
        ?.slice(0, 2048)
        .map((point) => ({ x: finite(point.x), y: finite(point.y) })),
    })),
    fogStrokes: state.fogStrokes.slice(0, 512).map((stroke, index) => ({
      ...stroke,
      points: stroke.points.slice(0, 64),
      radius: Math.max(8, Math.min(1024, finite(stroke.radius, 160))),
      sequenceIndex: index,
    })),
  };
}

export class TabletopVisibilityService {
  constructor(private readonly database: SupabaseClient = visibilityDatabase) {}

  async load(sceneId: string): Promise<TabletopVisibilityState> {
    const [sceneResult, wallResult, lightResult, fogResult] = await Promise.all(
      [
        this.database
          .from("tabletop_scenes")
          .select(
            "global_illumination,fog_enabled,fog_opacity,visibility_version",
          )
          .eq("id", sceneId)
          .single(),
        this.database
          .from("tabletop_walls")
          .select("id,x1,y1,x2,y2,wall_type,blocks_vision,blocks_movement")
          .eq("scene_id", sceneId)
          .order("created_at"),
        this.database
          .from("tabletop_lights")
          .select(
            "id,entity_id,x,y,radius,intensity,color,enabled,casts_shadows",
          )
          .eq("scene_id", sceneId)
          .order("created_at"),
        this.database
          .from("tabletop_fog_strokes")
          .select("id,operation,points,radius,sequence_index")
          .eq("scene_id", sceneId)
          .order("sequence_index"),
      ],
    );
    const error =
      sceneResult.error ||
      wallResult.error ||
      lightResult.error ||
      fogResult.error;
    if (error) throw serviceError(error);
    const scene = sceneResult.data;
    return clampVisibilityState({
      version: scene.visibility_version,
      globalIllumination: finite(scene.global_illumination, 1),
      fogEnabled: scene.fog_enabled,
      fogOpacity: finite(scene.fog_opacity, 0.92),
      walls: (wallResult.data ?? []).map((wall) => ({
        id: wall.id,
        x1: finite(wall.x1),
        y1: finite(wall.y1),
        x2: finite(wall.x2),
        y2: finite(wall.y2),
        wallType: isTabletopStructureType(wall.wall_type)
          ? wall.wall_type
          : "wall",
        blocksVision: wall.blocks_vision,
        blocksMovement: wall.blocks_movement,
      })),
      lights: (lightResult.data ?? []).map((light) => ({
        id: light.id,
        entityId: light.entity_id,
        x: finite(light.x),
        y: finite(light.y),
        radius: finite(light.radius, 320),
        intensity: finite(light.intensity, 1),
        color: light.color,
        enabled: light.enabled,
        castsShadows: light.casts_shadows,
      })),
      fogStrokes: (fogResult.data ?? []).map((stroke) => ({
        id: stroke.id,
        operation: stroke.operation,
        points: Array.isArray(stroke.points)
          ? stroke.points.map((point: { x?: unknown; y?: unknown }) => ({
              x: finite(point.x),
              y: finite(point.y),
            }))
          : [],
        radius: finite(stroke.radius, 160),
        sequenceIndex: stroke.sequence_index,
      })),
    });
  }

  async save(sceneId: string, state: TabletopVisibilityState) {
    const normalized = clampVisibilityState(state);
    const { data, error } = await this.database.rpc(
      "save_tabletop_visibility_state",
      {
        target_scene_id: sceneId,
        expected_visibility_version: normalized.version,
        illumination: normalized.globalIllumination,
        fog_enabled: normalized.fogEnabled,
        fog_opacity: normalized.fogOpacity,
        wall_documents: normalized.walls.map((wall) => ({
          id: wall.id,
          x1: wall.x1,
          y1: wall.y1,
          x2: wall.x2,
          y2: wall.y2,
          wall_type: wall.wallType,
          blocks_vision: wall.blocksVision,
          blocks_movement: wall.blocksMovement,
        })),
        light_documents: normalized.lights.map((light) => ({
          id: light.id,
          entity_id: light.entityId,
          x: light.x,
          y: light.y,
          radius: light.radius,
          intensity: light.intensity,
          color: light.color,
          enabled: light.enabled,
          casts_shadows: light.castsShadows,
        })),
        fog_documents: normalized.fogStrokes.map((stroke) => ({
          id: stroke.id,
          operation: stroke.operation,
          points: stroke.points,
          radius: stroke.radius,
          sequence_index: stroke.sequenceIndex,
        })),
      },
    );
    if (error || typeof data !== "number") throw serviceError(error);
    const { data: scene, error: sceneError } = await this.database
      .from("tabletop_scenes")
      .select("version")
      .eq("id", sceneId)
      .single();
    if (sceneError || typeof scene?.version !== "number")
      throw serviceError(sceneError);
    return {
      visibility: { ...normalized, version: data },
      sceneVersion: scene.version,
    };
  }
}

export const tabletopVisibilityService = new TabletopVisibilityService();
