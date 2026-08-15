import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("resíduos visuais de seleção e navegação", () => {
  it("remove estruturalmente o blackout do inspector não modal da Mesa", () => {
    const css = source("src/styles/tabletop-spatial-finish.css");

    expect(css).toContain(".tadeon-tabletop-panel-backdrop[data-open=\"true\"]");
    expect(css).toContain("display: none !important");
    expect(css).toContain("animation: none !important");
  });

  it("preserva a moldura inteira dos itens no menu lateral recolhido", () => {
    const css = source("src/styles/viewport-fit-final.css");

    expect(css).toContain(
      '#tadeon-desktop-sidebar:has(.tadeon-nav-item[data-mini="true"]) > div:first-of-type',
    );
    expect(css).toContain("padding-right: .5rem !important");
    expect(css).toContain("padding-left: .5rem !important");
    expect(css).toContain('#tadeon-desktop-sidebar .tadeon-nav-item[data-mini="true"]');
    expect(css).toContain("min-width: 0 !important");
  });

  it("mantém o brilho diagonal dentro da caixa física do botão", () => {
    const css = source("src/styles/viewport-fit-final.css");

    expect(css).toContain("@keyframes tadeon-button-sheen");
    expect(css).toContain("top: 1px !important");
    expect(css).toContain("right: 1px !important");
    expect(css).toContain("bottom: 1px !important");
    expect(css).toContain("left: 1px !important");
    expect(css).toContain("background-size: 240% 100% !important");
    expect(css).toContain(
      "animation: tadeon-button-sheen 620ms var(--ease-out) both !important",
    );
  });
});
