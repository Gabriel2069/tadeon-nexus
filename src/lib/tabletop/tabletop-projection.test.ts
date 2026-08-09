import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLETOP_VIEW_ORIENTATION,
  normalizeTabletopViewOrientation,
  elevateTabletopPoint,
  projectTabletopPoint,
  tabletopProjectionMatrix,
  unprojectTabletopPoint,
} from "./tabletop-projection";

describe("tabletop projection", () => {
  it("preserva exatamente a projeção isométrica histórica como padrão", () => {
    const matrix = tabletopProjectionMatrix(
      "isometric",
      DEFAULT_TABLETOP_VIEW_ORIENTATION,
    );
    expect(matrix.a).toBeCloseTo(1, 12);
    expect(matrix.b).toBeCloseTo(0.5, 12);
    expect(matrix.c).toBeCloseTo(-1, 12);
    expect(matrix.d).toBeCloseTo(0.5, 12);
  });

  it.each([
    { yaw: 0, tilt: 0.18, elevationScale: 0.25 },
    { yaw: 45, tilt: 0.5, elevationScale: 1 },
    { yaw: 123, tilt: 0.72, elevationScale: 1.6 },
    { yaw: 315, tilt: 0.9, elevationScale: 2.5 },
  ])("faz round-trip sem deriva em $yaw graus", (orientation) => {
    const point = { x: 842.75, y: 319.125 };
    const restored = unprojectTabletopPoint(
      projectTabletopPoint(point, "isometric", orientation),
      "isometric",
      orientation,
    );
    expect(restored.x).toBeCloseTo(point.x, 8);
    expect(restored.y).toBeCloseTo(point.y, 8);
  });

  it("normaliza ângulo e limita inclinação e escala vertical", () => {
    expect(
      normalizeTabletopViewOrientation({
        yaw: -45,
        tilt: 0,
        elevationScale: 99,
      }),
    ).toEqual({ yaw: 315, tilt: 0.18, elevationScale: 2.5 });
  });

  it("mantém elevação vertical na tela em qualquer rotação", () => {
    const orientation = { yaw: 213, tilt: 0.73, elevationScale: 1.4 };
    const ground = { x: 480, y: 320 };
    const elevated = elevateTabletopPoint(ground, 96, orientation);
    const projectedGround = projectTabletopPoint(
      ground,
      "isometric",
      orientation,
    );
    const projectedElevated = projectTabletopPoint(
      elevated,
      "isometric",
      orientation,
    );

    expect(projectedElevated.x).toBeCloseTo(projectedGround.x, 8);
    expect(projectedElevated.y).toBeCloseTo(projectedGround.y - 96 * 1.4, 8);
  });
});
