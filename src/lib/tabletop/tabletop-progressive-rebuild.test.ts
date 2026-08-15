import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Mesa Nexus progressiva", () => {
  it("mantém a rota leve e carrega a experiência pesada sob demanda", () => {
    const route = source("src/routes/tabletop.tsx");
    const experience = source("src/components/tabletop/tabletop-route-experience.tsx");

    expect(route).toContain("TabletopRouteExperience");
    expect(route).not.toContain('from "@/components/tabletop/tabletop-workspace"');
    expect(route).not.toContain('from "@/components/tabletop/tabletop-placeables-inspector-bridge"');
    expect(experience).toContain("lazy(() => import");
    expect(experience).toContain("TabletopBootScreen");
  });

  it("não puxa Pixi pelo shell global antes de abrir a Mesa", () => {
    const crossSurface = source("src/components/tabletop/tabletop-cross-surface-bridge.tsx");
    expect(crossSurface).not.toContain('from "@/lib/tabletop/tabletop-player-runtime"');
    expect(crossSurface).toContain("__tadeonTabletopRuntime");
  });

  it("não bloqueia a abertura da Mesa em uma consulta remota de feature flag", () => {
    const route = source("src/routes/tabletop.tsx");
    expect(route).toContain("nexus_tabletop_enabled: true");
    expect(route).not.toContain("if (!flags?.nexus_tabletop_enabled)");
    expect(route).toContain(".catch(() =>");
  });

  it("carrega pontes avançadas em camadas depois do canvas", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    expect(deferred).toContain("tier >= 1");
    expect(deferred).toContain("tier >= 2");
    expect(deferred).toContain("master && tier >= 3");
  });

  it("remove a varredura global por MutationObserver da grade avançada", () => {
    const grid = source("src/lib/tabletop/tabletop-advanced-grid-runtime.ts");
    expect(grid).not.toContain("new MutationObserver");
    expect(grid).toContain('document.addEventListener("pointerdown"');
    expect(grid).toContain("enhanceVisibleGridSelects");
  });

  it("oferece interface progressiva, comandos, seleção contextual e touch", () => {
    const bridge = source("src/components/tabletop/tabletop-progressive-interface-bridge.tsx");
    const selection = source("src/lib/tabletop/selection-overlay.ts");
    const css = source("src/styles/tabletop-progressive-ui.css");

    expect(bridge).toContain('event.key.toLowerCase() === "k"');
    expect(bridge).toContain("duplicateSelected()");
    expect(bridge).toContain("deleteSelected()");
    expect(bridge).toContain("cleanPreview");
    expect(selection).toContain('matchMedia("(pointer: coarse)")');
    expect(css).toContain('data-tadeon-tabletop-interface="play"');
    expect(css).toContain("@media (pointer: coarse)");
    expect(css).toContain('[data-slot="dialog-content"]');
  });
});
