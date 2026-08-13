import { describe, expect, it } from "vitest";
import {
  clampVisibilityState,
  EMPTY_TABLETOP_VISIBILITY,
} from "./tabletop-visibility-service";

describe("estado de iluminação e neblina", () => {
  it("limita intensidade, opacidade e quantidade de pontos", () => {
    const state = clampVisibilityState({
      ...EMPTY_TABLETOP_VISIBILITY,
      globalIllumination: -2,
      fogOpacity: 5,
      lights: [
        {
          id: "light",
          entityId: null,
          x: 0,
          y: 0,
          radius: 2,
          intensity: 4,
          color: "#ffffff",
          enabled: true,
          castsShadows: true,
        },
      ],
      fogStrokes: [
        {
          id: "fog",
          operation: "reveal",
          shape: "brush",
          radius: 5000,
          sequenceIndex: 99,
          points: Array.from({ length: 100 }, (_, index) => ({
            x: index,
            y: index,
          })),
        },
      ],
    });
    expect(state.globalIllumination).toBe(0);
    expect(state.fogOpacity).toBe(1);
    expect(state.lights[0]).toMatchObject({ radius: 8, intensity: 1 });
    expect(state.fogStrokes[0].points).toHaveLength(64);
    expect(state.fogStrokes[0]).toMatchObject({
      radius: 1024,
      sequenceIndex: 0,
    });
  });
});
