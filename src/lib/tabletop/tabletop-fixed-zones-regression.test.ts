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

  it("aplica hard lock inline important aos menus principais", () => {
    const bridge = source("src/components/tabletop/tabletop-floating-layout-bridge.tsx");

    expect(bridge).toContain("function hardLockCoreChrome()");
    expect(bridge).toContain('style.setProperty(property, value, "important")');
    expect(bridge).toContain('setImportant(progressive, "position", "fixed")');
    expect(bridge).toContain('setImportant(tactical, "position", "fixed")');
    expect(bridge).toContain('setImportant(rail, "position", "fixed")');
    expect(bridge).toContain('setImportant(reliability, "position", "fixed")');
    expect(bridge).toContain('setImportant(selection, "position", "fixed")');
  });

  it("não recalcula coordenadas por scroll da página ou da visual viewport", () => {
    const bridge = source("src/components/tabletop/tabletop-floating-layout-bridge.tsx");

    expect(bridge).not.toContain('window.addEventListener("scroll"');
    expect(bridge).not.toContain('window.visualViewport?.addEventListener("scroll"');
    expect(bridge).toContain("stageBounds ??= measureStageGeometry(root, appBottom)");
    expect(bridge).toContain("for (const delay of [0, 80, 180, 360, 700, 1200])");
  });

  it("carrega a autoridade de zonas depois das folhas antigas conflitantes", () => {
    const route = source("src/components/tabletop/tabletop-route-experience.tsx");
    const progressive = route.indexOf('tabletop-progressive-ui.css');
    const bottomStack = route.indexOf('tabletop-bottom-stack-fix.css');
    const spatial = route.indexOf('tabletop-spatial-finish.css');
    const fixed = route.indexOf('tabletop-fixed-menus-tactical-240.css');

    expect(progressive).toBeGreaterThanOrEqual(0);
    expect(bottomStack).toBeGreaterThan(progressive);
    expect(spatial).toBeGreaterThan(bottomStack);
    expect(fixed).toBeGreaterThan(spatial);
  });

  it("empilha tático acima do Dock e mantém o Dock equidistante no celular", () => {
    const css = source("src/styles/tabletop-fixed-menus-tactical-240.css");
    const bridge = source("src/components/tabletop/tabletop-floating-layout-bridge.tsx");

    expect(css).toContain("var(--tadeon-tabletop-progressive-h, 3.3rem)");
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("flex: 1 1 0 !important");
    expect(bridge).toContain("const stackedBottom");
    expect(bridge).toContain('setImportant(tactical, "bottom", stackedBottom)');
    expect(bridge).toContain('setImportant(selection, "bottom", stackedBottom)');
  });
});
