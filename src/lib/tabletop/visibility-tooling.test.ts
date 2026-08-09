import { describe, expect, it } from "vitest";
import {
  compactVisibilityToolPoints,
  createLevelRevealStrokes,
} from "./visibility-tooling";

describe("createLevelRevealStrokes", () => {
  it("cobre mapas grandes sem ultrapassar os limites persistidos", () => {
    let id = 0;
    const strokes = createLevelRevealStrokes({
      levelId: "andar-2",
      sceneWidth: 16_384,
      sceneHeight: 12_288,
      createId: () => `fog-${++id}`,
    });
    const points = strokes.flatMap((stroke) => stroke.points);

    expect(strokes.length).toBeGreaterThan(1);
    expect(strokes.every((stroke) => stroke.points.length <= 64)).toBe(true);
    expect(strokes.every((stroke) => stroke.radius <= 1_024)).toBe(true);
    expect(strokes.map((stroke) => stroke.sequenceIndex)).toEqual(
      strokes.map((_, index) => index),
    );

    for (const corner of [
      { x: 0, y: 0 },
      { x: 16_384, y: 0 },
      { x: 0, y: 12_288 },
      { x: 16_384, y: 12_288 },
    ]) {
      expect(
        points.some(
          (point) => Math.hypot(point.x - corner.x, point.y - corner.y) <= 960,
        ),
      ).toBe(true);
    }
  });

  it("normaliza dimensões negativas para uma operação válida", () => {
    const strokes = createLevelRevealStrokes({
      levelId: "base",
      sceneWidth: -100,
      sceneHeight: -100,
      createId: () => "fog-1",
    });

    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("compacta um traço livre preservando as duas extremidades", () => {
    const points = Array.from({ length: 1_000 }, (_, index) => ({
      x: index,
      y: Math.sin(index / 20) * 100,
    }));
    const compacted = compactVisibilityToolPoints(points);

    expect(compacted).toHaveLength(64);
    expect(compacted[0]).toEqual(points[0]);
    expect(compacted.at(-1)).toEqual(points.at(-1));
  });
});
