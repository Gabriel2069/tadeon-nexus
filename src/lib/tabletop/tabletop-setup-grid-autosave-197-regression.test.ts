import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

const canonicalSetup = readFileSync(
  "src/components/tabletop/tabletop-smart-setup-bridge.tsx",
  "utf8",
);
const setupCss = readFileSync("src/styles/tabletop-smart-setup.css", "utf8");
const deferred = readFileSync(
  "src/components/tabletop/tabletop-deferred-enhancements.tsx",
  "utf8",
);
const grid = readFileSync("src/lib/tabletop/grid-renderer.ts", "utf8");

describe("tabletop setup, grid and autosave repair 197/198/200", () => {
  it("keeps the duplicate Setup launcher inert and the canonical launcher fixed at the top", () => {
    expect(deferred).not.toContain("SmartSetupLauncherDockBridge");
    expect(canonicalSetup).toContain('className="tadeon-smart-setup__launcher"');
    expect(setupCss).toContain(".tadeon-smart-setup__launcher {");
    expect(setupCss).toContain("position: fixed");
    expect(setupCss).toContain("top:");
    expect(deferred).toContain("<SmartSetupBridge />");
  });

  it("uses the last known-good direct Graphics grid renderer without a Pixi mask", () => {
    expect(grid).toContain("readonly view = new Graphics()");
    expect(grid).toContain("function clippedHexPoints");
    expect(grid).toContain("function clipLineToScene");
    expect(grid).toContain("drawClippedLine(view, scene");
    expect(grid).not.toContain("this.lines.mask");
    expect(grid).not.toContain("new Container");
  });

});
