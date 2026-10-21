import { describe, expect, it } from "vitest";

import {
  boundsFromEntities,
  tabletopSelectionFrame,
  entityIntersectsBounds,
  normalizeBounds,
} from "./geometry";
import type { TabletopEntity } from "./types";

function entity(patch: Partial<TabletopEntity> = {}): TabletopEntity {
  return {
    id: "entity",
    layerId: "tokens",
    type: "token",
    label: "Entity",
    x: 100,
    y: 100,
    width: 80,
    height: 40,
    rotation: 0,
    zIndex: 1,
    hidden: false,
    locked: false,
    color: 0xffffff,
    ...patch,
  };
}

describe("tabletop geometry", () => {
  it("retains flat framing and includes the normalized scale, yaw envelope and height of native models", () => {
    const flat = entity({ rotation: 45 });
    expect(tabletopSelectionFrame([flat])).toEqual({
      bounds: boundsFromEntities([flat]),
      elevationRange: undefined,
    });
    const model = entity({
      width: 96,
      height: 96,
      assetUrl: "/tower.glb",
      elevation: 64,
      properties: { model_scale: 1.8, model_yaw: 45, model_elevation_offset: 8 },
    });
    const frame = tabletopSelectionFrame([model]);
    expect(frame.bounds!.width).toBeCloseTo(96 * 1.8 * Math.SQRT2);
    expect(frame.elevationRange).toEqual({ min: 72, max: 72 + (96 * 1.8) / 0.45 });
  });
  it("normalizes marquee bounds regardless of drag direction", () => {
    expect(normalizeBounds({ x: 90, y: 70 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 80,
      height: 50,
    });
  });

  it("computes the visible bounds of rotated entities", () => {
    const bounds = boundsFromEntities([
      entity({ x: 0, y: 0, width: 100, height: 40, rotation: 90 }),
    ]);

    expect(bounds?.x).toBeCloseTo(30);
    expect(bounds?.y).toBeCloseTo(-30);
    expect(bounds?.width).toBeCloseTo(40);
    expect(bounds?.height).toBeCloseTo(100);
  });

  it("selects an entity when its rotated bounds cross the marquee", () => {
    expect(
      entityIntersectsBounds(entity({ rotation: 45 }), {
        x: 150,
        y: 90,
        width: 80,
        height: 80,
      }),
    ).toBe(true);
    expect(
      entityIntersectsBounds(entity(), {
        x: 400,
        y: 400,
        width: 20,
        height: 20,
      }),
    ).toBe(false);
  });
});
