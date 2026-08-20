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

  it("fixa a barra de modos e ancora o chrome ao retângulo visível do stage", () => {
    const oldCss = source("src/styles/urgent-user-reconciliation.css");
    const repairCss = source("src/styles/tabletop-map-chrome-repair.css");
    const fixedMenusCss = source("src/styles/tabletop-fixed-menus-tactical-240.css");
    const finalCss = source("src/styles/create-sheet-search-viewport-163.css");
    const bridge = source(
      "src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx",
    );
    const floatingBridge = source(
      "src/components/tabletop/tabletop-floating-layout-bridge.tsx",
    );
    expect(oldCss).toContain("--tadeon-tabletop-stage-top");
    expect(repairCss).toContain(".tadeon-tabletop-toolbar[data-tadeon-top-rail]");
    expect(repairCss).toContain("position: fixed !important");
    expect(repairCss).toContain("--tadeon-tabletop-stage-fixed-top");
    expect(repairCss).toContain(".tadeon-tabletop-reliability-strip");
    expect(repairCss).toContain('html[data-tadeon-tabletop-reliability="collapsed"]');
    expect(repairCss).toContain(".tadeon-tabletop-toprail-toggle");
    expect(fixedMenusCss).toContain("--tadeon-tabletop-stage-fixed-bottom");
    expect(fixedMenusCss).toContain("--tadeon-tabletop-stage-fixed-width");
    expect(fixedMenusCss).toContain('html[data-tadeon-tabletop-tablet="true"]');
    expect(fixedMenusCss).toContain("display: contents !important");
    expect(fixedMenusCss).toContain("flex: 1 1 0 !important");
    expect(floatingBridge).toContain("visualViewport");
    expect(floatingBridge).toContain('window.addEventListener("scroll", schedule');
    expect(floatingBridge).toContain("--tadeon-tabletop-stage-fixed-height");
    expect(bridge).toContain("ResizeObserver");
    expect(bridge).toContain("RELIABILITY_KEY");
    expect(bridge).not.toContain("TOP_RAIL_KEY");
    expect(finalCss).toContain(
      'html[data-tadeon-tabletop-reliability="collapsed"] .tadeon-tabletop-reliability-strip',
    );
    expect(finalCss).toContain(
      "html[data-tadeon-tabletop-reliability] .tadeon-tabletop-toolbar",
    );
  });

  it("mantém dialogs fixed acima do overlay, centralizados e roláveis com teclado", () => {
    const popupBridge = source("src/components/visual-viewport-popup-bridge.tsx");
    const popupCss = source("src/styles/tablet-popup-viewport-237.css");
    const dialog = source("src/components/ui/dialog.tsx");
    const alertDialog = source("src/components/ui/alert-dialog.tsx");
    expect(popupBridge).toContain('root.dataset.tadeonPopupViewport = "true"');
    expect(popupBridge).toContain("keepFocusedFieldVisible");
    expect(popupBridge).toContain("followVisualOffsets");
    expect(popupBridge).toContain('window.visualViewport?.addEventListener("scroll", schedule');
    expect(popupCss).toContain('html[data-tadeon-popup-viewport="true"]');
    expect(popupCss).toContain("top: var(--tadeon-vv-center-y) !important");
    expect(popupCss).toContain("left: var(--tadeon-vv-center-x) !important");
    expect(popupCss).toContain("transform: translate(-50%, -50%) !important");
    expect(popupCss).toContain("overflow-y: auto !important");
    expect(popupCss).toContain("z-index: 60 !important");
    expect(popupCss).toContain("z-index: 90 !important");
    expect(popupCss).toContain("backdrop-filter: none !important");
    expect(dialog).not.toContain('data-slot="dialog-viewport"');
    expect(alertDialog).not.toContain('data-slot="alert-dialog-viewport"');
  });

  it("corrige o blackout na geometria do aviso de câmera e abandona o scanner invasivo", () => {
    const editorCss = source("src/styles/tabletop-editor.css");
    const repairCss = source("src/styles/mobile-product-repair-153.css");
    const bridge = source(
      "src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx",
    );
    expect(editorCss).toContain('content: "CÂMERA TRAVADA · USE MÃO OU ESPAÇO"');
    expect(repairCss).toContain('.tadeon-tabletop-stage[data-tool="select"]::after');
    expect(repairCss).toContain("inset: auto .75rem 4.25rem auto !important");
    expect(repairCss).toContain("top: auto !important");
    expect(repairCss).toContain("left: auto !important");
    expect(bridge).not.toContain("guardSelectionSurfaces");
    expect(bridge).not.toContain('document.querySelectorAll<HTMLElement>("body *")');
    expect(bridge).not.toContain("closeSelectModeBackdrop");
  });

  it("corrige a largura do remoto na grade pai e restaura os toggles compactos", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain(".tadeon-live-session__room > .tadeon-director-remote");
    expect(css).toContain("grid-column: 1 / -1 !important");
    expect(css).toContain("min-height: 7.1rem !important");
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr)) !important");
    expect(css).toContain('[data-slot="switch"]');
  });

  it("abre o popout do mestre sem AppLayout preservando o shell visual original", () => {
    const shell = source("src/components/protected-shell.tsx");
    expect(shell).toContain('params.get("popout") === "1"');
    expect(shell).toContain('return "popout" as const');
    expect(shell).toContain('className="tadeon-shell tadeon-dedicated-shell');
    expect(shell).toContain('data-section={focusedSection()}');
    expect(shell).toContain('data-dedicated-presentation={presentation}');
    expect(shell).toContain("tadeon-ambient tadeon-ambient--veil");
  });

  it("torna condições ativas e instrumentos de Equilíbrio/Rank visualmente explícitos", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    const repairCss = source("src/styles/user-repair-152.css");
    expect(css).toContain('.tadeon-condition-card[style*="box-shadow"]');
    expect(css).toContain("#equilibrio");
    expect(css).toContain("#exposicao");
    expect(repairCss).toContain('[data-tadeon-condition-kind="morrendo"]');
    expect(repairCss).toContain('[data-tadeon-condition-kind="colapsando"]');
  });

  it("mantém o botão de vínculos visualmente só com ícone", () => {
    const css = source("src/styles/urgent-user-reconciliation.css");
    expect(css).toContain(".tadeon-link-collapse");
    expect(css).toContain("font-size: 0 !important");
    expect(css).toContain("gap: 0 !important");
  });

  it("carrega a reparação 153 depois das autoridades visuais anteriores", () => {
    const root = source("src/routes/__root.tsx");
    const older = root.indexOf("selectionDirectorEntryCss");
    const urgent = root.indexOf("urgentReconciliationCss");
    const mapRepair = root.indexOf("tabletopMapChromeRepairCss");
    const finalRepair = root.indexOf("userRepair152Css");
    const mobileRepair = root.indexOf("mobileProductRepair153Css");
    expect(older).toBeGreaterThanOrEqual(0);
    expect(urgent).toBeGreaterThan(older);
    expect(mapRepair).toBeGreaterThan(urgent);
    expect(finalRepair).toBeGreaterThan(mapRepair);
    expect(mobileRepair).toBeGreaterThan(finalRepair);
  });
});
