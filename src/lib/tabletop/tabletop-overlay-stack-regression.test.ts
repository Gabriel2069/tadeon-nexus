import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("contenção de overlays e orquestração visual da Mesa", () => {
  it("carrega a barreira de viewport globalmente e depois dos estilos-base", () => {
    const root = source("src/routes/__root.tsx");

    expect(root).toContain('import viewportCss from "../styles/viewport-fit-final.css?url";');
    expect(root).toContain('{ rel: "stylesheet", href: viewportCss }');
    expect(root.indexOf('{ rel: "stylesheet", href: appCss }')).toBeLessThan(
      root.indexOf('{ rel: "stylesheet", href: viewportCss }'),
    );
    expect(root.indexOf('{ rel: "stylesheet", href: mobileCss }')).toBeLessThan(
      root.indexOf('{ rel: "stylesheet", href: viewportCss }'),
    );
  });

  it("centraliza dialog por translate e reserva transform apenas para motion local", () => {
    const viewport = source("src/styles/viewport-fit-final.css");

    expect(viewport).toContain("translate: -50% -50% !important;");
    expect(viewport).toContain("@keyframes tadeon-modal-in");
    expect(viewport).toContain("transform: translate3d(0, 1rem, 0) scale(0.955);");
    expect(viewport).toContain("transform: translate3d(0, 0, 0) scale(1);");
    expect(viewport).not.toContain("transform: translate3d(-50%, -50%, 0) !important;");
    expect(viewport).not.toContain("[data-radix-popper-content-wrapper] {");
  });

  it("mantém famílias de popper aderidas ao espaço realmente disponível", () => {
    const popover = source("src/components/ui/popover.tsx");
    const select = source("src/components/ui/select.tsx");
    const hover = source("src/components/ui/hover-card.tsx");
    const tooltip = source("src/components/ui/tooltip.tsx");
    const viewport = source("src/styles/viewport-fit-final.css");

    expect(popover).toContain('sticky = "always"');
    expect(popover).toContain("hideWhenDetached={hideWhenDetached}");
    expect(select).toContain('sticky = "always"');
    expect(select).toContain("hideWhenDetached={hideWhenDetached}");
    expect(hover).toContain('sticky = "always"');
    expect(hover).toContain("collisionPadding = 16");
    expect(tooltip).toContain('sticky = "always"');
    expect(tooltip).toContain("collisionPadding = 16");
    expect(viewport).toContain("--radix-popover-content-available-width");
    expect(viewport).toContain("--radix-select-content-available-width");
    expect(viewport).toContain("--radix-dropdown-menu-content-available-width");
    expect(viewport).toContain("--radix-context-menu-content-available-width");
    expect(viewport).toContain("--radix-menubar-content-available-width");
    expect(viewport).toContain("--radix-hover-card-content-available-width");
    expect(viewport).toContain("--radix-tooltip-content-available-width");
  });

  it("coordena todo o chrome fixo da Mesa, não apenas os docks centrais", () => {
    const route = source("src/components/tabletop/tabletop-route-experience.tsx");
    const stack = source("src/styles/tabletop-bottom-stack-fix.css");

    expect(route).toContain('import "@/styles/tabletop-bottom-stack-fix.css";');
    expect(stack).toContain("--tadeon-tabletop-bottom-row-1");
    expect(stack).toContain("--tadeon-tabletop-bottom-row-2");
    expect(stack).toContain("--tadeon-tabletop-bottom-row-3");
    expect(stack).toContain("--tadeon-tabletop-top-row-1");
    expect(stack).toContain("--tadeon-tabletop-top-row-2");

    for (const selector of [
      ".tadeon-tabletop-progressive-dock",
      ".tadeon-tactical-dock",
      ".tadeon-tabletop-selection-actions",
      ".tadeon-creative-dock",
      ".tadeon-placeables",
      ".tadeon-tabletop-now",
      ".tadeon-semantic-transform",
      ".tadeon-nexus-tabletop-locator",
      ".tadeon-tabletop-reliability-strip",
      ".tadeon-director-enhancement-bar",
      ".tadeon-tabletop-precision-editor",
      ".tadeon-tabletop-stage-status",
    ]) {
      expect(stack).toContain(selector);
    }
  });

  it("fecha superfícies concorrentes e limpa de verdade o modo de projeção", () => {
    const stack = source("src/styles/tabletop-bottom-stack-fix.css");

    expect(stack).toContain('.tadeon-tabletop-now[data-open="true"]');
    expect(stack).toContain('.tadeon-placeables[data-open="true"]');
    expect(stack).toContain('.tadeon-creative-dock[data-open="true"]');
    expect(stack).toContain('.tadeon-tabletop-panel[data-mobile-open="true"]');
    expect(stack).toContain('html[data-tadeon-tabletop-clean="true"]');
    expect(stack).toContain("visibility: hidden !important;");
    expect(stack).toContain("pointer-events: none !important;");
  });

  it("eleva portais da Mesa acima do chrome persistente", () => {
    const viewport = source("src/styles/viewport-fit-final.css");

    expect(viewport).toContain("z-index: 220 !important;");
    expect(viewport).toContain("z-index: 240 !important;");
    expect(viewport).toContain("z-index: 241 !important;");
  });
});
