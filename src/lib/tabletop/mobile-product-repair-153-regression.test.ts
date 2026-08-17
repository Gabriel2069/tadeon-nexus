import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mobile product repair 153", () => {
  it("fixes the select camera hint geometry instead of hiding arbitrary surfaces", () => {
    const editorCss = source("src/styles/tabletop-editor.css");
    const repairCss = source("src/styles/mobile-product-repair-153.css");
    const bridge = source(
      "src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx",
    );

    expect(editorCss).toContain('content: "CÂMERA TRAVADA · USE MÃO OU ESPAÇO"');
    expect(editorCss).toContain(".tadeon-tabletop-stage::after");
    expect(editorCss).toContain("inset: 0");
    expect(repairCss).toContain('.tadeon-tabletop-stage[data-tool="select"]::after');
    expect(repairCss).toContain("inset: auto .75rem 4.25rem auto !important");
    expect(repairCss).toContain("top: auto !important");
    expect(repairCss).toContain("left: auto !important");
    expect(bridge).not.toContain('document.querySelectorAll<HTMLElement>("body *")');
    expect(bridge).not.toContain("guardSelectionSurfaces");
    expect(bridge).not.toContain("tadeonSelectionGuarded");
  });

  it("recomposes the sheet commandbar on mobile and prevents active card clipping", () => {
    const css = source("src/styles/mobile-product-repair-153.css");
    expect(css).toContain(".tadeon-sheet-commandbar__main");
    expect(css).toContain("grid-template-columns: 2.6rem minmax(0, 1fr) auto !important");
    expect(css).toContain(".tadeon-sheet-commandbar__actions");
    expect(css).toContain("#condicoes .tadeon-condition-grid");
    expect(css).toContain("#sec-info .tadeon-identity-foundation");
    expect(css).toContain('.tadeon-condition-card[data-tadeon-condition-active="true"]');
    expect(css).toContain("transform: none !important");
  });

  it("keeps dying and collapsing counters centered on every viewport", () => {
    const css = source("src/styles/mobile-product-repair-153.css");
    expect(css).toContain('[data-tadeon-condition-kind="morrendo"]');
    expect(css).toContain('[data-tadeon-condition-kind="colapsando"]');
    expect(css).toContain("justify-items: center !important");
    expect(css).toContain("justify-content: center !important");
  });

  it("restores Mesa label and keeps tabletop mobile controls centered and clickable", () => {
    const css = source("src/styles/mobile-product-repair-153.css");
    const layout = source("src/components/app-layout.tsx");
    expect(layout).toContain("<span>Mesa</span>");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/tabletop"] > span');
    expect(css).toContain(".tadeon-tabletop-studio__header");
    expect(css).toContain("pointer-events: auto !important");
    expect(css).toContain(".tadeon-tabletop-toolbar");
    expect(css).toContain("justify-content: center !important");
    expect(css).toContain("--tadeon-tabletop-stage-center");
  });

  it("bounds search and create-sheet dialogs to the mobile viewport", () => {
    const css = source("src/styles/mobile-product-repair-153.css");
    expect(css).toContain(':has([data-slot="command"])');
    expect(css).toContain('> [data-slot="dialog-close"]');
    expect(css).toContain(".tadeon-command-footer");
    expect(css).toContain(":has(#sheet-name)");
    expect(css).toContain("overscroll-behavior: contain");
  });

  it("keeps master navigation sticky and extends the Nexus visual grammar by route", () => {
    const css = source("src/styles/mobile-product-repair-153.css");
    expect(css).toContain(".tadeon-master-navigation");
    expect(css).toContain("position: sticky !important");
    expect(css).toContain('[data-section="Painel do Mestre"]');
    expect(css).toContain('[data-section="Usuários"]');
    expect(css).toContain('[data-section="Saúde do arquivo"]');
    expect(css).toContain('[data-section="Consulta offline"]');
    expect(css).toContain("--section-ornament-opacity");
    expect(css).toContain("--section-card-force");
  });

  it("starts Resistance DT collapsed on every device", () => {
    const calculator = source("src/components/master/resistance-dt-calculator.tsx");
    expect(calculator).toContain("const [open, setOpen] = useState(false)");
    expect(calculator).not.toContain("useState(!compact)");
  });

  it("loads repair 153 after the previous visual authority", () => {
    const root = source("src/routes/__root.tsx");
    const previous = root.indexOf("userRepair152Css");
    const current = root.indexOf("mobileProductRepair153Css");
    expect(previous).toBeGreaterThanOrEqual(0);
    expect(current).toBeGreaterThan(previous);
    const previousLink = root.lastIndexOf("href: userRepair152Css");
    const currentLink = root.lastIndexOf("href: mobileProductRepair153Css");
    expect(previousLink).toBeGreaterThanOrEqual(0);
    expect(currentLink).toBeGreaterThan(previousLink);
  });
});
