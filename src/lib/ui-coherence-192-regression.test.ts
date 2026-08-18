import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("ui coherence 192/193", () => {
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

  it("keeps one master navigation frame and removes the inner tabs card", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-master-navigation__scroller");
    expect(css).toContain('.tadeon-master-navigation__rail > [data-slot="tabs-list"]');
    expect(css).toContain("border: 0 !important");
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("box-shadow: none !important");
  });

  it("docks smart setup visibly before the contextual panel collapse control", () => {
    const bridge = source(
      "src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx",
    );
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const css = source("src/styles/ui-coherence-192.css");
    expect(bridge).toContain('button[aria-label="Recolher painel contextual"]');
    expect(bridge).toContain("insertBefore(portalHost, minimize)");
    expect(deferred).toContain("<SmartSetupLauncherDockBridge />");
    expect(css).toContain("z-index: 6 !important");
    expect(css).toContain("order: -1");
    expect(css).toContain("margin-right: .55rem !important");
  });

  it("keeps the 2D/3D toggle on the same background as peer toolbar buttons", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain('[aria-label="Ativar projeção espacial 3D"]');
    expect(css).toContain('[aria-label="Voltar à planta 2D"]');
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("border-color: color-mix(in srgb, var(--primary) 78%, var(--border)) !important");
  });

  it("moves Salvar sessão into the active-session metric strip and hides the old copy", () => {
    const bridge = source("src/components/master/master-toolbar-popout-bridge.tsx");
    const css = source("src/styles/ui-coherence-192.css");
    expect(bridge).toContain("MasterSessionSavePortal");
    expect(bridge).toContain('text.includes("Pistas")');
    expect(bridge).toContain('text.includes("Dobras")');
    expect(bridge).toContain('text.includes("Iniciativa")');
    expect(bridge).toContain('rpc("save_session_sheet_changes")');
    expect(css).toContain(".tadeon-master-session-save-host");
    expect(css).toContain('button[title="Registrar o Diff das fichas neste ponto da sessão"]');
  });
});
