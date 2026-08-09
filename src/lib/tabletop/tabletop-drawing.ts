import type { Point, TabletopEntity } from "./types";

export interface TabletopDrawingStyle {
  color: number;
  width: number;
  opacity: number;
}

export interface NormalizedTabletopDrawing {
  x: number;
  y: number;
  width: number;
  height: number;
  points: Point[];
}

function finitePoint(point: Point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function normalizeTabletopDrawing(
  points: Point[],
  strokeWidth: number,
): NormalizedTabletopDrawing | null {
  const safePoints = points.filter(finitePoint);
  if (safePoints.length < 2) return null;

  const padding = Math.max(4, Math.min(48, strokeWidth * 1.5));
  const minX = Math.min(...safePoints.map((point) => point.x));
  const minY = Math.min(...safePoints.map((point) => point.y));
  const maxX = Math.max(...safePoints.map((point) => point.x));
  const maxY = Math.max(...safePoints.map((point) => point.y));
  const width = Math.max(8, maxX - minX + padding * 2);
  const height = Math.max(8, maxY - minY + padding * 2);

  return {
    x: minX - padding,
    y: minY - padding,
    width,
    height,
    points: safePoints.map((point) => ({
      x: point.x - minX + padding,
      y: point.y - minY + padding,
    })),
  };
}

export function createTabletopDrawingEntity({
  id,
  label,
  layerId,
  zIndex,
  points,
  style,
}: {
  id: string;
  label: string;
  layerId: string;
  zIndex: number;
  points: Point[];
  style: TabletopDrawingStyle;
}): TabletopEntity | null {
  const normalized = normalizeTabletopDrawing(points, style.width);
  if (!normalized) return null;

  return {
    id,
    layerId,
    type: "drawing",
    label,
    x: normalized.x,
    y: normalized.y,
    width: normalized.width,
    height: normalized.height,
    rotation: 0,
    zIndex,
    hidden: false,
    locked: false,
    color: style.color,
    properties: {
      drawing_kind: "freehand",
      drawing_points: normalized.points,
      drawing_source_width: normalized.width,
      drawing_source_height: normalized.height,
      stroke_width: Math.max(1, Math.min(48, style.width)),
      stroke_opacity: Math.max(0.1, Math.min(1, style.opacity)),
    },
  };
}

export function readTabletopDrawingPoints(value: unknown): Point[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => {
    if (
      typeof point !== "object" ||
      point === null ||
      !("x" in point) ||
      !("y" in point)
    )
      return [];
    const x = Number(point.x);
    const y = Number(point.y);
    return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [];
  });
}
