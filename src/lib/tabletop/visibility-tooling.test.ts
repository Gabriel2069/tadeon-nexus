import { describe, expect, it } from "vitest";
import { createLevelRevealStrokes } from "./visibility-tooling";

describe("createLevelRevealStrokes", () => {
  it("cobre mapas grandes sem ultrapassar os limites persistidos", () => {
    let id = 0;
    const strokes = createLevelRevealStrokes({
      levelId: "andar-2",
      sceneWidth: 8_192,
      sceneHeight: 6_144,
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
      { x: 8_192, y: 0 },
      { x: 0, y: 6_144 },
      { x: 8_192, y: 6_144 },
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
});
