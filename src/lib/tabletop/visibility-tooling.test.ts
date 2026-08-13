import { describe, expect, it } from "vitest";
import {
  compactVisibilityToolPoints,
  createLevelRevealStrokes,
  hitTestTabletopFog,
  hitTestTabletopLight,
  tabletopFogBounds,
  transformTabletopFog,
  transformTabletopLight,
} from "./visibility-tooling";

describe("createLevelRevealStrokes", () => {
  it("cobre mapas grandes sem ultrapassar os limites persistidos", () => {
    let id = 0;
    const strokes = createLevelRevealStrokes({
      levelId: "andar-2",
      sceneWidth: 16_384,
      sceneHeight: 12_288,
      createId: () => `fog-${++id}`,
    });
    const points = strokes.flatMap((stroke) => stroke.points);

    expect(strokes.length).toBeGreaterThan(1);
    expect(strokes.every((stroke) => stroke.points.length <= 64)).toBe(true);
    expect(strokes.every((stroke) => stroke.radius <= 1_024)).toBe(true);
    expect(strokes.map((stroke) => stroke.sequenceIndex)).toEqual(
      strokes.map((_, index) => index),
    );

    for (const corner of [
      { x: 0, y: 0 },
      { x: 16_384, y: 0 },
      { x: 0, y: 12_288 },
      { x: 16_384, y: 12_288 },
    ]) {
      expect(
        points.some(
          (point) => Math.hypot(point.x - corner.x, point.y - corner.y) <= 960,
        ),
      ).toBe(true);
    }
  });

  it("normaliza dimensões negativas para uma operação válida", () => {
    const strokes = createLevelRevealStrokes({
      levelId: "base",
      sceneWidth: -100,
      sceneHeight: -100,
      createId: () => "fog-1",
    });

    expect(strokes).toHaveLength(1);
    expect(strokes[0]?.points).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ]);
  });

  it("compacta um traço livre preservando as duas extremidades", () => {
    const points = Array.from({ length: 1_000 }, (_, index) => ({
      x: index,
      y: Math.sin(index / 20) * 100,
    }));
    const compacted = compactVisibilityToolPoints(points);

    expect(compacted).toHaveLength(64);
    expect(compacted[0]).toEqual(points[0]);
    expect(compacted.at(-1)).toEqual(points.at(-1));
  });
});

describe("edição direta de névoa", () => {
  const rectangle = {
    id: "fog-rectangle",
    levelId: "base",
    operation: "reveal" as const,
    shape: "rectangle" as const,
    points: [
      { x: 100, y: 120 },
      { x: 300, y: 260 },
    ],
    radius: 32,
    sequenceIndex: 0,
  };

  it("seleciona corpo e as duas alças de uma região persistente", () => {
    expect(hitTestTabletopFog({ x: 180, y: 180 }, [rectangle], 8)).toEqual({
      id: rectangle.id,
      handle: "body",
    });
    expect(
      hitTestTabletopFog({ x: 101, y: 121 }, [rectangle], 8, rectangle.id),
    ).toEqual({ id: rectangle.id, handle: "start" });
    expect(
      hitTestTabletopFog({ x: 302, y: 261 }, [rectangle], 8, rectangle.id),
    ).toEqual({ id: rectangle.id, handle: "end" });
  });

  it("move a região e dimensiona por qualquer extremidade", () => {
    expect(
      transformTabletopFog(
        rectangle,
        "body",
        { x: 150, y: 150 },
        { x: 187, y: 204 },
        () => ({ x: 144, y: 176 }),
      ).points,
    ).toEqual([
      { x: 144, y: 176 },
      { x: 344, y: 316 },
    ]);
    const resized = transformTabletopFog(
      rectangle,
      "end",
      rectangle.points[0],
      { x: 420, y: 360 },
      (point) => point,
    );
    expect(tabletopFogBounds(resized)).toEqual({
      x: 100,
      y: 120,
      width: 320,
      height: 240,
    });
    expect(
      transformTabletopFog(
        rectangle,
        "start",
        rectangle.points[1],
        { x: 60, y: 80 },
        (point) => point,
      ).points,
    ).toEqual([
      { x: 60, y: 80 },
      { x: 300, y: 260 },
    ]);
  });
});

describe("edição direta de luz", () => {
  const light = {
    id: "light-1",
    levelId: "base",
    entityId: null,
    x: 120,
    y: 90,
    radius: 80,
    intensity: 1,
    color: "#f2c66d",
    enabled: true,
    castsShadows: true,
  };

  it("distingue o centro e a alça de alcance da luz selecionada", () => {
    expect(hitTestTabletopLight({ x: 121, y: 91 }, [light], 8)).toEqual({
      id: "light-1",
      handle: "body",
    });
    expect(
      hitTestTabletopLight({ x: 201, y: 90 }, [light], 8, "light-1"),
    ).toEqual({ id: "light-1", handle: "radius" });
  });

  it("move com snap e redimensiona sem ultrapassar os limites persistidos", () => {
    expect(
      transformTabletopLight(light, "body", { x: 157, y: 203 }, () => ({
        x: 160,
        y: 200,
      })),
    ).toMatchObject({ x: 160, y: 200, radius: 80 });
    expect(
      transformTabletopLight(light, "radius", { x: 320, y: 90 }, (p) => p),
    ).toMatchObject({ x: 120, y: 90, radius: 200 });
  });
});
