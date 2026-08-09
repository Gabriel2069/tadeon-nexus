import type { TabletopFogStroke } from "./tabletop-visibility-service";

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
