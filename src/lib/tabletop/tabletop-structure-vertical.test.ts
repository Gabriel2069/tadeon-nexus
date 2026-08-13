import { describe, expect, it } from "vitest";
import type { TabletopWall } from "./tabletop-visibility-service";
import type { TabletopLevel } from "./types";
import {
  fitTabletopStructureToLevel,
  resolveTabletopStructureVerticalSpan,
  tabletopStructureWorldSpan,
} from "./tabletop-structure-vertical";

const level: TabletopLevel = {
  id: "level-2",
  name: "Segundo andar",
  order: 1,
  baseElevation: 180,
  height: 160,
  visible: true,
  locked: false,
  version: 1,
};

function structure(wallType: TabletopWall["wallType"]): TabletopWall {
  return {
    id: wallType,
    levelId: level.id,
    x1: 0,
    y1: 0,
    x2: 120,
    y2: 0,
    wallType,
    blocksVision: true,
    blocksMovement: true,
    thickness: 8,
  };
}

describe("encaixe vertical das estruturas", () => {
  it("faz a parede ocupar o envelope do andar", () => {
    const fitted = fitTabletopStructureToLevel(structure("wall"), level);
    expect(fitted.baseElevation).toBe(0);
    expect(fitted.height).toBe(160);
    expect(tabletopStructureWorldSpan(fitted, level)).toEqual({
      baseElevation: 180,
      height: 160,
      topElevation: 340,
    });
  });

  it("mantém janela dentro do andar com peitoril", () => {
    const fitted = fitTabletopStructureToLevel(structure("window_closed"), level);
    expect(fitted.baseElevation).toBeGreaterThan(0);
    const span = resolveTabletopStructureVerticalSpan(fitted, level);
    expect(span.topElevation).toBeLessThanOrEqual(level.height);
  });

  it("converte o formato legado do telhado em laje no topo", () => {
    const legacy = {
      ...structure("roof_visible"),
      baseElevation: 0,
      height: level.height,
    };
    const span = resolveTabletopStructureVerticalSpan(legacy, level);
    expect(span.baseElevation).toBeGreaterThan(0);
    expect(span.height).toBeLessThan(level.height / 2);
    expect(span.topElevation).toBe(level.height);
  });
});
