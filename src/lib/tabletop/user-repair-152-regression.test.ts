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

  it("keeps the movable Dock and delegates selection geometry to repair 153", () => {
    const bridge = source("src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx");
    const css = source("src/styles/mobile-product-repair-153.css");
    expect(bridge).toContain("DOCK_POSITION_KEY");
    expect(bridge).toContain("tadeonDockDragging");
    expect(bridge).not.toContain('document.querySelectorAll<HTMLElement>("body *")');
    expect(css).toContain('.tadeon-tabletop-stage[data-tool="select"]::after');
    expect(css).toContain("inset: auto .75rem 4.25rem auto !important");
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

  it("keeps the master popout wide and no-sidebar while inheriting the normal page identity", () => {
    const shell = source("src/components/protected-shell.tsx");
    const parityCss = source("src/styles/dedicated-workspace-parity-168.css");
    expect(shell).toContain('return "popout" as const');
    expect(shell).toContain('className="tadeon-shell tadeon-dedicated-shell');
    expect(shell).toContain('data-section={focusedSection()}');
    expect(parityCss).toContain('[data-section="Painel do Mestre"]');
    expect(parityCss).toContain("max-width: none !important");
    expect(parityCss).toContain("border-color: color-mix");
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
