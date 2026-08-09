import { describe, expect, it } from "vitest";
import { tabletopWallFootprint } from "./spatial-renderer";

describe("tabletop wall prism", () => {
  it("creates a centered footprint with the configured thickness", () => {
    const footprint = tabletopWallFootprint(
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      12,
    );
    expect(footprint).toEqual([
      { x: 10, y: 26 },
      { x: 110, y: 26 },
      { x: 110, y: 14 },
      { x: 10, y: 14 },
    ]);
  });

  it("keeps degenerate previews finite", () => {
    const footprint = tabletopWallFootprint(
      { x: 42, y: 42 },
      { x: 42, y: 42 },
      8,
    );
    expect(
      footprint.flatMap((point) => [point.x, point.y]).every(Number.isFinite),
    ).toBe(true);
  });
});
