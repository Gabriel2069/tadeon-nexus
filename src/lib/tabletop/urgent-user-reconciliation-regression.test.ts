import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("reconciliação urgente de UI", () => {
  it("restaura a geometria simétrica anterior do menu lateral recolhido", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain("width: 5rem !important");
    expect(css).toContain("width: 3.35rem !important");
    expect(css).toContain("margin-inline: auto !important");
    expect(css).toContain("justify-content: center !important");
  });

  it("faz o mapa definir a altura e mantém o painel contextual rolável", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain("--tadeon-tabletop-frame-height");
    expect(css).toContain("height: var(--tadeon-tabletop-frame-height) !important");
    expect(css).toContain(".tadeon-tabletop-panel");
    expect(css).toContain("overflow-y: auto !important");
    expect(css).toContain("scrollbar-gutter: stable");
  });

  it("ancora a barra operacional ao stage e permite recolher para a lateral", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    const bridge = source(
      "src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx",
    );
    expect(css).toContain("--tadeon-tabletop-stage-top");
    expect(css).toContain('html[data-tadeon-tabletop-toprail="collapsed"]');
    expect(css).toContain(".tadeon-tabletop-toprail-toggle");
    expect(bridge).toContain("ResizeObserver");
    expect(bridge).toContain("TOP_RAIL_KEY");
  });

  it("neutraliza superfícies fullscreen sempre que uma entidade é selecionada", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    const bridge = source(
      "src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx",
    );
    expect(css).toContain('data-tadeon-tabletop-selection-active="true"');
    expect(css).toContain("backdrop-filter: none !important");
    expect(css).toContain("filter: none !important");
    expect(bridge).toContain("tadeon-tabletop-render");
    expect(bridge).toContain("closeMobileInspectorForSelection");
    expect(bridge).toContain("snapshot().selectedIds.length");
  });

  it("corrige a largura do remoto na grade pai e restaura os toggles compactos", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain(".tadeon-live-session__room > .tadeon-director-remote");
    expect(css).toContain("grid-column: 1 / -1 !important");
    expect(css).toContain("min-height: 7.1rem !important");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr)) !important");
    expect(css).toContain('[data-slot="switch"]');
  });

  it("mantém o popout do mestre no mesmo AppLayout da rota original", () => {
    const shell = source("src/components/protected-shell.tsx");
    expect(shell).toContain('window.location.pathname === "/master-panel"');
    expect(shell).toContain('params.get("popout") === "1"');
    expect(shell).toContain("return null;");
  });

  it("torna condições ativas e instrumentos de Equilíbrio/Rank visualmente explícitos", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain('.tadeon-condition-card[style*="box-shadow"]');
    expect(css).toContain("#equilibrio");
    expect(css).toContain("#exposicao");
    expect(css).toContain(".tadeon-entity-dossier");
  });

  it("mantém o botão de vínculos visualmente só com ícone", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain(".tadeon-link-collapse");
    expect(css).toContain("font-size: 0 !important");
    expect(css).toContain("gap: 0 !important");
  });

  it("carrega a reconciliação depois das autoridades visuais anteriores", () => {
    const root = source("src/routes/__root.tsx");
    const older = root.indexOf("selectionDirectorEntryCss");
    const urgent = root.indexOf("urgentReconciliationCss");
    expect(older).toBeGreaterThanOrEqual(0);
    expect(urgent).toBeGreaterThan(older);
  });
});
