import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildVisibilityPolygon } from "./visibility-geometry";
import { tabletopFogUsesCoveredBase } from "./visibility-renderer";
import type { TabletopFogStroke, TabletopLight, TabletopWall } from "./tabletop-visibility-service";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function fog(operation: "reveal" | "hide", sequenceIndex: number): TabletopFogStroke {
  return {
    id: `${operation}-${sequenceIndex}`,
    operation,
    shape: "rectangle",
    points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
    radius: 16,
    sequenceIndex,
  };
}

describe("acabamento espacial da Mesa Nexus", () => {
  it("mantém o inspetor responsivo não modal e recupera a telemetria inferior", () => {
    const route = source("src/components/tabletop/tabletop-route-experience.tsx");
    const css = source("src/styles/tabletop-spatial-finish.css");

    expect(route).toContain('import "@/styles/tabletop-spatial-finish.css";');
    expect(css).toContain(".tadeon-tabletop-panel-backdrop[data-open=\"true\"]");
    expect(css).toContain("pointer-events: none !important;");
    expect(css).toContain(".tadeon-tabletop-stage-status");
    expect(css).toContain("display: flex !important;");
    expect(css).toContain("bottom: 4.65rem !important;");
  });

  it("remove o chrome duplicado que flutuava sobre seleção e painel do mestre", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const css = source("src/styles/tabletop-spatial-finish.css");

    expect(deferred).not.toContain("DirectorEnhancementBridge");
    expect(deferred).toContain("FogGeometryBridge");
    expect(css).toContain(".tadeon-tabletop-radial-menu");
    expect(css).toContain("display: none !important;");
  });

  it("expõe névoa por geometria e mantém revelar/cobrir determinísticos em pilhas mistas", () => {
    const bridge = source("src/components/tabletop/tabletop-fog-geometry-bridge.tsx");

    expect(bridge).toContain('useState<PracticalFogShape>("rectangle")');
    expect(bridge).toContain('id: "ellipse"');
    expect(bridge).toContain('id: "brush"');
    expect(tabletopFogUsesCoveredBase([])).toBe(true);
    expect(tabletopFogUsesCoveredBase([fog("reveal", 0), fog("hide", 1)])).toBe(true);
    expect(tabletopFogUsesCoveredBase([fog("hide", 0), fog("reveal", 1)])).toBe(false);
  });

  it("preserva a forma de cone ao calcular sombras", () => {
    const light: TabletopLight = {
      id: "cone",
      entityId: null,
      x: 100,
      y: 100,
      elevation: 0,
      radius: 90,
      intensity: 1,
      color: "#ffffff",
      enabled: true,
      castsShadows: true,
      properties: { shape: "cone", direction: 0, angle: 60 },
    };
    const polygon = buildVisibilityPolygon(light, [], 400, 400);

    expect(polygon.length).toBeGreaterThan(12);
    for (const point of polygon) {
      const angle = Math.atan2(point.y - light.y, point.x - light.x);
      expect(Math.abs(angle)).toBeLessThanOrEqual(Math.PI / 6 + 0.01);
    }
  });

  it("deixa uma luz elevada ultrapassar uma parede mais baixa", () => {
    const wall: TabletopWall = {
      id: "wall",
      x1: 145,
      y1: 40,
      x2: 145,
      y2: 160,
      wallType: "wall",
      blocksVision: true,
      blocksMovement: true,
      baseElevation: 0,
      height: 40,
    };
    const base: TabletopLight = {
      id: "light",
      entityId: null,
      x: 100,
      y: 100,
      radius: 100,
      intensity: 1,
      color: "#ffffff",
      enabled: true,
      castsShadows: true,
      properties: { shape: "cone", direction: 0, angle: 50 },
    };

    const low = buildVisibilityPolygon({ ...base, elevation: 10 }, [wall], 400, 400);
    const high = buildVisibilityPolygon({ ...base, elevation: 80 }, [wall], 400, 400);
    expect(Math.max(...low.map((point) => point.x))).toBeLessThan(151);
    expect(Math.max(...high.map((point) => point.x))).toBeGreaterThan(190);
  });

  it("renderiza tokens isométricos sobre base volumétrica em vez de somente billboard solto", () => {
    const renderer = source("src/lib/tabletop/entity-renderer.ts");

    expect(renderer).toContain('new Graphics({ label: "token-depth" })');
    expect(renderer).toContain("VOLUMETRIC_TOKEN_TYPES");
    expect(renderer).toContain("properties.token_volume !== false");
    expect(renderer).toContain("entity.height - volume.height");
  });
});
