import { Container, Graphics, Text } from "pixi.js";
import type { TabletopDrawingStyle } from "./tabletop-drawing";
import type { Point } from "./types";

export class TabletopToolOverlay {
  readonly view = new Container();
  private readonly measure = new Graphics();
  private readonly drawing = new Graphics();
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
    this.view.addChild(this.measure, this.drawing, this.measureLabel);
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

  destroy() {
    this.view.destroy({ children: true });
  }
}
