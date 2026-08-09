import type {
  Point,
  TabletopEntity,
  TabletopLevel,
  TabletopScene,
} from "./types";
import type {
  TabletopFogStroke,
  TabletopLight,
  TabletopVisibilityState,
  TabletopWall,
} from "./tabletop-visibility-service";
import { tabletopSceneLevels } from "./types";
import {
  elevateTabletopPoint,
  type TabletopViewOrientation,
} from "./tabletop-projection";

export function activeTabletopLevel(
  scene: TabletopScene,
  activeLevelId?: string | null,
): TabletopLevel {
  const levels = tabletopSceneLevels(scene);
  return (
    levels.find((level) => level.id === activeLevelId && level.visible) ??
    levels.find((level) => level.visible) ??
    levels[0]
  );
}

export function tabletopItemLevelId(
  item:
    | Pick<TabletopEntity, "levelId">
    | Pick<TabletopWall, "levelId">
    | Pick<TabletopLight, "levelId">
    | Pick<TabletopFogStroke, "levelId">,
  fallbackLevelId: string,
) {
  return item.levelId || fallbackLevelId;
}

export function filterVisibilityForLevel(
  state: TabletopVisibilityState,
  levelId: string,
  fallbackLevelId: string,
): TabletopVisibilityState {
  const onLevel = (
    item:
      | Pick<TabletopWall, "levelId">
      | Pick<TabletopLight, "levelId">
      | Pick<TabletopFogStroke, "levelId">,
  ) => tabletopItemLevelId(item, fallbackLevelId) === levelId;
  return {
    ...state,
    walls: state.walls.filter(onLevel),
    lights: state.lights.filter(onLevel),
    fogStrokes: state.fogStrokes.filter(onLevel),
  };
}

export function elevateIsometricPoint(
  point: Point,
  elevation: number,
  orientation?: TabletopViewOrientation,
): Point {
  return elevateTabletopPoint(point, elevation, orientation);
}

export function tabletopEntityWorldElevation(
  entity: TabletopEntity,
  level: TabletopLevel,
) {
  const relative = Number(entity.elevation);
  return level.baseElevation + (Number.isFinite(relative) ? relative : 0);
}

export function updateTabletopLevelStack(
  levels: TabletopLevel[],
  levelId: string,
  patch: Partial<TabletopLevel>,
  restackAbove = false,
) {
  const updated = levels.map((level) =>
    level.id === levelId ? { ...level, ...patch, id: level.id } : level,
  );
  if (
    !restackAbove ||
    (patch.baseElevation === undefined && patch.height === undefined)
  ) {
    return updated;
  }

  const ordered = [...updated].sort(
    (left, right) =>
      left.order - right.order || left.id.localeCompare(right.id),
  );
  const changedIndex = ordered.findIndex((level) => level.id === levelId);
  if (changedIndex < 0) return updated;

  const bases = new Map<string, number>();
  let nextBase =
    ordered[changedIndex].baseElevation +
    Math.max(8, ordered[changedIndex].height);
  for (const level of ordered.slice(changedIndex + 1)) {
    bases.set(level.id, nextBase);
    nextBase += Math.max(8, level.height);
  }

  return updated.map((level) =>
    bases.has(level.id)
      ? { ...level, baseElevation: bases.get(level.id) ?? level.baseElevation }
      : level,
  );
}
