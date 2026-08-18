import type {
  TabletopFogStroke,
  TabletopLight,
} from "./tabletop-visibility-service";

export type TabletopLightHandle = "body" | "radius";

export interface TabletopLightHit {
  id: string;
  handle: TabletopLightHandle;
}

export type TabletopFogHandle = "body" | "start" | "radius" | "end";

export interface TabletopFogHit {
  id: string;
  handle: TabletopFogHandle;
}

export interface TabletopFogBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0)
    return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function pointInPolygon(
  point: { x: number; y: number },
  polygon: Array<{ x: number; y: number }>,
) {
  let inside = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y || Number.EPSILON) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function tabletopFogBounds(
  stroke: TabletopFogStroke,
): TabletopFogBounds {
  if (stroke.points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  const xs = stroke.points.map((point) => point.x);
  const ys = stroke.points.map((point) => point.y);
  const padding = stroke.shape === "brush" ? stroke.radius : 0;
  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + padding;
  const maxY = Math.max(...ys) + padding;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function fogHandlePoint(stroke: TabletopFogStroke) {
  const anchor = stroke.points[0];
  if (!anchor) return null;
  if (stroke.shape === "brush")
    return { x: anchor.x + stroke.radius, y: anchor.y };
  return stroke.points.at(-1) ?? anchor;
}

function pointInsideFog(
  point: { x: number; y: number },
  stroke: TabletopFogStroke,
  tolerance: number,
) {
  const first = stroke.points[0];
  if (!first) return false;
  if (stroke.shape === "brush") {
    if (stroke.points.length === 1)
      return (
        Math.hypot(point.x - first.x, point.y - first.y) <=
        stroke.radius + tolerance
      );
    return stroke.points
      .slice(1)
      .some(
        (end, index) =>
          pointToSegmentDistance(point, stroke.points[index], end) <=
          stroke.radius + tolerance,
      );
  }
  if (stroke.shape === "polygon") return pointInPolygon(point, stroke.points);
  const bounds = tabletopFogBounds(stroke);
  if (stroke.shape === "rectangle")
    return (
      point.x >= bounds.x - tolerance &&
      point.x <= bounds.x + bounds.width + tolerance &&
      point.y >= bounds.y - tolerance &&
      point.y <= bounds.y + bounds.height + tolerance
    );
  const radiusX = Math.max(bounds.width / 2, 1);
  const radiusY = Math.max(bounds.height / 2, 1);
  const centerX = bounds.x + radiusX;
  const centerY = bounds.y + radiusY;
  return (
    ((point.x - centerX) / (radiusX + tolerance)) ** 2 +
      ((point.y - centerY) / (radiusY + tolerance)) ** 2 <=
    1
  );
}

export function hitTestTabletopFog(
  point: { x: number; y: number },
  strokes: TabletopFogStroke[],
  tolerance: number,
  selectedId?: string | null,
): TabletopFogHit | null {
  const safeTolerance = Math.max(1, Number(tolerance) || 1);
  const selected = strokes.find((stroke) => stroke.id === selectedId);
  if (selected) {
    const anchor = selected.points[0];
    if (
      selected.shape !== "brush" &&
      anchor &&
      Math.hypot(point.x - anchor.x, point.y - anchor.y) <= safeTolerance * 1.45
    )
      return { id: selected.id, handle: "start" };
    const handle = fogHandlePoint(selected);
    if (
      handle &&
      Math.hypot(point.x - handle.x, point.y - handle.y) <= safeTolerance * 1.45
    )
      return {
        id: selected.id,
        handle: selected.shape === "brush" ? "radius" : "end",
      };
    if (pointInsideFog(point, selected, safeTolerance))
      return { id: selected.id, handle: "body" };
  }
  for (const stroke of [...strokes].reverse()) {
    if (
      stroke.id !== selectedId &&
      pointInsideFog(point, stroke, safeTolerance)
    )
      return { id: stroke.id, handle: "body" };
  }
  return null;
}

export function transformTabletopFog(
  stroke: TabletopFogStroke,
  handle: TabletopFogHandle,
  dragStart: { x: number; y: number },
  point: { x: number; y: number },
  snap: (point: { x: number; y: number }) => { x: number; y: number },
  bypassSnap = false,
): TabletopFogStroke {
  if (stroke.points.length === 0) return stroke;
  if (handle === "radius") {
    const anchor = stroke.points[0];
    return {
      ...stroke,
      radius: Math.max(
        8,
        Math.min(1024, Math.hypot(point.x - anchor.x, point.y - anchor.y)),
      ),
    };
  }
  if (handle === "start") {
    const start = bypassSnap ? point : snap(point);
    return {
      ...stroke,
      points: stroke.points.map((item, index) => (index === 0 ? start : item)),
    };
  }
  if (handle === "end") {
    const end = bypassSnap ? point : snap(point);
    return {
      ...stroke,
      points: stroke.points.map((item, index) =>
        index === stroke.points.length - 1 ? end : item,
      ),
    };
  }
  const rawDelta = { x: point.x - dragStart.x, y: point.y - dragStart.y };
  const anchor = stroke.points[0];
  const snappedAnchor = bypassSnap
    ? { x: anchor.x + rawDelta.x, y: anchor.y + rawDelta.y }
    : snap({ x: anchor.x + rawDelta.x, y: anchor.y + rawDelta.y });
  const delta = {
    x: snappedAnchor.x - anchor.x,
    y: snappedAnchor.y - anchor.y,
  };
  return {
    ...stroke,
    points: stroke.points.map((item) => ({
      x: item.x + delta.x,
      y: item.y + delta.y,
    })),
  };
}

export function tabletopLightRadiusHandlePoint(
  light: Pick<TabletopLight, "x" | "y" | "radius" | "properties">,
) {
  const direction = ((Number(light.properties?.direction) || 0) * Math.PI) / 180;
  return {
    x: light.x + Math.cos(direction) * light.radius,
    y: light.y + Math.sin(direction) * light.radius,
  };
}

export function hitTestTabletopLight(
  point: { x: number; y: number },
  lights: TabletopLight[],
  tolerance: number,
  selectedId?: string | null,
): TabletopLightHit | null {
  const safeTolerance = Math.max(1, Number(tolerance) || 1);
  const selected = selectedId
    ? lights.find((light) => light.id === selectedId)
    : undefined;
  const ordered = selected
    ? [selected, ...lights.filter((light) => light.id !== selected.id).reverse()]
    : [...lights].reverse();
  for (const light of ordered) {
    const radiusHandle = tabletopLightRadiusHandlePoint(light);
    if (
      light.id === selectedId &&
      Math.hypot(point.x - radiusHandle.x, point.y - radiusHandle.y) <=
        safeTolerance * 1.75
    )
      return { id: light.id, handle: "radius" };

    // Keep the hit target independent from the authored radius: clicking anywhere
    // in a huge light should not steal entity selection, but its center must be a
    // comfortable control at every zoom level. The engine supplies screen-scaled
    // tolerance, so this resolves to roughly 23–26 CSS px.
    const centerHitRadius =
      safeTolerance * (light.id === selectedId ? 2.6 : 2.3);
    if (Math.hypot(point.x - light.x, point.y - light.y) <= centerHitRadius)
      return { id: light.id, handle: "body" };
  }
  return null;
}

export function transformTabletopLight(
  light: TabletopLight,
  handle: TabletopLightHandle,
  point: { x: number; y: number },
  snap: (point: { x: number; y: number }) => { x: number; y: number },
  bypassSnap = false,
): TabletopLight {
  if (handle === "radius")
    return {
      ...light,
      radius: Math.max(
        8,
        Math.min(100_000, Math.hypot(point.x - light.x, point.y - light.y)),
      ),
    };
  const next = bypassSnap ? point : snap(point);
  return { ...light, x: next.x, y: next.y };
}

export function compactVisibilityToolPoints(
  points: Array<{ x: number; y: number }>,
  limit = 64,
) {
  const safeLimit = Math.max(2, Math.trunc(limit));
  const normalized = points
    .map((point) => ({ x: Number(point.x), y: Number(point.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (normalized.length <= safeLimit) return normalized;

  const compacted: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < safeLimit; index += 1) {
    const sourceIndex = Math.round(
      (index * (normalized.length - 1)) / (safeLimit - 1),
    );
    const point = normalized[sourceIndex];
    const previous = compacted[compacted.length - 1];
    if (!previous || previous.x !== point.x || previous.y !== point.y)
      compacted.push(point);
  }
  return compacted;
}

interface LevelRevealOptions {
  levelId: string;
  sceneWidth: number;
  sceneHeight: number;
  createId?: () => string;
}

export function createLevelRevealStrokes({
  levelId,
  sceneWidth,
  sceneHeight,
  createId = () => crypto.randomUUID(),
}: LevelRevealOptions): TabletopFogStroke[] {
  const radius = 960;
  const stride = radius * Math.SQRT2;
  const width = Math.max(0, sceneWidth);
  const height = Math.max(0, sceneHeight);
  const points: Array<{ x: number; y: number }> = [];

  for (let y = 0; y <= height; y += stride) {
    for (let x = 0; x <= width; x += stride) points.push({ x, y });
    points.push({ x: width, y });
  }
  for (let x = 0; x <= width; x += stride) points.push({ x, y: height });
  points.push({ x: width, y: height });

  const strokes: TabletopFogStroke[] = [];
  for (let offset = 0; offset < points.length; offset += 64) {
    strokes.push({
      id: createId(),
      levelId,
      operation: "reveal",
      shape: "brush",
      points: points.slice(offset, offset + 64),
      radius,
      sequenceIndex: strokes.length,
    });
  }
  return strokes;
}
