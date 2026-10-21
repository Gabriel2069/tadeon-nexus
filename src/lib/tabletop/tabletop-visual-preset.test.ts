import { expect, it } from "vitest";
import { tabletopVisualPreset } from "./tabletop-visual-preset";
import type { TabletopEntity } from "./types";

it("retains model authorship and color while excluding private links and arbitrary properties", () => {
  const entity = {
    id: "one",
    type: "object",
    label: "Arco",
    width: 80,
    height: 40,
    color: 0x123456,
    rotation: 30,
    elevation: 16,
    ownerUserId: "private-user",
    linkedSheetId: "private-sheet",
    linkedKnowledgeNodeId: "private-page",
    assetId: "asset",
    assetUrl: "https://example.test/arch.glb",
    properties: {
      mime_type: "model/gltf-binary",
      model_scale: 1.8,
      model_yaw: 45,
      model_elevation_offset: 12,
      model_animation_paused: true,
      notes: "private",
      secret: "hidden",
    },
  } as TabletopEntity;
  const preset = tabletopVisualPreset(entity);
  expect(preset).toMatchObject({
    color: 0x123456,
    rotation: 30,
    elevation: 16,
    assetId: "asset",
    properties: {
      base_color: 0x123456,
      model_scale: 1.8,
      model_yaw: 45,
      model_elevation_offset: 12,
      model_animation_paused: true,
    },
  });
  expect(preset).not.toHaveProperty("ownerUserId");
  expect(preset).not.toHaveProperty("linkedSheetId");
  expect(preset.properties).not.toHaveProperty("notes");
  expect(preset.properties).not.toHaveProperty("secret");
});
