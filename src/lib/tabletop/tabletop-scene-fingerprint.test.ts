import { expect, it } from "vitest";
import { tabletopSceneFingerprint as fingerprint } from "./tabletop-scene-fingerprint-guard";
import { cloneScene, EMPTY_TABLETOP_SCENE } from "./types";
it("detects edits in a cloned scene without carrying an old serializer", () => {
  const original = cloneScene(EMPTY_TABLETOP_SCENE),
    current = cloneScene(original);
  current.name = "Uma cena diferente";
  expect(fingerprint(current)).not.toBe(fingerprint(original));
  const next = cloneScene(current);
  next.layers[0].visible = false;
  expect(fingerprint(next)).not.toBe(fingerprint(current));
});
it("ignores persistence metadata and signed URL refreshes without ignoring asset identity", () => {
  const original = {
    ...cloneScene(EMPTY_TABLETOP_SCENE),
    version: 1,
    campaignId: "one",
    backgroundAssetId: "map",
    backgroundAssetUrl: "signed-one",
  };
  const renewed = { ...original, version: 2, campaignId: "two", backgroundAssetUrl: "signed-two" };
  expect(fingerprint(original)).toBe(fingerprint(renewed));
  expect(fingerprint({ ...renewed, backgroundAssetId: "other-map" })).not.toBe(
    fingerprint(original),
  );
});
it("detects entity edits after cloning while excluding entity versions", () => {
  const original = {
    ...cloneScene(EMPTY_TABLETOP_SCENE),
    entities: [
      {
        id: "one",
        layerId: "tokens",
        type: "token" as const,
        label: "Ariadne",
        x: 10,
        y: 20,
        width: 40,
        height: 40,
        rotation: 0,
        zIndex: 1,
        hidden: false,
        locked: false,
        color: 0x547b94,
        version: 1,
      },
    ],
  };
  const current = cloneScene(original);
  current.entities[0].x = 80;
  expect(fingerprint(current)).not.toBe(fingerprint(original));
  const renewed = { ...original, entities: [{ ...original.entities[0], version: 2 }] };
  expect(fingerprint(renewed)).toBe(fingerprint(original));
});
