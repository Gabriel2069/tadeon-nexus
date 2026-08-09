import { describe, expect, it } from "vitest";
import {
  entityIsBelowRoof,
  hitTestTabletopStructure,
  nextTabletopStructureState,
  transformTabletopStructure,
} from "./tabletop-structure-editor";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { TabletopEntity } from "./types";

const wall: TabletopWall = {
  id: "wall-1",
  x1: 20,
  y1: 40,
  x2: 180,
  y2: 40,
  wallType: "door_closed",
  blocksVision: true,
  blocksMovement: true,
};

describe("tabletop structure editor", () => {
  it("prioritizes endpoint handles on the selected structure", () => {
    expect(
      hitTestTabletopStructure({ x: 21, y: 39 }, [wall], 8, wall.id),
    ).toEqual({
      id: wall.id,
      handle: "start",
    });
    expect(hitTestTabletopStructure({ x: 90, y: 43 }, [wall], 8, null)).toEqual(
      {
        id: wall.id,
        handle: "body",
      },
    );
  });

  it("moves an entire structure while preserving its dimensions", () => {
    const moved = transformTabletopStructure(
      wall,
      "body",
      { x: 50, y: 40 },
      { x: 83, y: 71 },
      {
        axisLock: false,
        bypassSnap: false,
        snap: (point) => ({
          x: Math.round(point.x / 10) * 10,
          y: Math.round(point.y / 10) * 10,
        }),
      },
    );
    expect(moved).toMatchObject({ x1: 50, y1: 70, x2: 210, y2: 70 });
  });

  it("axis-locks an endpoint against its opposite endpoint", () => {
    const resized = transformTabletopStructure(
      wall,
      "end",
      { x: 180, y: 40 },
      { x: 205, y: 104 },
      { axisLock: true, bypassSnap: true, snap: (point) => point },
    );
    expect(resized).toMatchObject({ x2: 205, y2: 40 });
  });

  it("cycles interactive states without changing the family", () => {
    expect(nextTabletopStructureState(wall)).toBe("door_open");
    expect(
      nextTabletopStructureState({ ...wall, wallType: "door_locked" }),
    ).toBe("door_closed");
  });

  it("detects entities covered by a roof volume", () => {
    const roof: TabletopWall = {
      ...wall,
      wallType: "roof_visible",
      x1: 0,
      y1: 0,
      x2: 200,
      y2: 160,
    };
    const entity = {
      id: "token-1",
      x: 70,
      y: 60,
      width: 40,
      height: 40,
    } as TabletopEntity;
    expect(entityIsBelowRoof(entity, roof)).toBe(true);
    expect(
      hitTestTabletopStructure({ x: 100, y: 80 }, [roof], 8, null),
    ).toEqual({ id: roof.id, handle: "body" });
    expect(
      hitTestTabletopStructure({ x: 70, y: 60 }, [roof], 8, null),
    ).toBeNull();
  });
});
