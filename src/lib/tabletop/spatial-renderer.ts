import { Container, Graphics } from "pixi.js";
import type { TabletopProjectionMode } from "./camera-controller";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  elevateTabletopPoint,
  type TabletopViewOrientation,
} from "./tabletop-projection";
import { activeTabletopLevel, tabletopItemLevelId } from "./tabletop-levels";
import { tabletopRegionBehavior } from "./tabletop-regions";
import { entityIsBelowRoof } from "./tabletop-structure-editor";
import {
  isRoofStructure,
  structureChannels,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";
import { tabletopStructureWorldSpan } from "./tabletop-structure-vertical";
import type { TabletopVisibilityState, TabletopWall } from "./tabletop-visibility-service";
import type { TabletopEntity, TabletopLevel, TabletopScene } from "./types";

interface SpatialPoint { x: number; y: number }

const MATERIALS = {
  wall: { face: 0x202a31, top: 0x69757c, edge: 0xe8e4c4 },
  barrier: { face: 0x4a3c74, top: 0xb895ff, edge: 0xe1d4ff },
  door: { face: 0x513526, top: 0x9b7552, edge: 0xf0c67f },
  window: { face: 0x31596c, top: 0x91d6e8, edge: 0xcaf3fb },
  roof: { face: 0x321a20, top: 0x74242d, edge: 0xe7dbc4 },
} as const;

const REGION_COLORS = {
  normal: 0x6d8194,
  difficult: 0xc59a52,
  water: 0x4d9fc7,
  mud: 0x755a3f,
  ice: 0xbde8f2,
  foliage: 0x4f8a62,
  smoke: 0x7d818a,
  hazard: 0xc0584e,
  custom: 0x8f6bb8,
} as const;

function flatPoints(points: SpatialPoint[]) {
  return points.flatMap((point) => [point.x, point.y]);
}

function elevated(point: SpatialPoint, height: number, orientation: TabletopViewOrientation): SpatialPoint {
  return elevateTabletopPoint(point, height, orientation);
}

function rotatedEntityCorners(entity: TabletopEntity) {
  const center = { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
  const angle = (entity.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    { x: -entity.width / 2, y: -entity.height / 2 },
    { x: entity.width / 2, y: -entity.height / 2 },
    { x: entity.width / 2, y: entity.height / 2 },
    { x: -entity.width / 2, y: entity.height / 2 },
  ].map((point) => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  }));
}

function colorFromHex(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const normalized = value.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized, 16) : fallback;
}

export function tabletopWallFootprint(start: SpatialPoint, end: SpatialPoint, thickness: number) {
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
  return { x: wall.x1 + dx * cosine - dy * sine, y: wall.y1 + dx * sine + dy * cosine };
}

export class TabletopSpatialRenderer {
  readonly below = new Container({ label: "spatial-architecture" });
  readonly above = new Container({ label: "spatial-roofs" });
  private readonly ground = new Graphics({ label: "level-grounding" });
  private readonly regions = new Graphics({ label: "behavioral-regions" });
  private readonly architecture = new Graphics({ label: "structure-meshes" });
  private readonly roofs = new Graphics({ label: "roof-meshes" });

  constructor() {
    this.below.eventMode = "none";
    this.above.eventMode = "none";
    this.below.addChild(this.ground, this.regions, this.architecture);
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
    this.regions.clear();
    this.architecture.clear();
    this.roofs.clear();
    this.below.visible = true;
    const isometric = projection === "isometric";
    this.ground.visible = isometric;
    this.architecture.visible = isometric;
    this.above.visible = isometric;

    const activeLevel = activeTabletopLevel(scene, activeLevelId);
    const fallbackLevelId = activeTabletopLevel(scene).id;
    this.paintRegions(scene, activeLevel, fallbackLevelId, projection, orientation, selectedEntityIds);
    if (!isometric) return;

    this.paintGroundContinuity(scene, activeLevel, orientation);
    const selectedEntities = scene.entities.filter((entity) => selectedEntityIds.includes(entity.id));
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
          wall.id === selectedStructureId || selectedEntities.some((entity) => entityIsBelowRoof(entity, wall)),
        );
      } else {
        this.paintWall(wall, type, span.height, span.baseElevation, orientation, wall.id === selectedStructureId);
      }
    }
  }

  private paintRegions(
    scene: TabletopScene,
    activeLevel: TabletopLevel,
    fallbackLevelId: string,
    projection: TabletopProjectionMode,
    orientation: TabletopViewOrientation,
    selectedIds: string[],
  ) {
    for (const entity of scene.entities) {
      const behavior = tabletopRegionBehavior(entity);
      if (!behavior?.enabled || entity.hidden) continue;
      if (tabletopItemLevelId(entity, fallbackLevelId) !== activeLevel.id) continue;
      let corners = rotatedEntityCorners(entity);
      if (projection === "isometric") {
        const elevation = activeLevel.baseElevation + behavior.elevationOffset;
        corners = corners.map((point) => elevated(point, elevation + 0.5, orientation));
      }
      const color = colorFromHex(behavior.tint, REGION_COLORS[behavior.surface]);
      const selected = selectedIds.includes(entity.id);
      const alpha = selected ? 0.22 : behavior.surface === "smoke" ? 0.12 : 0.08;
      this.regions.poly(flatPoints(corners)).fill({ color, alpha }).stroke({
        color,
        alpha: selected ? 0.9 : 0.28,
        width: selected ? 2.5 : 1.2,
      });
      if (behavior.surface === "water" || behavior.surface === "ice") {
        const centerY = corners.reduce((sum, point) => sum + point.y, 0) / corners.length;
        const minX = Math.min(...corners.map((point) => point.x));
        const maxX = Math.max(...corners.map((point) => point.x));
        this.regions.moveTo(minX, centerY).lineTo(maxX, centerY).stroke({
          color: 0xe7fbff,
          alpha: behavior.surface === "ice" ? 0.32 : 0.18,
          width: 1,
        });
      }
    }
  }

  private paintGroundContinuity(scene: TabletopScene, level: TabletopLevel, orientation: TabletopViewOrientation) {
    const floor = [
      { x: 0, y: 0 }, { x: scene.width, y: 0 },
      { x: scene.width, y: scene.height }, { x: 0, y: scene.height },
    ].map((point) => elevated(point, level.baseElevation, orientation));
    const slabDepth = Math.max(10, Math.min(36, scene.gridSize * 0.28));
    const lower = [
      { x: 0, y: 0 }, { x: scene.width, y: 0 },
      { x: scene.width, y: scene.height }, { x: 0, y: scene.height },
    ].map((point) => elevated(point, level.baseElevation - slabDepth, orientation));
    this.ground.poly(flatPoints([floor[1], floor[2], lower[2], lower[1]])).fill({ color: 0x0a0e14, alpha: 0.86 });
    this.ground.poly(flatPoints([floor[2], floor[3], lower[3], lower[2]])).fill({ color: 0x070a0f, alpha: 0.78 });
    this.ground.poly(flatPoints(floor)).stroke({ color: 0xd9d7a4, alpha: 0.22, width: 2 });
    this.ground.poly(flatPoints(lower)).stroke({ color: 0x020407, alpha: 0.72, width: 2 });
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
    const channels = structureChannels(type, wall.properties);
    const groundStart = { x: wall.x1, y: wall.y1 };
    const groundEnd = type === "door_open" ? rotatedDoorEnd(wall) : { x: wall.x2, y: wall.y2 };
    const start = elevated(groundStart, baseElevation, orientation);
    const end = elevated(groundEnd, baseElevation, orientation);
    const alpha = family === "window"
      ? type === "window_broken" ? 0.22 : 0.32 + (1 - channels.visionTransmission) * 0.34
      : family === "barrier"
        ? 0.2 + (1 - channels.lightTransmission) * 0.36
        : type === "door_open" ? 0.76 : 0.95;
    const footprint = tabletopWallFootprint(groundStart, groundEnd, wall.thickness ?? 8);
    const base = footprint.map((point) => elevated(point, baseElevation, orientation));
    const top = footprint.map((point) => elevated(point, baseElevation + height, orientation));

    this.architecture.poly(flatPoints([base[0], base[1], top[1], top[0]])).fill({ color: material.face, alpha });
    this.architecture.poly(flatPoints([base[3], base[2], top[2], top[3]])).fill({ color: material.face, alpha: alpha * 0.7 });
    this.architecture.poly(flatPoints([base[0], base[3], top[3], top[0]])).fill({ color: material.face, alpha: alpha * 0.84 });
    this.architecture.poly(flatPoints([base[1], base[2], top[2], top[1]])).fill({ color: material.face, alpha: alpha * 0.76 });
    this.architecture.poly(flatPoints(top)).fill({ color: material.top, alpha: family === "barrier" ? 0.42 : 0.99 });
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
      this.architecture.poly(flatPoints([lowerStart, lowerEnd, upperEnd, upperStart]))
        .fill({ color: 0x8ad7e9, alpha: type === "window_broken" ? 0.16 : 0.18 + (1 - channels.lightTransmission) * 0.3 })
        .stroke({ color: 0xcaf3fb, alpha: 0.48, width: 1.5 });
    }

    if (family === "barrier") {
      const lowerStart = elevated(start, height * 0.05, orientation);
      const lowerEnd = elevated(end, height * 0.05, orientation);
      const upperStart = elevated(start, height * 0.95, orientation);
      const upperEnd = elevated(end, height * 0.95, orientation);
      this.architecture.poly(flatPoints([lowerStart, lowerEnd, upperEnd, upperStart]))
        .fill({ color: material.top, alpha: 0.08 })
        .stroke({ color: material.edge, alpha: selected ? 0.92 : 0.36, width: selected ? 2.5 : 1.5 });
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
    const channels = structureChannels(type, wall.properties);
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);
    const footprint = [
      { x: minX, y: minY }, { x: maxX, y: minY },
      { x: maxX, y: maxY }, { x: minX, y: maxY },
    ];
    const base = footprint.map((point) => elevated(point, baseElevation, orientation));
    const top = footprint.map((point) => elevated(point, baseElevation + height, orientation));
    const cutaway = type === "roof_cutaway" || (Boolean(channels.roofAutoCutaway) && autoCutaway);
    const opacity = Math.max(0, Math.min(1, channels.roofOpacity ?? 1));
    const visibleAlpha = cutaway ? Math.min(0.2, opacity * 0.22) : 0.92 * opacity;
    this.roofs.poly(flatPoints([base[1], base[2], top[2], top[1]])).fill({ color: MATERIALS.roof.face, alpha: cutaway ? 0.1 : 0.8 * opacity });
    this.roofs.poly(flatPoints([base[2], base[3], top[3], top[2]])).fill({ color: 0x25151a, alpha: cutaway ? 0.08 : 0.72 * opacity });
    this.roofs.poly(flatPoints(top)).fill({ color: MATERIALS.roof.top, alpha: visibleAlpha });
    this.roofs.poly(flatPoints(top)).stroke({ color: MATERIALS.roof.edge, alpha: cutaway ? 0.42 : 0.84 * opacity, width: cutaway ? 2 : 3 });
  }

  destroy() {
    this.below.destroy({ children: true });
    this.above.destroy({ children: true });
  }
}
