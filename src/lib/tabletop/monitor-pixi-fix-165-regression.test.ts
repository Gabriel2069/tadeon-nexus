import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const monitor = readFileSync("src/lib/client-error-monitor.ts", "utf8");
const grid = readFileSync("src/lib/tabletop/grid-renderer.ts", "utf8");
const pixiSafety = readFileSync("src/lib/tabletop/pixi-destroy-safety.ts", "utf8");

describe("monitor and Pixi teardown fix 165", () => {
  it("stores actionable client diagnostics in the existing JSON context", () => {
    expect(monitor).toContain("sanitizeClientErrorStack");
    expect(monitor).toContain("...(stack ? { stack } : {})");
    expect(monitor).toContain("VITE_APP_COMMIT_SHA");
    expect(monitor).toContain("devicePixelRatio");
    expect(monitor).toContain("navigator.userAgent");
  });

  it("prevents recursive destruction of an already destroyed Graphics context", () => {
    expect(grid).toContain('import "./pixi-destroy-safety"');
    expect(grid).toContain("this.view.removeFromParent()");
    expect(pixiSafety).toContain("if (this.destroyed) return");
    expect(pixiSafety).toContain("destroyGraphics.apply(this, args)");
    expect(pixiSafety).toContain("__tadeonDestroyGuardInstalled");
  });
});
