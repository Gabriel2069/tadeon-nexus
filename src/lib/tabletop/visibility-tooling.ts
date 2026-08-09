import type {
  TabletopFogStroke,
  TabletopLight,
} from "./tabletop-visibility-service";

export type TabletopLightHandle = "body" | "radius";

export interface TabletopLightHit {
  id: string;
  handle: TabletopLightHandle;
}

export function hitTestTabletopLight(
  point: { x: number; y: number },
  lights: TabletopLight[],
  tolerance: number,
  selectedId?: string | null,
): TabletopLightHit | null {
  const safeTolerance = Math.max(1, Number(tolerance) || 1);
  const ordered = selectedId
    ? [
        ...lights.filter((light) => light.id === selectedId),
        ...lights.filter((light) => light.id !== selectedId),
      ]
    : lights;
  for (const light of ordered) {
    const radiusHandle = { x: light.x + light.radius, y: light.y };
    if (
      light.id === selectedId &&
      Math.hypot(point.x - radiusHandle.x, point.y - radiusHandle.y) <=
        safeTolerance * 1.35
    )
      return { id: light.id, handle: "radius" };
    if (Math.hypot(point.x - light.x, point.y - light.y) <= safeTolerance * 1.5)
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
      points: points.slice(offset, offset + 64),
      radius,
      sequenceIndex: strokes.length,
    });
  }
  return strokes;
}
