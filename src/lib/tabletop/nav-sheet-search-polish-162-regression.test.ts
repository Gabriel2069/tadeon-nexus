import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const css = readFileSync("src/styles/nav-sheet-search-polish-162.css", "utf8");
const finalCss = readFileSync("src/styles/final-nav-search-polish-196.css", "utf8");
const sheet = readFileSync("src/routes/sheet.$id.tsx", "utf8");
const search = readFileSync("src/components/global-search.tsx", "utf8");

describe("nav/sheet/search polish 162", () => {
  it("loads 162 after the 161 visual authority", () => {
    expect(root).toContain('import navSheetSearchPolish162Css from "../styles/nav-sheet-search-polish-162.css?url"');
    expect(root.indexOf("sheetPopupGraphPolish161Css")).toBeLessThan(
      root.indexOf("navSheetSearchPolish162Css"),
    );
    expect(root.indexOf("href: sheetPopupGraphPolish161Css")).toBeLessThan(
      root.indexOf("href: navSheetSearchPolish162Css"),
    );
  });

  it("assigns distinct primary section accents with Nexus as green", () => {
    expect(css).toContain('.tadeon-shell[data-section="O Nexus"]');
    expect(css).toContain("--section-accent-rgb: 79 110 93 !important");
    expect(css).toContain('.tadeon-shell[data-section="Usuários"]');
    expect(css).toContain("--section-accent-rgb: 183 129 77 !important");
    expect(css).toContain('.tadeon-shell[data-section="Consulta offline"]');
    expect(css).toContain("--section-accent-rgb: 113 107 123 !important");
    expect(css).toContain('.tadeon-shell[data-section="Mesa Nexus"]');
    expect(css).toContain("--section-accent-rgb: 84 123 148 !important");
  });

  it("keeps one authored navigation mark layer and restores accent motion", () => {
    expect(css).toContain('[href="/master-panel"], [href="/nexus-tools"]');
    expect(css).toContain("visibility: hidden !important");
    expect(css).toContain(".tadeon-nav-item__icon::after");
    expect(css).toContain("content: none !important");
    expect(css).toContain("scale(1.08) rotate(-2deg)");
    expect(css).toContain("background-color: var(--nav-accent) !important");
  });

  it("turns the attribute stepper into one numeric instrument without changing the radar", () => {
    expect(css).toContain(".tadeon-attribute-tile__controls");
    expect(css).toContain("grid-template-columns: 2.15rem minmax(3.15rem, 1fr) 2.15rem !important");
    expect(css).toContain("font-size: 1.72rem !important");
    expect(css).not.toContain(".tadeon-attribute-radar {");
  });

  it("strengthens exposure while retaining its mechanical 0-100 inputs", () => {
    expect(css).toContain("#exposicao .tadeon-sheet-section__body-inner > .relative.w-full.h-4");
    expect(css).toContain("tadeon-exposure-sheen-162");
    expect(css).toContain("transition: width 360ms");
    expect(sheet).toContain('min={0}');
    expect(sheet).toContain('max={100}');
    expect(sheet).toContain('update("exposure"');
  });

  it("projects Morrendo and Colapsando into a whole-sheet crisis state", () => {
    expect(sheet).toContain('aria-label={`${label}: ${i + 1} de ${max}`}');
    expect(sheet).toContain("aria-pressed={i < value}");
    expect(css).toContain('button[aria-label^="Morrendo:"][aria-pressed="true"]');
    expect(css).toContain('button[aria-label^="Colapsando:"][aria-pressed="true"]');
    expect(css).toContain("@keyframes tadeon-crisis-heartbeat-162");
    expect(css).toContain("position: fixed");
  });

  it("locks global search to the live visual viewport and keeps internal regions contained", () => {
    expect(search).toContain("window.visualViewport");
    expect(search).toContain('contentClassName="tadeon-global-search-dialog"');
    expect(search).toContain('commandClassName="tadeon-global-search-command"');
    expect(finalCss).toContain("--tadeon-search-vv-width");
    expect(finalCss).toContain("--tadeon-search-vv-height");
    expect(finalCss).toContain("overflow: hidden !important");
    expect(finalCss).toContain(".tadeon-global-search-command .tadeon-command-footer");
    expect(finalCss).toContain("flex: 1 1 auto !important");
  });
});
