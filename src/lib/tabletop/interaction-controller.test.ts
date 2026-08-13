import { describe, expect, it } from "vitest";
import { shouldStartTabletopPan } from "./interaction-controller";

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
});
