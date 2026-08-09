import { describe, expect, it } from "vitest";
import {
  createTabletopDrawingEntity,
  normalizeTabletopDrawing,
  readTabletopDrawingPoints,
} from "./tabletop-drawing";

describe("tabletop drawing", () => {
  it("normalizes a world path into a padded local entity", () => {
    expect(
      normalizeTabletopDrawing(
        [
          { x: 100, y: 80 },
          { x: 140, y: 120 },
        ],
        4,
      ),
    ).toEqual({
      x: 94,
      y: 74,
      width: 52,
      height: 52,
      points: [
        { x: 6, y: 6 },
        { x: 46, y: 46 },
      ],
    });
  });

  it("creates a persistent drawing entity with a bounded style", () => {
    const entity = createTabletopDrawingEntity({
      id: "drawing-1",
      label: "Traço 1",
      layerId: "drawings",
      zIndex: 3,
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 10 },
      ],
      style: { color: 0xd9d7a4, width: 60, opacity: 2 },
    });

    expect(entity?.type).toBe("drawing");
    expect(entity?.properties).toMatchObject({
      drawing_kind: "freehand",
      drawing_source_width: entity?.width,
      drawing_source_height: entity?.height,
      stroke_width: 48,
      stroke_opacity: 1,
    });
  });

  it("ignores malformed stored points", () => {
    expect(
      readTabletopDrawingPoints([
        { x: 1, y: 2 },
        { x: "3", y: 4 },
        { x: "bad", y: 5 },
        null,
      ]),
    ).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });
});
