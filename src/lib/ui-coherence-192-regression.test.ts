import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("ui coherence 192/193/194/195", () => {
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

  it("removes the master navigation wrapper as a visual surface", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-master-navigation {");
    expect(css).toContain("display: contents !important");
    expect(css).toContain(".tadeon-master-navigation__scroller");
    expect(css).toContain("width: 100% !important");
  });

  it("targets the inspected setup and collapse controls directly", () => {
    const css = source("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-tabletop-toprail-setup");
    expect(css).toContain(".tadeon-tabletop-toprail-toggle");
    expect(css).toContain("order: 1 !important");
    expect(css).toContain("order: 2 !important");
  });

  it("makes the 2D/3D toggle use the exact outline Button variant of its peers", () => {
    const button = source("src/components/ui/button.tsx");
    expect(button).toContain('ariaLabel === "Ativar projeção espacial 3D"');
    expect(button).toContain('ariaLabel === "Voltar à planta 2D"');
    expect(button).toContain('const effectiveVariant = isProjectionToggle ? "outline" : variant');
    expect(button).toContain("data-variant={effectiveVariant ?? \"default\"}");
    expect(button).toContain("buttonVariants({ variant: effectiveVariant, size, className })");
  });

  it("mounts Salvar sessão immediately above the active-session metrics", () => {
    const bridge = source("src/components/master/master-toolbar-popout-bridge.tsx");
    const css = source("src/styles/ui-coherence-192.css");
    expect(bridge).toContain("MasterSessionSavePortal");
    expect(bridge).toContain('text.includes("Pistas")');
    expect(bridge).toContain('text.includes("Dobras")');
    expect(bridge).toContain('text.includes("Iniciativa")');
    expect(bridge).toContain("parent.insertBefore(portalHost, metrics)");
    expect(bridge).toContain('rpc("save_session_sheet_changes")');
    expect(css).toContain("grid-column: 2;");
    expect(css).toContain("grid-row: 1;");
    expect(css).toContain(".tadeon-master-session-save-host + .grid.grid-cols-3.gap-2");
    expect(css).toContain("grid-row: 2 !important;");
  });
});
