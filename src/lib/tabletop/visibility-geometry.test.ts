import { describe, expect, it } from "vitest";
import { buildVisibilityPolygon } from "./visibility-geometry";

describe("polígono de visão", () => {
  it("interrompe raios em paredes fechadas", () => {
    const polygon = buildVisibilityPolygon(
      { x: 100, y: 100, radius: 500, castsShadows: true },
      [{ id: "w", x1: 200, y1: 0, x2: 200, y2: 300, wallType: "wall", blocksVision: true, blocksMovement: true }],
      1000,
      1000,
    );
    const east = polygon.reduce((best, point) => Math.abs(point.y - 100) < Math.abs(best.y - 100) ? point : best);
    expect(east.x).toBeCloseTo(200, 1);
  });
});
