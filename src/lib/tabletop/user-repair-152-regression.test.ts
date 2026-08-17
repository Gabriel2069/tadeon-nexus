import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("field repair 152", () => {
  it("loads the field repair after the previous urgent css authority", () => {
    const root = source("src/routes/__root.tsx");
    expect(root.indexOf("urgentReconciliationCss")).toBeLessThan(
      root.indexOf("tabletopMapChromeRepairCss"),
    );
    expect(root.indexOf("tabletopMapChromeRepairCss")).toBeLessThan(
      root.indexOf("userRepair152Css"),
    );
  });

  it("returns Cena Editar Visao to flow and anchors the real reliability rail to the stage", () => {
    const css = source("src/styles/tabletop-map-chrome-repair.css");
    expect(css).toContain(".tadeon-tabletop-toolbar[data-tadeon-top-rail]");
    expect(css).toContain("position: static !important");
    expect(css).toContain(".tadeon-tabletop-reliability-strip");
    expect(css).toContain("--tadeon-tabletop-stage-top");
    expect(css).toContain('html[data-tadeon-tabletop-toprail="collapsed"] .tadeon-tabletop-reliability-strip');
  });

  it("guards the real visual blocker while a tabletop entity is selected", () => {
    const bridge = source("src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx");
    const css = source("src/styles/tabletop-map-chrome-repair.css");
    expect(bridge).toContain('document.querySelectorAll<HTMLElement>("body *")');
    expect(bridge).toContain("overlapRatio(rect, stageRect) < 0.58");
    expect(bridge).toContain("legacyBackdrop?.click()");
    expect(bridge).toContain('element.dataset.tadeonSelectionGuarded = "true"');
    expect(css).toContain('[data-tadeon-selection-guarded="true"]');
    expect(css).toContain("backdrop-filter: none !important");
  });

  it("keeps Setup stage anchored and lets the expanded creative Dock move", () => {
    const bridge = source("src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx");
    const css = source("src/styles/tabletop-map-chrome-repair.css");
    expect(bridge).toContain("DOCK_POSITION_KEY");
    expect(bridge).toContain("tadeonDockDragging");
    expect(bridge).toContain("tadeon-tabletop-toprail-setup");
    expect(bridge).toContain(".tadeon-smart-setup__launcher");
    expect(css).toContain('[data-tadeon-dock-dragged="true"]');
    expect(css).toContain("--tadeon-tabletop-stage-bottom");
  });

  it("uses a dedicated wide no-sidebar presentation for the master panel popout", () => {
    const shell = source("src/components/protected-shell.tsx");
    const css = source("src/styles/user-repair-152.css");
    expect(shell).toContain('return "master-panel" as const');
    expect(shell).toContain('data-dedicated-presentation={dedicated}');
    expect(css).toContain('[data-dedicated-presentation="master-panel"]');
    expect(css).toContain("max-width: none !important");
  });

  it("restores the original dashboard and dossier instead of restyling them again", () => {
    const css = source("src/styles/user-repair-152.css");
    expect(css).toContain("border-radius: 1.35rem .5rem 1.35rem .5rem !important");
    expect(css).toContain("linear-gradient(135deg, rgb(18 21 26 / 96%), rgb(11 13 17 / 92%))");
    expect(css).toContain("0 34px 100px rgb(0 0 0 / 72%)");
    expect(css).toContain("rgb(255 255 255 / 5%), rgb(255 255 255 / 1%)");
  });

  it("replaces sheet side stripes with colored corner light and upgrades danger states", () => {
    const css = source("src/styles/user-repair-152.css");
    const bridge = source("src/components/user-repair-152-bridge.tsx");
    expect(css).toContain("right: -4.4rem !important");
    expect(css).toContain("left: auto !important");
    expect(css).toContain("conic-gradient(from 208deg");
    expect(css).toContain('[data-tadeon-condition-kind="morrendo"]');
    expect(css).toContain('[data-tadeon-condition-kind="colapsando"]');
    expect(bridge).toContain("--condition-fill");
    expect(bridge).toContain('button[aria-pressed]');
  });
});
