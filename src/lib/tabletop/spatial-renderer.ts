import { Container, Graphics } from "pixi.js";
import type { TabletopProjectionMode } from "./camera-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  elevateTabletopPoint,
  type TabletopViewOrientation,
} from "./tabletop-projection";
import { activeTabletopLevel, tabletopItemLevelId } from "./tabletop-levels";
import { entityIsBelowRoof } from "./tabletop-structure-editor";
import {
  isRoofStructure,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";
import { tabletopStructureWorldSpan } from "./tabletop-structure-vertical";
import type {
  TabletopVisibilityState,
  TabletopWall,
} from "./tabletop-visibility-service";
import type { TabletopLevel, TabletopScene } from "./types";

interface SpatialPoint {
  x: number;
  y: number;
}

const MATERIALS = {
  wall: { face: 0x202a31, top: 0x69757c, edge: 0xe8e4c4 },
  door: { face: 0x513526, top: 0x9b7552, edge: 0xf0c67f },
  window: { face: 0x31596c, top: 0x91d6e8, edge: 0xcaf3fb },
  roof: { face: 0x321a20, top: 0x74242d, edge: 0xe7dbc4 },
} as const;

function flatPoints(points: SpatialPoint[]) {
  return points.flatMap((point) => [point.x, point.y]);
}

function elevated(
  point: SpatialPoint,
  height: number,
  orientation: TabletopViewOrientation,
): SpatialPoint {
  return elevateTabletopPoint(point, height, orientation);
}

export function tabletopWallFootprint(
  start: SpatialPoint,
  end: SpatialPoint,
  thickness: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(0.001, Math.hypot(dx, dy));
  const half = Math.max(1, Math.min(64, thickness)) / 2;
  const offsetX = (-dy / length) * half;
  const offsetY = (dx / length) * half;
  return [
    { x: start.x + offsetX, y: start.y + offsetY },
    { x: end.x + offsetX, y: end.y + offsetY },
    { x: end.x - offsetX, y: end.y - offsetY },
    { x: start.x - offsetX, y: start.y - offsetY },
  ] as const;
}

function rotatedDoorEnd(wall: TabletopWall) {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const cosine = Math.cos(-Math.PI * 0.38);
  const sine = Math.sin(-Math.PI * 0.38);
  return {
    x: wall.x1 + dx * cosine - dy * sine,
    y: wall.y1 + dx * sine + dy * cosine,
  };
}

export class TabletopSpatialRenderer {
  readonly below = new Container({ label: "spatial-architecture" });
  readonly above = new Container({ label: "spatial-roofs" });
  private readonly ground = new Graphics({ label: "level-grounding" });
  private readonly architecture = new Graphics({ label: "structure-meshes" });
  private readonly roofs = new Graphics({ label: "roof-meshes" });

  constructor() {
    this.below.eventMode = "none";
    this.above.eventMode = "none";
    this.below.addChild(this.ground, this.architecture);
    this.above.addChild(this.roofs);
  }

  render(
    scene: TabletopScene,
    state: TabletopVisibilityState,
    projection: TabletopProjectionMode,
    selectedEntityIds: string[] = [],
    selectedStructureId: string | null = null,
    activeLevelId?: string | null,
    orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
  ) {
    this.ground.clear();
    this.architecture.clear();
    this.roofs.clear();
    const visible = projection === "isometric";
    this.below.visible = visible;
    this.above.visible = visible;
    if (!visible) return;

    const activeLevel = activeTabletopLevel(scene, activeLevelId);
    const fallbackLevelId = activeTabletopLevel(scene).id;
    this.paintGroundContinuity(scene, activeLevel, orientation);
    const selectedEntities = scene.entities.filter((entity) =>
      selectedEntityIds.includes(entity.id),
    );

    for (const wall of state.walls) {
      if (tabletopItemLevelId(wall, fallbackLevelId) !== activeLevel.id) continue;
      const type = wall.wallType as TabletopStructureType;
      const span = tabletopStructureWorldSpan(wall, activeLevel);
      if (isRoofStructure(type)) {
        this.paintRoof(
          wall,
          type,
          span.baseElevation,
          span.height,
          orientation,
          wall.id === selectedStructureId ||
            selectedEntities.some((entity) => entityIsBelowRoof(entity, wall)),
        );
      } else {
        this.paintWall(
          wall,
          type,
          span.height,
          span.baseElevation,
          orientation,
          wall.id === selectedStructureId,
        );
      }
    }
  }

  private paintGroundContinuity(
    scene: TabletopScene,
    level: TabletopLevel,
    orientation: TabletopViewOrientation,
  ) {
    const floor = [
      { x: 0, y: 0 },
      { x: scene.width, y: 0 },
      { x: scene.width, y: scene.height },
      { x: 0, y: scene.height },
    ].map((point) => elevated(point, level.baseElevation, orientation));
    const slabDepth = Math.max(10, Math.min(36, scene.gridSize * 0.28));
    const lower = [
      { x: 0, y: 0 },
      { x: scene.width, y: 0 },
      { x: scene.width, y: scene.height },
      { x: 0, y: scene.height },
    ].map((point) => elevated(point, level.baseElevation - slabDepth, orientation));

    // A physical edge under the map makes the scene read as one continuous
    // floor plane instead of an image card suspended in the 3D viewport.
    this.ground
      .poly(flatPoints([floor[1], floor[2], lower[2], lower[1]]))
      .fill({ color: 0x0a0e14, alpha: 0.86 });
    this.ground
      .poly(flatPoints([floor[2], floor[3], lower[3], lower[2]]))
      .fill({ color: 0x070a0f, alpha: 0.78 });
    this.ground.poly(flatPoints(floor)).stroke({
      color: 0xd9d7a4,
      alpha: 0.22,
      width: 2,
    });
    this.ground.poly(flatPoints(lower)).stroke({
      color: 0x020407,
      alpha: 0.72,
      width: 2,
    });
  }

  private paintWall(
    wall: TabletopWall,
    type: TabletopStructureType,
    height: number,
    baseElevation: number,
    orientation: TabletopViewOrientation,
    selected: boolean,
  ) {
    const family = structureFamily(type);
    const material = MATERIALS[family];
    const groundStart = { x: wall.x1, y: wall.y1 };
    const groundEnd = type === "door_open"
      ? rotatedDoorEnd(wall)
      : { x: wall.x2, y: wall.y2 };
    const start = elevated(groundStart, baseElevation, orientation);
    const end = elevated(groundEnd, baseElevation, orientation);
    const alpha = family === "window"
      ? type === "window_broken" ? 0.28 : 0.54
      : type === "door_open" ? 0.76 : 0.95;
    const footprint = tabletopWallFootprint(
      groundStart,
      groundEnd,
      wall.thickness ?? 8,
    );
    const base = footprint.map((point) => elevated(point, baseElevation, orientation));
    const top = footprint.map((point) => elevated(point, baseElevation + height, orientation));

    this.architecture
      .poly(flatPoints([base[0], base[1], top[1], top[0]]))
      .fill({ color: material.face, alpha });
    this.architecture
      .poly(flatPoints([base[3], base[2], top[2], top[3]]))
      .fill({ color: material.face, alpha: alpha * 0.7 });
    this.architecture
      .poly(flatPoints([base[0], base[3], top[3], top[0]]))
      .fill({ color: material.face, alpha: alpha * 0.84 });
    this.architecture
      .poly(flatPoints([base[1], base[2], top[2], top[1]]))
      .fill({ color: material.face, alpha: alpha * 0.76 });
    this.architecture.poly(flatPoints(top)).fill({
      color: material.top,
      alpha: 0.99,
    });
    this.architecture.poly(flatPoints(top)).stroke({
      color: selected ? 0xf3be63 : type === "door_locked" ? 0xcf4b56 : material.edge,
      alpha: selected ? 1 : 0.92,
      width: selected ? 3.5 : 2.2,
    });

    if (family === "window" && type !== "window_open") {
      const lowerStart = elevated(start, height * 0.16, orientation);
      const lowerEnd = elevated(end, height * 0.16, orientation);
      const upperStart = elevated(start, height * 0.86, orientation);
      const upperEnd = elevated(end, height * 0.86, orientation);
      this.architecture
        .poly(flatPoints([lowerStart, lowerEnd, upperEnd, upperStart]))
        .fill({
          color: 0x8ad7e9,
          alpha: type === "window_broken" ? 0.2 : 0.4,
        })
        .stroke({ color: 0xcaf3fb, alpha: 0.48, width: 1.5 });
    }
  }

  private paintRoof(
    wall: TabletopWall,
    type: TabletopStructureType,
    baseElevation: number,
    height: number,
    orientation: TabletopViewOrientation,
    autoCutaway: boolean,
  ) {
    if (type === "roof_hidden") return;
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);
    const footprint = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    const base = footprint.map((point) => elevated(point, baseElevation, orientation));
    const top = footprint.map((point) => elevated(point, baseElevation + height, orientation));
    const cutaway = type === "roof_cutaway" || autoCutaway;
    this.roofs
      .poly(flatPoints([base[1], base[2], top[2], top[1]]))
      .fill({ color: MATERIALS.roof.face, alpha: cutaway ? 0.12 : 0.8 });
    this.roofs
      .poly(flatPoints([base[2], base[3], top[3], top[2]]))
      .fill({ color: 0x25151a, alpha: cutaway ? 0.1 : 0.72 });
    this.roofs.poly(flatPoints(top)).fill({
      color: MATERIALS.roof.top,
      alpha: cutaway ? 0.16 : 0.92,
    });
    this.roofs.poly(flatPoints(top)).stroke({
      color: MATERIALS.roof.edge,
      alpha: cutaway ? 0.42 : 0.84,
      width: cutaway ? 2 : 3,
    });
  }

  destroy() {
    this.below.destroy({ children: true });
    this.above.destroy({ children: true });
  }
}
