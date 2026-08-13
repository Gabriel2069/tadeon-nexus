import { structureFamily } from "./tabletop-spatial";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { TabletopLevel } from "./types";

export interface TabletopStructureVerticalSpan {
  baseElevation: number;
  height: number;
  topElevation: number;
}

function finite(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function levelHeight(level: TabletopLevel) {
  return Math.max(8, finite(level.height, 8));
}

function roofThickness(wall: TabletopWall, height: number) {
  return Math.max(
    8,
    Math.min(
      Math.max(12, finite(wall.thickness, 8) * 1.5),
      Math.max(8, height * 0.12),
    ),
  );
}

/**
 * Architectural defaults inside a level. Values are relative to the floor;
 * moving/restacking a level therefore keeps its architecture attached to it.
 */
export function tabletopStructureFitForLevel(
  wall: TabletopWall,
  level: TabletopLevel,
): TabletopStructureVerticalSpan {
  const height = levelHeight(level);
  const family = structureFamily(wall.wallType);

  if (family === "roof") {
    const thickness = roofThickness(wall, height);
    return {
      baseElevation: Math.max(0, height - thickness),
      height: thickness,
      topElevation: height,
    };
  }

  if (family === "window") {
    const baseElevation = height * 0.28;
    const windowHeight = Math.max(8, height * 0.46);
    return {
      baseElevation,
      height: Math.min(windowHeight, height - baseElevation),
      topElevation: Math.min(height, baseElevation + windowHeight),
    };
  }

  if (family === "door") {
    const doorHeight = Math.max(8, height * 0.9);
    return {
      baseElevation: 0,
      height: Math.min(height, doorHeight),
      topElevation: Math.min(height, doorHeight),
    };
  }

  return { baseElevation: 0, height, topElevation: height };
}

/** Clamp a persisted/manual structure to the vertical envelope of its level. */
export function resolveTabletopStructureVerticalSpan(
  wall: TabletopWall,
  level: TabletopLevel,
): TabletopStructureVerticalSpan {
  const envelope = levelHeight(level);
  const fitted = tabletopStructureFitForLevel(wall, level);
  const family = structureFamily(wall.wallType);
  const rawBase = finite(wall.baseElevation, fitted.baseElevation);
  const rawHeight = finite(wall.height, fitted.height);

  // Older roof records were stored as a floor-to-ceiling prism. Interpret
  // that legacy signature as a ceiling slab so existing scenes self-repair.
  if (family === "roof" && rawBase <= 0 && rawHeight >= envelope * 0.5)
    return fitted;

  const baseElevation = Math.max(0, Math.min(envelope - 8, rawBase));
  const height = Math.max(8, Math.min(rawHeight, envelope - baseElevation));
  return {
    baseElevation,
    height,
    topElevation: Math.min(envelope, baseElevation + height),
  };
}

export function fitTabletopStructureToLevel(
  wall: TabletopWall,
  level: TabletopLevel,
): TabletopWall {
  const span = tabletopStructureFitForLevel(wall, level);
  return {
    ...wall,
    baseElevation: span.baseElevation,
    height: span.height,
  };
}

export function tabletopStructureWorldSpan(
  wall: TabletopWall,
  level: TabletopLevel,
): TabletopStructureVerticalSpan {
  const span = resolveTabletopStructureVerticalSpan(wall, level);
  return {
    baseElevation: level.baseElevation + span.baseElevation,
    height: span.height,
    topElevation: level.baseElevation + span.topElevation,
  };
}
