import { describe, expect, it } from "vitest";

import {
  alignTabletopEntities,
  distributeTabletopEntities,
  moveTabletopEntitiesToEdge,
} from "./tabletop-arrangement";
import type { TabletopEntity } from "./types";

function entity(
  id: string,
  x: number,
  y: number,
  width = 20,
  height = 20,
): TabletopEntity {
  return {
    id,
    layerId: "tokens",
    type: "token",
    label: id,
    x,
    y,
    width,
    height,
    rotation: 0,
    zIndex: Number(id.replace(/\D/g, "")) || 1,
    hidden: false,
    locked: false,
    color: 0xffffff,
  };
}

describe("tabletop arrangement", () => {
  it("aligns entities without changing unselected items", () => {
    const source = [
      entity("e1", 10, 20),
      entity("e2", 80, 40, 40),
      entity("e3", 300, 300),
    ];
    const result = alignTabletopEntities(
      source,
      new Set(["e1", "e2"]),
      "right",
    );

    expect(result[0].x + result[0].width).toBe(120);
    expect(result[1].x + result[1].width).toBe(120);
    expect(result[2]).toBe(source[2]);
  });

  it("distributes three or more entities by their centers", () => {
    const source = [
      entity("e1", 0, 0),
      entity("e2", 20, 50),
      entity("e3", 100, 100),
    ];
    const result = distributeTabletopEntities(
      source,
      new Set(source.map((item) => item.id)),
      "horizontal",
    );

    expect(result.map((item) => item.x + item.width / 2)).toEqual([
      10, 60, 110,
    ]);
  });

  it("moves a selection to the front while preserving its internal order", () => {
    const source = [entity("e1", 0, 0), entity("e2", 0, 0), entity("e3", 0, 0)];
    const result = moveTabletopEntitiesToEdge(
      source,
      new Set(["e1", "e2"]),
      "front",
    );

    expect(result[0].zIndex).toBeGreaterThan(result[2].zIndex);
    expect(result[1].zIndex).toBeGreaterThan(result[0].zIndex);
  });
});
