import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("ui coherence 192", () => {
  it("moves both Nexus and Master popouts to the desktop toolbar", () => {
    const bridge = source("src/components/master/master-toolbar-popout-bridge.tsx");
    const css = source("src/styles/ui-coherence-192.css");
    expect(bridge).toContain('path === "/master-panel" || path === "/nexus"');
    expect(bridge).toContain("actions.insertBefore(portalHost, actions.firstChild)");
    expect(css).toContain('[data-section="O Nexus"]');
    expect(css).toContain('[data-section="Painel do Mestre"]');
  });

  it("forces all primary nav guides to the exact same inline width", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain("inline-size: 100% !important");
    expect(css).toContain("min-width: 100% !important");
    expect(css).toContain("max-width: 100% !important");
    expect(css).toContain("margin-inline: 0 !important");
  });

  it("removes the clipped master navigation frame without removing the rail", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-master-navigation__scroller");
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("box-shadow: none !important");
  });

  it("docks smart setup immediately before the contextual panel collapse control", () => {
    const bridge = source(
      "src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx",
    );
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    expect(bridge).toContain('button[aria-label="Recolher painel contextual"]');
    expect(bridge).toContain("insertBefore(portalHost, minimize)");
    expect(deferred).toContain("<SmartSetupLauncherDockBridge />");
  });

  it("gives the 2D/3D view toggle an outlined and high-contrast active state", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain('[aria-label="Ativar projeção espacial 3D"]');
    expect(css).toContain('[aria-label="Voltar à planta 2D"]');
    expect(css).toContain("color: var(--primary-foreground) !important");
    expect(css).toContain("background: var(--primary) !important");
  });
});
