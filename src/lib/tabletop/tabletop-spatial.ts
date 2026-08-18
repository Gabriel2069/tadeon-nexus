import type { Point } from "./types";

export type TabletopStructureType =
  | "wall"
  | "barrier"
  | "door_closed"
  | "door_open"
  | "door_locked"
  | "door_secret"
  | "window_closed"
  | "window_open"
  | "window_broken"
  | "roof_visible"
  | "roof_cutaway"
  | "roof_hidden";

export type TabletopStructureFamily = "wall" | "barrier" | "door" | "window" | "roof";
export type TabletopStructureMaterial =
  | "stone"
  | "wood"
  | "metal"
  | "glass"
  | "fabric"
  | "force"
  | "custom";

export interface TabletopStructureChannels {
  material: TabletopStructureMaterial;
  blocksLight: boolean;
  blocksSound: boolean;
  visionTransmission: number;
  lightTransmission: number;
  soundTransmission: number;
  movementCost: number;
  barrierHeight?: number;
  surface?: "solid" | "glass" | "water" | "foliage" | "smoke" | "energy";
  roofOpacity?: number;
  roofAutoCutaway?: boolean;
}

export interface TabletopStructureDraft {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: TabletopStructureType;
  blocksVision: boolean;
  blocksMovement: boolean;
  properties?: Partial<TabletopStructureChannels>;
}

export const TABLETOP_STRUCTURE_PRESETS: Array<{
  family: TabletopStructureFamily;
  type: TabletopStructureType;
  label: string;
  channels?: Partial<TabletopStructureChannels>;
}> = [
  {
    family: "wall",
    type: "wall",
    label: "Parede",
    channels: { material: "stone" },
  },
  {
    family: "barrier",
    type: "barrier",
    label: "Barreira",
    channels: {
      material: "force",
      visionTransmission: 1,
      lightTransmission: 1,
      soundTransmission: 0.6,
    },
  },
  {
    family: "door",
    type: "door_closed",
    label: "Porta",
    channels: { material: "wood" },
  },
  {
    family: "window",
    type: "window_closed",
    label: "Janela / vidro",
    channels: {
      material: "glass",
      blocksLight: true,
      visionTransmission: 0.96,
      lightTransmission: 0,
      soundTransmission: 0.18,
      surface: "glass",
    },
  },
  {
    family: "roof",
    type: "roof_visible",
    label: "Telhado",
    channels: {
      material: "stone",
      roofOpacity: 1,
      roofAutoCutaway: true,
    },
  },
];

const TABLETOP_STRUCTURE_TYPES = new Set<TabletopStructureType>([
  "wall",
  "barrier",
  "door_closed",
  "door_open",
  "door_locked",
  "door_secret",
  "window_closed",
  "window_open",
  "window_broken",
  "roof_visible",
  "roof_cutaway",
  "roof_hidden",
]);

function clamp01(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback;
}

export function structureChannels(
  type: TabletopStructureType,
  value?: Partial<TabletopStructureChannels> | null,
): TabletopStructureChannels {
  const collision = structureCollision(type);
  const family = structureFamily(type);
  const defaults: TabletopStructureChannels = family === "window"
    ? {
        material: "glass",
        blocksLight: type === "window_closed",
        blocksSound: true,
        visionTransmission: type === "window_closed" ? 0.96 : 1,
        lightTransmission:
          type === "window_closed" ? 0 : type === "window_open" ? 0.86 : 0.98,
        soundTransmission: type === "window_closed" ? 0.18 : 0.9,
        movementCost: collision.blocksMovement ? 999 : 1,
        surface: "glass",
      }
    : type === "barrier"
      ? {
          material: "force",
          blocksLight: false,
          blocksSound: false,
          visionTransmission: 1,
          lightTransmission: 1,
          soundTransmission: 0.6,
          movementCost: 999,
          surface: "energy",
        }
      : family === "roof"
        ? {
            material: "stone",
            blocksLight: type === "roof_visible",
            blocksSound: type === "roof_visible",
            visionTransmission: type === "roof_visible" ? 0 : 1,
            lightTransmission: type === "roof_visible" ? 0 : 1,
            soundTransmission: type === "roof_visible" ? 0.2 : 1,
            movementCost: 1,
            surface: "solid",
            roofOpacity: type === "roof_cutaway" ? 0.28 : type === "roof_hidden" ? 0 : 1,
            roofAutoCutaway: true,
          }
        : {
            material: family === "door" ? "wood" : "stone",
            blocksLight: collision.blocksVision,
            blocksSound: collision.blocksVision,
            visionTransmission: collision.blocksVision ? 0 : 1,
            lightTransmission: collision.blocksVision ? 0 : 1,
            soundTransmission: collision.blocksVision ? 0.12 : 1,
            movementCost: collision.blocksMovement ? 999 : 1,
            surface: "solid",
          };
  const resolved: TabletopStructureChannels = {
    ...defaults,
    ...value,
    visionTransmission: clamp01(value?.visionTransmission, defaults.visionTransmission),
    lightTransmission: clamp01(value?.lightTransmission, defaults.lightTransmission),
    soundTransmission: clamp01(value?.soundTransmission, defaults.soundTransmission),
    roofOpacity: value?.roofOpacity === undefined
      ? defaults.roofOpacity
      : clamp01(value.roofOpacity, defaults.roofOpacity ?? 1),
    movementCost: Math.max(0.1, Math.min(999, Number(value?.movementCost ?? defaults.movementCost) || 1)),
  };

  // Window state owns its optical channel. This prevents values persisted while
  // the pane was in another state from leaking into closed/open/broken behavior.
  if (family === "window") {
    resolved.blocksLight = defaults.blocksLight;
    resolved.lightTransmission = defaults.lightTransmission;
  }
  return resolved;
}

export function isTabletopStructureType(value: unknown): value is TabletopStructureType {
  return typeof value === "string" && TABLETOP_STRUCTURE_TYPES.has(value as TabletopStructureType);
}

export function structureFamily(type: TabletopStructureType): TabletopStructureFamily {
  if (type === "barrier") return "barrier";
  if (type.startsWith("door_")) return "door";
  if (type.startsWith("window_")) return "window";
  if (type.startsWith("roof_")) return "roof";
  return "wall";
}

export function structureStateLabel(type: TabletopStructureType) {
  const labels: Record<TabletopStructureType, string> = {
    wall: "Parede",
    barrier: "Barreira",
    door_closed: "Porta fechada",
    door_open: "Porta aberta",
    door_locked: "Porta trancada",
    door_secret: "Porta secreta",
    window_closed: "Janela fechada",
    window_open: "Janela aberta",
    window_broken: "Janela quebrada",
    roof_visible: "Telhado visível",
    roof_cutaway: "Telhado em corte",
    roof_hidden: "Telhado oculto",
  };
  return labels[type];
}

export function structureStateOptions(family: TabletopStructureFamily) {
  const options: Record<TabletopStructureFamily, TabletopStructureType[]> = {
    wall: ["wall"],
    barrier: ["barrier"],
    door: ["door_closed", "door_open", "door_locked", "door_secret"],
    window: ["window_closed", "window_open", "window_broken"],
    roof: ["roof_visible", "roof_cutaway", "roof_hidden"],
  };
  return options[family];
}

export function structureCollision(type: TabletopStructureType) {
  switch (type) {
    case "door_open":
    case "window_open":
    case "window_broken":
    case "roof_visible":
    case "roof_cutaway":
    case "roof_hidden":
      return { blocksVision: false, blocksMovement: false };
    case "window_closed":
      return { blocksVision: false, blocksMovement: true };
    case "barrier":
      return { blocksVision: false, blocksMovement: true };
    case "door_secret":
      // Until discovered, a secret door behaves exactly like the wall it is hiding in.
      return { blocksVision: true, blocksMovement: true };
    default:
      return { blocksVision: true, blocksMovement: true };
  }
}

export function createTabletopStructure({
  id,
  type,
  start,
  end,
}: {
  id: string;
  type: TabletopStructureType;
  start: Point;
  end: Point;
}): TabletopStructureDraft | null {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(distance) || distance < 4) return null;
  const collision = structureCollision(type);
  return {
    id,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    wallType: type,
    ...collision,
    properties: structureChannels(type),
  };
}

export function isRoofStructure(type: TabletopStructureType) {
  return structureFamily(type) === "roof";
}
