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

export function elevateIsometricPoint(point: Point, elevation: number): Point {
  return {
    x: point.x - elevation,
    y: point.y - elevation,
  };
}

export function tabletopEntityWorldElevation(
  entity: TabletopEntity,
  level: TabletopLevel,
) {
  const relative = Number(entity.elevation);
  return level.baseElevation + (Number.isFinite(relative) ? relative : 0);
}
