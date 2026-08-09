import { describe, expect, it } from "vitest";
import { EMPTY_TABLETOP_SCENE } from "./types";
import {
  activeTabletopLevel,
  elevateIsometricPoint,
  filterVisibilityForLevel,
} from "./tabletop-levels";
import { createEmptyVisibilityState } from "./tabletop-visibility-service";

describe("tabletop spatial levels", () => {
  it("selects a visible level and falls back safely", () => {
    const scene = {
      ...EMPTY_TABLETOP_SCENE,
      levels: [
        {
          id: "ground",
          name: "Térreo",
          order: 0,
          baseElevation: 0,
          height: 192,
          visible: true,
          locked: false,
          version: 1,
        },
        {
          id: "upper",
          name: "Segundo andar",
          order: 1,
          baseElevation: 192,
          height: 192,
          visible: false,
          locked: false,
          version: 1,
        },
      ],
    };

    expect(activeTabletopLevel(scene, "upper").id).toBe("ground");
    expect(activeTabletopLevel(scene, "missing").id).toBe("ground");
  });

  it("isolates walls, lights and fog from other floors", () => {
    const state = createEmptyVisibilityState();
    state.walls = [
      {
        id: "wall-ground",
        levelId: "ground",
        x1: 0,
        y1: 0,
        x2: 64,
        y2: 0,
        wallType: "wall",
        blocksVision: true,
        blocksMovement: true,
      },
      {
        id: "wall-upper",
        levelId: "upper",
        x1: 0,
        y1: 0,
        x2: 64,
        y2: 0,
        wallType: "wall",
        blocksVision: true,
        blocksMovement: true,
      },
    ];
    state.lights = [
      {
        id: "light-upper",
        levelId: "upper",
        entityId: null,
        x: 32,
        y: 32,
        radius: 128,
        intensity: 1,
        color: "#ffffff",
        enabled: true,
        castsShadows: true,
      },
    ];

    const filtered = filterVisibilityForLevel(state, "ground", "ground");
    expect(filtered.walls.map((wall) => wall.id)).toEqual(["wall-ground"]);
    expect(filtered.lights).toEqual([]);
  });

  it("moves height straight up after isometric projection", () => {
    const ground = { x: 220, y: 140 };
    const elevated = elevateIsometricPoint(ground, 96);
    const project = (point: { x: number; y: number }) => ({
      x: point.x - point.y,
      y: (point.x + point.y) * 0.5,
    });

    expect(project(elevated).x).toBe(project(ground).x);
    expect(project(elevated).y).toBe(project(ground).y - 96);
  });
});
