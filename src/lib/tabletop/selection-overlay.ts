import { Container, Graphics, Text } from "pixi.js";

import {
  boundsFromEntities,
  entityCorners,
  type TabletopBounds,
} from "./geometry";
import type { Point, TabletopEntity } from "./types";

export type TabletopTransformHandle =
  | "north-west"
  | "north-east"
  | "south-east"
  | "south-west"
  | "rotate";

export interface TabletopHandlePoint {
  handle: TabletopTransformHandle;
  point: Point;
}

export function selectionHandlePoints(
  entity: TabletopEntity,
  zoom: number,
): TabletopHandlePoint[] {
  const [northWest, northEast, southEast, southWest] = entityCorners(entity);
  const center = {
    x: entity.x + entity.width / 2,
    y: entity.y + entity.height / 2,
  };
  const topCenter = {
    x: (northWest.x + northEast.x) / 2,
    y: (northWest.y + northEast.y) / 2,
  };
  const direction = {
    x: topCenter.x - center.x,
    y: topCenter.y - center.y,
  };
  const distance = Math.max(1, Math.hypot(direction.x, direction.y));
  const offset = 28 / Math.max(zoom, 0.01);
  return [
    { handle: "north-west", point: northWest },
    { handle: "north-east", point: northEast },
    { handle: "south-east", point: southEast },
    { handle: "south-west", point: southWest },
    {
      handle: "rotate",
      point: {
        x: topCenter.x + (direction.x / distance) * offset,
        y: topCenter.y + (direction.y / distance) * offset,
      },
    },
  ];
}

export class TabletopSelectionOverlay {
  readonly view = new Container({ label: "selection-overlay" });
  private readonly frame = new Graphics({ label: "selection-frame" });
  private readonly marquee = new Graphics({ label: "selection-marquee" });
  private readonly metrics = new Text({
    text: "",
    style: {
      fill: 0xe9e3d5,
      fontFamily: "PT Mono, monospace",
      fontSize: 11,
      fontWeight: "600",
    },
  });

  constructor() {
    this.metrics.label = "selection-metrics";
    this.view.addChild(this.frame, this.marquee, this.metrics);
  }

  render(
    entities: TabletopEntity[],
    selectedIds: string[],
    zoom: number,
    marqueeBounds: TabletopBounds | null,
    editable: boolean,
  ) {
    const safeZoom = Math.max(zoom, 0.01);
    const selected = entities.filter((entity) =>
      selectedIds.includes(entity.id),
    );
    this.frame.clear();
    this.marquee.clear();
    this.metrics.visible = false;

    if (selected.length === 1) {
      const entity = selected[0];
      const corners = entityCorners(entity);
      this.frame.moveTo(corners[0].x, corners[0].y);
      for (const point of corners.slice(1)) this.frame.lineTo(point.x, point.y);
      this.frame.lineTo(corners[0].x, corners[0].y).stroke({
        color: 0xd9d7a4,
        alpha: 0.95,
        width: 1.5 / safeZoom,
      });

      if (editable) {
        const handles = selectionHandlePoints(entity, safeZoom);
        const topCenter = {
          x: (corners[0].x + corners[1].x) / 2,
          y: (corners[0].y + corners[1].y) / 2,
        };
        const rotation = handles.find((item) => item.handle === "rotate");
        if (rotation) {
          this.frame
            .moveTo(topCenter.x, topCenter.y)
            .lineTo(rotation.point.x, rotation.point.y)
            .stroke({
              color: 0xd9d7a4,
              alpha: 0.72,
              width: 1 / safeZoom,
            });
        }
        for (const item of handles) {
          const radius = (item.handle === "rotate" ? 5.5 : 5) / safeZoom;
          this.frame.circle(item.point.x, item.point.y, radius).fill({
            color: item.handle === "rotate" ? 0x4f6e5d : 0x080a0e,
            alpha: 1,
          });
          this.frame.circle(item.point.x, item.point.y, radius).stroke({
            color: 0xe9e3d5,
            alpha: 1,
            width: 1.5 / safeZoom,
          });
        }
      }

      const bounds = boundsFromEntities(selected);
      if (bounds) {
        this.metrics.text = `${Math.round(entity.width)} × ${Math.round(entity.height)}  ·  ${Math.round(entity.rotation)}°`;
        this.metrics.scale.set(1 / safeZoom);
        this.metrics.position.set(bounds.x, bounds.y - 24 / safeZoom);
        this.metrics.visible = true;
      }
    } else if (selected.length > 1) {
      const bounds = boundsFromEntities(selected);
      if (bounds) {
        this.frame
          .rect(bounds.x, bounds.y, bounds.width, bounds.height)
          .stroke({
            color: 0xd9d7a4,
            alpha: 0.88,
            width: 1.5 / safeZoom,
          });
        this.metrics.text = `${selected.length} entidades  ·  ${Math.round(bounds.width)} × ${Math.round(bounds.height)}`;
        this.metrics.scale.set(1 / safeZoom);
        this.metrics.position.set(bounds.x, bounds.y - 24 / safeZoom);
        this.metrics.visible = true;
      }
    }

    if (marqueeBounds) {
      this.marquee
        .rect(
          marqueeBounds.x,
          marqueeBounds.y,
          marqueeBounds.width,
          marqueeBounds.height,
        )
        .fill({ color: 0x4f6e5d, alpha: 0.14 })
        .stroke({
          color: 0xd9d7a4,
          alpha: 0.92,
          width: 1.5 / safeZoom,
        });
    }
  }

  destroy() {
    this.view.destroy({ children: true });
  }
}
