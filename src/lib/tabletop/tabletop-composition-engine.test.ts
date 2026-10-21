// @vitest-environment jsdom
import { expect, it } from "vitest";
import { TabletopEngine } from "./tabletop-engine";
import { cloneScene, EMPTY_TABLETOP_SCENE } from "./types";

function setup() {
  const engine = new TabletopEngine();
  engine.loadScene(cloneScene(EMPTY_TABLETOP_SCENE));
  engine.addEntityAt(
    {
      type: "object",
      label: "Arco",
      width: 64,
      height: 32,
      color: 0x123456,
      rotation: 45,
      elevation: 8,
      properties: { model_scale: 1.4, model_yaw: 20 },
    },
    { x: 600, y: 600 },
  );
  return engine;
}

it("inserts a stepped set in one undo transaction, with original dimensions, color and 3D settings", async () => {
  const engine = setup();
  const original = engine.snapshot.scene.entities[0];
  expect(original).toMatchObject({ color: 0x123456, rotation: 45, elevation: 8 });
  expect(
    engine.repeatSelected({ copies: 3, stepX: 96, stepY: 0, elevationStep: 16, rotationStep: 15 }),
  ).toBe(3);
  expect(engine.snapshot.scene.entities).toHaveLength(4);
  expect(engine.snapshot.selectedIds).toHaveLength(3);
  expect(engine.snapshot.scene.entities.slice(1).map((e) => e.elevation)).toEqual([24, 40, 56]);
  expect(engine.snapshot.scene.entities[3]).toMatchObject({
    color: 0x123456,
    rotation: 90,
    properties: { model_scale: 1.4, model_yaw: 20 },
  });
  engine.undo();
  expect(engine.snapshot.scene.entities).toEqual([original]);
  expect(engine.snapshot.selectedIds).toHaveLength(0);
  engine.redo();
  expect(engine.snapshot.scene.entities).toHaveLength(4);
  await engine.destroy();
});

it("honors read-only and locked pieces, and rejects a whole out-of-bounds batch", async () => {
  const engine = setup();
  const options = { copies: 2, stepX: 10000, stepY: 0, elevationStep: 0, rotationStep: 0 };
  expect(engine.repeatSelected(options)).toBe(0);
  expect(engine.snapshot.scene.entities).toHaveLength(1);
  engine.updateSelected({ locked: true });
  expect(engine.repeatSelected({ ...options, stepX: 80 })).toBe(0);
  engine.setReadOnly(true);
  expect(engine.formSelected("grid")).toBe(false);
  expect(engine.repeatSelected({ ...options, stepX: 80 })).toBe(0);
  await engine.destroy();
});

it("explicit grid fitting respects grid origin even when automatic snapping is off", async () => {
  const engine = setup();
  const entity = engine.snapshot.scene.entities[0];
  engine.loadScene({
    ...engine.snapshot.scene,
    gridOffsetX: 10,
    gridOffsetY: -6,
    snap: false,
    entities: [{ ...entity, x: 38, y: 30 }],
  });
  engine.selectEntityById(entity.id);
  engine.snapSelectedToGrid();
  expect(engine.snapshot.scene.entities[0]).toMatchObject({ x: 10, y: 58 });
  engine.undo();
  expect(engine.snapshot.scene.entities[0]).toMatchObject({ x: 38, y: 30 });
  await engine.destroy();
});
