import { describe, expect, it } from "vitest";
import { EMPTY_TABLETOP_SCENE } from "./types";
import {
  activeTabletopLevel,
  elevateIsometricPoint,
  filterVisibilityForLevel,
  updateTabletopLevelStack,
} from "./tabletop-levels";
import { projectTabletopPoint } from "./tabletop-projection";

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
    const state = {
      version: 1,
      globalIllumination: 1,
      fogEnabled: false,
      fogOpacity: 0.92,
      fogStrokes: [],
      walls: [
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
      ],
      lights: [
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
      ],
    };

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

    expect(project(elevated).x).toBeCloseTo(project(ground).x, 8);
    expect(project(elevated).y).toBeCloseTo(project(ground).y - 96, 8);
  });

  it("corrige automaticamente a elevação após girar o mapa", () => {
    const orientation = { yaw: 137, tilt: 0.64, elevationScale: 1.25 };
    const ground = { x: 220, y: 140 };
    const elevated = elevateIsometricPoint(ground, 96, orientation);
    const groundScreen = projectTabletopPoint(ground, "isometric", orientation);
    const elevatedScreen = projectTabletopPoint(
      elevated,
      "isometric",
      orientation,
    );

    expect(elevatedScreen.x).toBeCloseTo(groundScreen.x, 8);
    expect(elevatedScreen.y).toBeCloseTo(groundScreen.y - 120, 8);
  });

  it("reempilha automaticamente os andares acima sem alterar a entrada", () => {
    const levels = [
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
        visible: true,
        locked: false,
        version: 1,
      },
      {
        id: "attic",
        name: "Sótão",
        order: 2,
        baseElevation: 384,
        height: 128,
        visible: true,
        locked: false,
        version: 1,
      },
    ];

    const updated = updateTabletopLevelStack(
      levels,
      "ground",
      { height: 256 },
      true,
    );

    expect(updated.map((level) => level.baseElevation)).toEqual([0, 256, 448]);
    expect(levels.map((level) => level.baseElevation)).toEqual([0, 192, 384]);
  });
});
