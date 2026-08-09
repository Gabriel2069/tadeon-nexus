import { describe, expect, it } from "vitest";
import {
  inverseIsometricEntityMatrix,
  tabletopEntityRenderMode,
} from "./isometric-billboard";

function multiply(
  left: { a: number; b: number; c: number; d: number },
  right: { a: number; b: number; c: number; d: number },
) {
  return {
    a: left.a * right.a + left.c * right.b,
    b: left.b * right.a + left.d * right.b,
    c: left.a * right.c + left.c * right.d,
    d: left.b * right.c + left.d * right.d,
  };
}

function isometricEntityMatrix(rotationDegrees: number) {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    a: cosine - sine,
    b: 0.5 * (cosine + sine),
    c: -(sine + cosine),
    d: 0.5 * (cosine - sine),
  };
}

describe("isometric billboards", () => {
  it.each([0, 30, 90, 180])(
    "cancels isometric skew and entity rotation at %s degrees",
    (rotation) => {
      const result = multiply(
        isometricEntityMatrix(rotation),
        inverseIsometricEntityMatrix(rotation),
      );
      expect(result.a).toBeCloseTo(1, 8);
      expect(result.b).toBeCloseTo(0, 8);
      expect(result.c).toBeCloseTo(0, 8);
      expect(result.d).toBeCloseTo(1, 8);
    },
  );

  it("uses upright images for tokens and objects by default", () => {
    expect(
      tabletopEntityRenderMode({
        type: "token",
        assetUrl: "signed-token.png",
      }),
    ).toBe("billboard");
    expect(
      tabletopEntityRenderMode({
        type: "object",
        assetUrl: "signed-object.png",
      }),
    ).toBe("billboard");
  });

  it("keeps maps flat and respects an explicit editor choice", () => {
    expect(
      tabletopEntityRenderMode({
        type: "tile",
        assetUrl: "floor.png",
      }),
    ).toBe("flat");
    expect(
      tabletopEntityRenderMode({
        type: "token",
        assetUrl: "token.png",
        properties: { render_mode: "flat" },
      }),
    ).toBe("flat");
  });
});
