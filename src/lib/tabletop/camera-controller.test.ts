import { Container } from "pixi.js";
import { describe, expect, it } from "vitest";
import { CameraController } from "./camera-controller";

describe("tabletop camera projection", () => {
  it("round-trips world coordinates in the isometric projection", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    viewport.scale.set(1.4);
    viewport.position.set(320, 180);

    const world = { x: 740, y: 260 };
    const restored = camera.screenToWorld(camera.worldToScreen(world));

    expect(restored.x).toBeCloseTo(world.x, 8);
    expect(restored.y).toBeCloseTo(world.y, 8);
  });

  it("fits the complete diamond inside the available screen", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    camera.fit(1200, 800, 1000, 700);

    const corners = [
      camera.worldToScreen({ x: 0, y: 0 }),
      camera.worldToScreen({ x: 1200, y: 0 }),
      camera.worldToScreen({ x: 1200, y: 800 }),
      camera.worldToScreen({ x: 0, y: 800 }),
    ];

    for (const corner of corners) {
      expect(corner.x).toBeGreaterThanOrEqual(55);
      expect(corner.x).toBeLessThanOrEqual(945);
      expect(corner.y).toBeGreaterThanOrEqual(55);
      expect(corner.y).toBeLessThanOrEqual(645);
    }
  });
});
