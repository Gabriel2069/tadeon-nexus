import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("tabletop fixed zones", () => {
  it("usa o stage como sistema único de coordenadas do chrome", () => {
    const css = source("src/styles/tabletop-fixed-menus-tactical-240.css");
    const bridge = source("src/components/tabletop/tabletop-floating-layout-bridge.tsx");

    expect(bridge).toContain("--tadeon-tabletop-stage-fixed-top");
    expect(bridge).toContain("--tadeon-tabletop-stage-fixed-bottom");
    expect(bridge).toContain("--tadeon-tabletop-stage-fixed-center");
    expect(css).toContain("--tadeon-tabletop-zone-gap");
    expect(css).toContain("var(--tadeon-tabletop-stage-fixed-top)");
    expect(css).toContain("var(--tadeon-tabletop-stage-fixed-bottom)");
    expect(css).toContain("var(--tadeon-tabletop-stage-fixed-center)");
  });

  it("empilha tático acima do Dock em vez de permitir sobreposição", () => {
    const css = source("src/styles/tabletop-fixed-menus-tactical-240.css");

    expect(css).toContain("var(--tadeon-tabletop-progressive-h, 3.3rem)");
    expect(css).toContain(".tadeon-tactical-dock");
    expect(css).toContain(".tadeon-tabletop-selection-actions");
    expect(css).toContain("z-index: 102 !important");
    expect(css).toContain("z-index: 101 !important");
  });

  it("mantém o rail completo e o Dock equidistante no celular", () => {
    const css = source("src/styles/tabletop-fixed-menus-tactical-240.css");

    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain(".tadeon-tabletop-canvas-rail__group-label");
    expect(css).toContain("display: none !important");
    expect(css).toContain("min-height: 2.65rem !important");
    expect(css).toContain("flex: 1 1 0 !important");
    expect(css).toContain("justify-content: stretch !important");
  });
});
