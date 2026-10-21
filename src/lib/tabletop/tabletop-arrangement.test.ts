import { describe, expect, it } from "vitest";

import {
  alignTabletopEntities,
  distributeTabletopEntities,
  moveTabletopEntitiesToEdge,
  formTabletopEntities,
  repeatTabletopEntities,
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
  it("forms a mixed-size group in cells without changing authored model settings or other pieces", () => {
    const source = [entity("e1", 0, 0, 40, 20), entity("e2", 20, 70, 60, 30), entity("other", 700, 700)];
    source[0].properties = { model_scale: 2, model_yaw: 45 };
    const next = formTabletopEntities(source, new Set(["e1", "e2"]), "row", 16, 2, 1000, 1000)!;
    expect(next[1].x + next[1].width / 2 - next[0].x - next[0].width / 2).toBe(76);
    expect(next[0].y + next[0].height / 2).toBe(next[1].y + next[1].height / 2);
    expect(next.every(e => e.x >= 0 && e.y >= 0)).toBe(true);
    expect(next[0].properties).toEqual(source[0].properties);
    expect(next[2]).toBe(source[2]);
    expect(source[0].x).toBe(0);
  });

  it("makes a circular formation with equal radius and sufficient spacing", () => {
    const source = Array.from({ length: 6 }, (_, i) => entity(`e${i}`, 400, 400, 40, 40));
    const next = formTabletopEntities(source, new Set(source.map(e => e.id)), "ring", 12, 3, 1000, 1000)!;
    const centers = next.map(e => ({ x: e.x + e.width / 2, y: e.y + e.height / 2 }));
    const radii = centers.map(p => Math.hypot(p.x - 420, p.y - 420));
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(0.001);
    expect(Math.hypot(centers[0].x - centers[1].x, centers[0].y - centers[1].y)).toBeGreaterThan(56);
  });

  it("rejects an oversized formation instead of collapsing its pieces at a scene edge", () => {
    const source = [entity("e1", 0, 0, 80, 80), entity("e2", 0, 90, 80, 80)];
    expect(formTabletopEntities(source, new Set(["e1", "e2"]), "row", 20, 2, 100, 200)).toBeNull();
  });

  it("repeats the entire relative arrangement with independent properties and stepped elevation", () => {
    const source = [entity("e1", 100, 100), entity("e2", 140, 120)];
    source[0].elevation = 8; source[0].properties = { model_scale: 2, model_yaw: 45, nested: { enabled: true } };
    let id = 0;
    const next = repeatTabletopEntities(source, { copies: 2, stepX: 80, stepY: 0, elevationStep: 16, rotationStep: 15 }, 1000, 1000, () => `copy${++id}`)!;
    expect(next).toHaveLength(4);
    expect(next.map(e => e.x)).toEqual([180, 220, 260, 300]);
    expect(next.map(e => e.rotation)).toEqual([15, 15, 30, 30]);
    expect(next[0].elevation).toBe(24); expect(next[2].elevation).toBe(40);
    expect(next[0].properties).toEqual(source[0].properties);
    expect(next[0].properties).not.toBe(source[0].properties);
    expect(new Set(next.map(e => e.id)).size).toBe(4);
  });

  it("rejects the whole repetition when its final copy crosses the scene", () => {
    expect(repeatTabletopEntities([entity("e1", 100, 100)], { copies: 3, stepX: 80, stepY: 0, elevationStep: 0, rotationStep: 0 }, 300, 300, () => "copy")).toBeNull();
  });
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
