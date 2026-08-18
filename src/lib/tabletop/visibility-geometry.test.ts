import { describe, expect, it } from "vitest";
import {
  buildVisibilityPolygon,
  lightOpticsAlongRay,
  lightTransmissionAlongRay,
  tabletopWallLightTransmission,
} from "./visibility-geometry";
import type { TabletopWall } from "./tabletop-visibility-service";

const windowWall = (
  wallType: "window_closed" | "window_open" | "window_broken",
): TabletopWall => ({
  id: `window-${wallType}`,
  x1: 200,
  y1: 0,
  x2: 200,
  y2: 300,
  wallType,
  blocksVision: false,
  blocksMovement: wallType === "window_closed",
});

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

  it("trata janela fechada como bloqueador de luz mesmo sem bloquear visão", () => {
    const closed = windowWall("window_closed");
    expect(tabletopWallLightTransmission(closed)).toBe(0);
    const polygon = buildVisibilityPolygon(
      { x: 100, y: 100, radius: 500, castsShadows: true },
      [closed],
      1000,
      1000,
    );
    const east = polygon.reduce((best, point) =>
      Math.abs(point.y - 100) < Math.abs(best.y - 100) ? point : best,
    );
    expect(east.x).toBeCloseTo(200, 1);
  });
});

describe("óptica das janelas", () => {
  const origin = { x: 100, y: 100 };

  it("suaviza a luz através de janela aberta sem transformá-la em parede", () => {
    const open = windowWall("window_open");
    const transmission = lightTransmissionAlongRay(
      origin,
      { x: 400, y: 100 },
      [open],
    );
    const optics = lightOpticsAlongRay(origin, { x: 400, y: 100 }, [open]);
    expect(tabletopWallLightTransmission(open)).toBeCloseTo(0.86, 5);
    expect(transmission).toBeGreaterThan(0.65);
    expect(transmission).toBeLessThan(0.87);
    expect(optics.diffusion).toBeGreaterThan(0.6);
    expect(optics.firstAffectedDistance).toBeCloseTo(100, 5);
  });

  it("mantém vidro quebrado quase transparente com irregularidade determinística", () => {
    const broken = windowWall("window_broken");
    const center = lightOpticsAlongRay(origin, { x: 400, y: 100 }, [broken]);
    const offset = lightOpticsAlongRay(origin, { x: 400, y: 145 }, [broken]);
    expect(tabletopWallLightTransmission(broken)).toBeCloseTo(0.98, 5);
    expect(center.transmission).toBeGreaterThan(0.9);
    expect(offset.transmission).toBeGreaterThan(0.9);
    expect(center.irregularity).toBeGreaterThan(0.2);
    expect(center.transmission).not.toBeCloseTo(offset.transmission, 4);
    expect(
      lightOpticsAlongRay(origin, { x: 400, y: 100 }, [broken]).transmission,
    ).toBe(center.transmission);
  });
});
