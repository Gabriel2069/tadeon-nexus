import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const setup = readFileSync(
  "src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx",
  "utf8",
);
const deferred = readFileSync(
  "src/components/tabletop/tabletop-deferred-enhancements.tsx",
  "utf8",
);
const grid = readFileSync("src/lib/tabletop/grid-renderer.ts", "utf8");
const fingerprint = readFileSync(
  "src/lib/tabletop/tabletop-scene-fingerprint-guard.ts",
  "utf8",
);

describe("tabletop setup, grid and autosave repair 197", () => {
  it("pins Setup to the map instead of the contextual-panel collapse control", () => {
    expect(setup).toContain('document.querySelector<HTMLElement>(".tadeon-tabletop-canvas-host")');
    expect(setup).toContain('canvas.insertAdjacentElement("afterend", portalHost)');
    expect(setup).not.toContain('button[aria-label="Recolher painel contextual"]');
    expect(setup).not.toContain("window.innerWidth < 1180");
    expect(deferred).toContain("{master && <><SmartSetupBridge /><SmartSetupLauncherDockBridge /></>}");
  });

  it("keeps the Pixi clipping mask active so grids render without leaking outside the scene", () => {
    expect(grid).toContain("this.lines.mask = this.clip");
    expect(grid).toContain("this.view.addChild(this.lines, this.clip)");
    expect(grid).not.toContain("this.clip.renderable = false");
    expect(grid).toContain("Math.max(0, scene.width)");
    expect(grid).toContain("Math.max(0, scene.height)");
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
