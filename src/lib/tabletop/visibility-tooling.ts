import type { TabletopFogStroke } from "./tabletop-visibility-service";

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
