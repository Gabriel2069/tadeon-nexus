import { Container, Graphics } from "pixi.js";
import type { TabletopProjectionMode } from "./camera-controller";
import { entityIsBelowRoof } from "./tabletop-structure-editor";
import {
  isRoofStructure,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";
import type {
  TabletopVisibilityState,
  TabletopWall,
} from "./tabletop-visibility-service";
import type { TabletopScene } from "./types";

interface SpatialPoint {
  x: number;
  y: number;
}

const MATERIALS = {
  wall: { face: 0x202a31, top: 0x59636a, edge: 0xd9d7a4 },
  door: { face: 0x513526, top: 0x8d6848, edge: 0xe8bd77 },
  window: { face: 0x31596c, top: 0x85c7d9, edge: 0xbce8f2 },
  roof: { face: 0x321a20, top: 0x74242d, edge: 0xd9d7a4 },
} as const;

function flatPoints(points: SpatialPoint[]) {
  return points.flatMap((point) => [point.x, point.y]);
}

function elevated(point: SpatialPoint, height: number): SpatialPoint {
  return { x: point.x - height, y: point.y - height };
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
  private readonly architecture = new Graphics({ label: "structure-meshes" });
  private readonly roofs = new Graphics({ label: "roof-meshes" });

  constructor() {
    this.below.eventMode = "none";
    this.above.eventMode = "none";
    this.below.addChild(this.architecture);
    this.above.addChild(this.roofs);
  }

  render(
    scene: TabletopScene,
    state: TabletopVisibilityState,
    projection: TabletopProjectionMode,
    selectedEntityIds: string[] = [],
    selectedStructureId: string | null = null,
  ) {
    this.architecture.clear();
    this.roofs.clear();
    const visible = projection === "isometric";
    this.below.visible = visible;
    this.above.visible = visible;
    if (!visible) return;

    const wallHeight = Math.max(42, scene.gridSize * 1.15);
    const selectedEntities = scene.entities.filter((entity) =>
      selectedEntityIds.includes(entity.id),
    );
    for (const wall of state.walls) {
      const type = wall.wallType as TabletopStructureType;
      if (isRoofStructure(type)) {
        this.paintRoof(
          wall,
          type,
          wallHeight * 1.45,
          wall.id === selectedStructureId ||
            selectedEntities.some((entity) => entityIsBelowRoof(entity, wall)),
        );
      } else {
        this.paintWall(wall, type, wallHeight);
      }
    }
  }

  private paintWall(
    wall: TabletopWall,
    type: TabletopStructureType,
    baseHeight: number,
  ) {
    const family = structureFamily(type);
    const material = MATERIALS[family];
    const start = { x: wall.x1, y: wall.y1 };
    const end =
      type === "door_open" ? rotatedDoorEnd(wall) : { x: wall.x2, y: wall.y2 };
    const height =
      family === "window"
        ? baseHeight * 0.76
        : family === "door"
          ? baseHeight * 0.92
          : baseHeight;
    const topStart = elevated(start, height);
    const topEnd = elevated(end, height);
    const alpha =
      family === "window"
        ? type === "window_broken"
          ? 0.24
          : 0.48
        : type === "door_open"
          ? 0.72
          : 0.92;

    this.architecture
      .poly(flatPoints([start, end, topEnd, topStart]))
      .fill({ color: material.face, alpha });
    this.architecture
      .moveTo(topStart.x, topStart.y)
      .lineTo(topEnd.x, topEnd.y)
      .stroke({ color: material.top, alpha: 0.98, width: 8 });
    this.architecture
      .moveTo(start.x, start.y)
      .lineTo(topStart.x, topStart.y)
      .moveTo(end.x, end.y)
      .lineTo(topEnd.x, topEnd.y)
      .stroke({
        color: type === "door_locked" ? 0x9f3540 : material.edge,
        alpha: 0.82,
        width: 2,
      });

    if (family === "window" && type !== "window_open") {
      const lowerStart = elevated(start, height * 0.28);
      const lowerEnd = elevated(end, height * 0.28);
      const upperStart = elevated(start, height * 0.82);
      const upperEnd = elevated(end, height * 0.82);
      this.architecture
        .poly(flatPoints([lowerStart, lowerEnd, upperEnd, upperStart]))
        .fill({
          color: 0x79bfd3,
          alpha: type === "window_broken" ? 0.16 : 0.34,
        });
    }
  }

  private paintRoof(
    wall: TabletopWall,
    type: TabletopStructureType,
    height: number,
    autoCutaway: boolean,
  ) {
    if (type === "roof_hidden") return;
    const minX = Math.min(wall.x1, wall.x2);
    const maxX = Math.max(wall.x1, wall.x2);
    const minY = Math.min(wall.y1, wall.y2);
    const maxY = Math.max(wall.y1, wall.y2);
    const base = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    const top = base.map((point) => elevated(point, height));
    const cutaway = type === "roof_cutaway" || autoCutaway;
    this.roofs
      .poly(flatPoints([base[1], base[2], top[2], top[1]]))
      .fill({ color: MATERIALS.roof.face, alpha: cutaway ? 0.12 : 0.78 });
    this.roofs
      .poly(flatPoints([base[2], base[3], top[3], top[2]]))
      .fill({ color: 0x25151a, alpha: cutaway ? 0.1 : 0.7 });
    this.roofs.poly(flatPoints(top)).fill({
      color: MATERIALS.roof.top,
      alpha: cutaway ? 0.16 : 0.9,
    });
    this.roofs.poly(flatPoints(top)).stroke({
      color: MATERIALS.roof.edge,
      alpha: cutaway ? 0.38 : 0.76,
      width: cutaway ? 2 : 3,
    });
  }

  destroy() {
    this.below.destroy({ children: true });
    this.above.destroy({ children: true });
  }
}
