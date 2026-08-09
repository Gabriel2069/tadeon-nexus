import { describe, expect, it } from "vitest";
import { mapTabletopViewPreference } from "./tabletop-view-preference-service";

describe("preferência privada da câmera da Mesa", () => {
  it("mapeia números do Postgres e limita valores inválidos", () => {
    expect(
      mapTabletopViewPreference({
        scene_id: "scene",
        user_id: "user",
        projection: "isometric",
        camera_x: "120.5",
        camera_y: "-40",
        zoom: "1.35",
        yaw: "405",
        tilt: "0.72",
        elevation_scale: "1.4",
        active_level_id: "upper",
      }),
    ).toEqual({
      projection: "isometric",
      x: 120.5,
      y: -40,
      zoom: 1.35,
      yaw: 45,
      tilt: 0.72,
      elevationScale: 1.4,
      levelId: "upper",
    });
  });
});
