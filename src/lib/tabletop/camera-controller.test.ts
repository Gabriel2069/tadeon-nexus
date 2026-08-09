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

  it("keeps the world point under the cursor fixed while zooming isometric", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    viewport.scale.set(0.8);
    viewport.position.set(260, 140);

    const cursor = { x: 617, y: 383 };
    const anchoredWorldPoint = camera.screenToWorld(cursor);

    camera.zoomAt(1.75, cursor);

    expect(camera.worldToScreen(anchoredWorldPoint).x).toBeCloseTo(cursor.x, 8);
    expect(camera.worldToScreen(anchoredWorldPoint).y).toBeCloseTo(cursor.y, 8);
  });

  it("does not accumulate grid drift across repeated isometric zooms", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    viewport.scale.set(1.1);
    viewport.position.set(180, 220);

    const cursor = { x: 480, y: 320 };
    const anchoredWorldPoint = camera.screenToWorld(cursor);

    for (const zoom of [1.6, 0.65, 2.2, 0.4, 1.1]) {
      camera.zoomAt(zoom, cursor);
    }

    expect(camera.worldToScreen(anchoredWorldPoint).x).toBeCloseTo(cursor.x, 8);
    expect(camera.worldToScreen(anchoredWorldPoint).y).toBeCloseTo(cursor.y, 8);
  });

  it("keeps pointer and grid coordinates aligned at arbitrary angles", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    camera.setOrientation({ yaw: 217, tilt: 0.68, elevationScale: 1.45 });
    camera.setElevation(384);
    viewport.scale.set(1.37);
    viewport.position.set(460, 210);

    const world = { x: 1_024, y: 768 };
    const restored = camera.screenToWorld(camera.worldToScreen(world));

    expect(restored.x).toBeCloseTo(world.x, 8);
    expect(restored.y).toBeCloseTo(world.y, 8);
  });

  it("maps pointer coordinates onto an elevated isometric floor", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    camera.setElevation(192);
    viewport.scale.set(1.25);
    viewport.position.set(310, 170);

    const floorPoint = { x: 480, y: 352 };
    const restored = camera.screenToWorld(camera.worldToScreen(floorPoint));

    expect(restored.x).toBeCloseTo(floorPoint.x, 8);
    expect(restored.y).toBeCloseTo(floorPoint.y, 8);
  });

  it("restaura um enquadramento persistido no centro da saída", () => {
    const viewport = new Container();
    const camera = new CameraController(viewport);
    camera.setProjection("isometric");
    camera.setElevation(192);

    camera.setView({ x: 720, y: 480 }, 1.35, 1280, 720);

    expect(camera.zoom).toBeCloseTo(1.35, 8);
    const restored = camera.screenToWorld({ x: 640, y: 360 });
    expect(restored.x).toBeCloseTo(720, 8);
    expect(restored.y).toBeCloseTo(480, 8);
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
