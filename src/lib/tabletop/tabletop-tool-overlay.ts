import { Container, Graphics, Text } from "pixi.js";
import type { TabletopDrawingStyle } from "./tabletop-drawing";
import {
  isRoofStructure,
  structureFamily,
  type TabletopStructureType,
} from "./tabletop-spatial";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { Point } from "./types";

export class TabletopToolOverlay {
  readonly view = new Container();
  private readonly measure = new Graphics();
  private readonly drawing = new Graphics();
  private readonly structure = new Graphics();
  private readonly selectedStructure = new Graphics();
  private readonly measureLabel = new Text({
    text: "",
    style: {
      fill: 0xf2f0dc,
      fontFamily: "monospace",
      fontSize: 12,
      fontWeight: "700",
      stroke: { color: 0x080a0e, width: 4, join: "round" },
    },
  });

  constructor() {
    this.measureLabel.anchor.set(0.5, 1);
    this.measureLabel.visible = false;
    this.view.eventMode = "none";
    this.view.addChild(
      this.measure,
      this.drawing,
      this.selectedStructure,
      this.structure,
      this.measureLabel,
    );
  }

  renderMeasure(start: Point, end: Point, label: string, zoom: number) {
    const safeZoom = Math.max(0.01, zoom);
    const radius = 4.5 / safeZoom;
    this.measure.clear();
    this.measure
      .moveTo(start.x, start.y)
      .lineTo(end.x, end.y)
      .stroke({ color: 0xd9d7a4, alpha: 0.98, width: 2.4 / safeZoom });
    this.measure.circle(start.x, start.y, radius).fill({
      color: 0x080a0e,
      alpha: 1,
    });
    this.measure.circle(start.x, start.y, radius).stroke({
      color: 0xd9d7a4,
      alpha: 1,
      width: 1.8 / safeZoom,
    });
    this.measure.circle(end.x, end.y, radius).fill({
      color: 0x74242d,
      alpha: 1,
    });
    this.measure.circle(end.x, end.y, radius).stroke({
      color: 0xf2f0dc,
      alpha: 0.95,
      width: 1.8 / safeZoom,
    });

    this.measureLabel.text = label;
    this.measureLabel.visible = true;
    this.measureLabel.scale.set(1 / safeZoom);
    this.measureLabel.position.set(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2 - 9 / safeZoom,
    );
  }

  clearMeasure() {
    this.measure.clear();
    this.measureLabel.visible = false;
  }

  renderDrawing(points: Point[], style: TabletopDrawingStyle) {
    this.drawing.clear();
    if (points.length < 2) return;
    this.drawing.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) this.drawing.lineTo(point.x, point.y);
    this.drawing.stroke({
      color: style.color,
      alpha: style.opacity,
      width: style.width,
      cap: "round",
      join: "round",
    });
  }

  clearDrawing() {
    this.drawing.clear();
  }

  renderStructure(
    start: Point,
    end: Point,
    type: TabletopStructureType,
    zoom: number,
  ) {
    this.structure.clear();
    const safeZoom = Math.max(0.01, zoom);
    const family = structureFamily(type);
    const color =
      family === "door"
        ? 0xe6b663
        : family === "window"
          ? 0x79c8df
          : family === "roof"
            ? 0xb95360
            : 0xd9d7a4;
    if (isRoofStructure(type)) {
      this.structure
        .rect(
          Math.min(start.x, end.x),
          Math.min(start.y, end.y),
          Math.abs(end.x - start.x),
          Math.abs(end.y - start.y),
        )
        .fill({ color, alpha: 0.12 })
        .stroke({ color, alpha: 0.92, width: 2.4 / safeZoom });
    } else {
      this.structure
        .moveTo(start.x, start.y)
        .lineTo(end.x, end.y)
        .stroke({
          color,
          alpha: 0.96,
          width: (family === "wall" ? 3 : 5) / safeZoom,
        });
    }
    const radius = 4.5 / safeZoom;
    this.structure.circle(start.x, start.y, radius).fill({ color, alpha: 1 });
    this.structure.circle(end.x, end.y, radius).fill({ color, alpha: 1 });
  }

  clearStructure() {
    this.structure.clear();
  }

  renderStructureSelection(wall: TabletopWall | null, zoom: number) {
    this.selectedStructure.clear();
    if (!wall) return;
    const safeZoom = Math.max(0.01, zoom);
    const family = structureFamily(wall.wallType);
    const color =
      family === "door"
        ? 0xe6b663
        : family === "window"
          ? 0x79c8df
          : family === "roof"
            ? 0xb95360
            : 0xd9d7a4;
    const start = { x: wall.x1, y: wall.y1 };
    const end = { x: wall.x2, y: wall.y2 };
    const center = { x: (wall.x1 + wall.x2) / 2, y: (wall.y1 + wall.y2) / 2 };
    if (isRoofStructure(wall.wallType)) {
      this.selectedStructure
        .rect(
          Math.min(wall.x1, wall.x2),
          Math.min(wall.y1, wall.y2),
          Math.abs(wall.x2 - wall.x1),
          Math.abs(wall.y2 - wall.y1),
        )
        .fill({ color, alpha: 0.08 })
        .stroke({ color, alpha: 0.98, width: 2.4 / safeZoom });
    } else {
      this.selectedStructure
        .moveTo(start.x, start.y)
        .lineTo(end.x, end.y)
        .stroke({
          color: 0x080a0e,
          alpha: 0.92,
          width: (family === "wall" ? 8 : 10) / safeZoom,
        })
        .moveTo(start.x, start.y)
        .lineTo(end.x, end.y)
        .stroke({ color, alpha: 1, width: 3 / safeZoom });
    }
    const endpointRadius = 6 / safeZoom;
    const centerRadius = 5 / safeZoom;
    for (const point of [start, end]) {
      this.selectedStructure.circle(point.x, point.y, endpointRadius).fill({
        color: 0x080a0e,
        alpha: 1,
      });
      this.selectedStructure.circle(point.x, point.y, endpointRadius).stroke({
        color,
        alpha: 1,
        width: 2 / safeZoom,
      });
    }
    this.selectedStructure.circle(center.x, center.y, centerRadius).fill({
      color,
      alpha: 1,
    });
    this.selectedStructure.circle(center.x, center.y, centerRadius).stroke({
      color: 0x080a0e,
      alpha: 0.9,
      width: 1.5 / safeZoom,
    });
  }

  destroy() {
    this.view.destroy({ children: true });
  }
}
