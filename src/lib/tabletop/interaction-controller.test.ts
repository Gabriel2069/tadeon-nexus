import { describe, expect, it } from "vitest";
import {
  shouldStartTabletopPan,
  tabletopTransformHandleHitRadius,
} from "./interaction-controller";

describe("tabletop camera intent", () => {
  it("keeps the camera fixed while editing with the selection tool", () => {
    expect(
      shouldStartTabletopPan({ button: 0, spacePressed: false, mode: "select" }),
    ).toBe(false);
  });

  it("moves only through an explicit pan gesture", () => {
    expect(
      shouldStartTabletopPan({ button: 0, spacePressed: false, mode: "pan" }),
    ).toBe(true);
    expect(
      shouldStartTabletopPan({ button: 0, spacePressed: true, mode: "select" }),
    ).toBe(true);
    expect(
      shouldStartTabletopPan({ button: 1, spacePressed: false, mode: "select" }),
    ).toBe(true);
  });

  it("gives touch handles a larger target instead of handing the gesture to pan", () => {
    expect(tabletopTransformHandleHitRadius("touch")).toBeGreaterThan(
      tabletopTransformHandleHitRadius("mouse"),
    );
    expect(tabletopTransformHandleHitRadius("touch")).toBe(24);
  });
});
