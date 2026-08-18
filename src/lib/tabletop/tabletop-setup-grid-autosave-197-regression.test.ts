import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const setup = readFileSync(
  "src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx",
  "utf8",
);
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
const fingerprint = readFileSync(
  "src/lib/tabletop/tabletop-scene-fingerprint-guard.ts",
  "utf8",
);

describe("tabletop setup, grid and autosave repair 197/198/200", () => {
  it("keeps the duplicate Setup launcher inert and the canonical launcher fixed at the top", () => {
    expect(setup).toContain("return null");
    expect(setup).not.toContain("WandSparkles");
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

  it("compares scene content without persistence-only metadata", () => {
    expect(deferred).toContain('import "@/lib/tabletop/tabletop-scene-fingerprint-guard"');
    expect(fingerprint).toContain("function canonicalScene(scene: TabletopScene)");
    expect(fingerprint).toContain('Object.defineProperty(target, "toJSON"');
    expect(fingerprint).toContain("tabletopPersistenceService.saveWorkspace = async");
    expect(fingerprint).not.toContain("campaignId: scene.campaignId");
    expect(fingerprint).not.toContain("version: entity.version");
  });
});
