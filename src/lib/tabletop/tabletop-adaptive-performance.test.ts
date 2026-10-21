import { expect, it } from "vitest";
import { recommendTabletopQuality, lowerTabletopQuality } from "./tabletop-adaptive-performance";

it("preserves native scene content under pressure and reduces its animation budget instead", () => {
  const profile = recommendTabletopQuality({
    fps: 18,
    entityCount: 20,
    devicePixelRatio: 3,
    memoryGb: 4,
    coarsePointer: true,
  });
  expect(profile).toMatchObject({
    tier: "economy",
    nativeModels: true,
    nativeAnimationFps: 20,
    effects: "minimal",
  });
  expect(lowerTabletopQuality("high")).toMatchObject({
    nativeModels: true,
    nativeAnimationFps: 30,
  });
});
