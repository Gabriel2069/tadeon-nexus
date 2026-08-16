import { describe, expect, it } from "vitest";
import {
  createTabletopStructure,
  structureCollision,
  structureFamily,
  structureStateOptions,
} from "./tabletop-spatial";

describe("tabletop spatial architecture", () => {
  it("classifies every architectural family", () => {
    expect(structureFamily("wall")).toBe("wall");
    expect(structureFamily("door_locked")).toBe("door");
    expect(structureFamily("door_secret")).toBe("door");
    expect(structureFamily("window_broken")).toBe("window");
    expect(structureFamily("roof_cutaway")).toBe("roof");
  });

  it("derives movement and vision from the visible state", () => {
    expect(structureCollision("door_closed")).toEqual({
      blocksVision: true,
      blocksMovement: true,
    });
    expect(structureCollision("door_open")).toEqual({
      blocksVision: false,
      blocksMovement: false,
    });
    expect(structureCollision("door_secret")).toEqual({
      blocksVision: true,
      blocksMovement: true,
    });
    expect(structureCollision("window_closed")).toEqual({
      blocksVision: false,
      blocksMovement: true,
    });
  });

  it("creates a valid persisted segment and rejects accidental clicks", () => {
    expect(
      createTabletopStructure({
        id: "wall-1",
        type: "wall",
        start: { x: 10, y: 20 },
        end: { x: 110, y: 20 },
      }),
    ).toMatchObject({ x1: 10, y1: 20, x2: 110, y2: 20 });
    expect(
      createTabletopStructure({
        id: "wall-2",
        type: "roof_visible",
        start: { x: 10, y: 20 },
        end: { x: 11, y: 21 },
      }),
    ).toBeNull();
  });

  it("exposes compact states for direct editing", () => {
    expect(structureStateOptions("door")).toEqual([
      "door_closed",
      "door_open",
      "door_locked",
      "door_secret",
    ]);
  });
});
