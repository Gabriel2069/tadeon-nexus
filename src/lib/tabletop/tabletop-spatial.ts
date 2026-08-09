import type { Point } from "./types";

export type TabletopStructureType =
  | "wall"
  | "door_closed"
  | "door_open"
  | "door_locked"
  | "window_closed"
  | "window_open"
  | "window_broken"
  | "roof_visible"
  | "roof_cutaway"
  | "roof_hidden";

export type TabletopStructureFamily = "wall" | "door" | "window" | "roof";

export interface TabletopStructureDraft {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wallType: TabletopStructureType;
  blocksVision: boolean;
  blocksMovement: boolean;
}

export const TABLETOP_STRUCTURE_PRESETS: Array<{
  family: TabletopStructureFamily;
  type: TabletopStructureType;
  label: string;
}> = [
  { family: "wall", type: "wall", label: "Parede" },
  { family: "door", type: "door_closed", label: "Porta" },
  { family: "window", type: "window_closed", label: "Janela" },
  { family: "roof", type: "roof_visible", label: "Telhado" },
];

const TABLETOP_STRUCTURE_TYPES = new Set<TabletopStructureType>([
  "wall",
  "door_closed",
  "door_open",
  "door_locked",
  "window_closed",
  "window_open",
  "window_broken",
  "roof_visible",
  "roof_cutaway",
  "roof_hidden",
]);

export function isTabletopStructureType(
  value: unknown,
): value is TabletopStructureType {
  return (
    typeof value === "string" &&
    TABLETOP_STRUCTURE_TYPES.has(value as TabletopStructureType)
  );
}

export function structureFamily(
  type: TabletopStructureType,
): TabletopStructureFamily {
  if (type.startsWith("door_")) return "door";
  if (type.startsWith("window_")) return "window";
  if (type.startsWith("roof_")) return "roof";
  return "wall";
}

export function structureStateLabel(type: TabletopStructureType) {
  const labels: Record<TabletopStructureType, string> = {
    wall: "Parede",
    door_closed: "Porta fechada",
    door_open: "Porta aberta",
    door_locked: "Porta trancada",
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
    door: ["door_closed", "door_open", "door_locked"],
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
  return {
    id,
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    wallType: type,
    ...structureCollision(type),
  };
}

export function isRoofStructure(type: TabletopStructureType) {
  return structureFamily(type) === "roof";
}
