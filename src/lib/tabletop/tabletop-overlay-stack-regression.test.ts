import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("contenção de overlays e faixa inferior da Mesa", () => {
  it("mantém popovers e selects aderidos à viewport", () => {
    const popover = source("src/components/ui/popover.tsx");
    const select = source("src/components/ui/select.tsx");
    const viewport = source("src/styles/viewport-fit-final.css");

    expect(popover).toContain('sticky = "always"');
    expect(popover).toContain("hideWhenDetached={hideWhenDetached}");
    expect(select).toContain('sticky = "always"');
    expect(select).toContain("hideWhenDetached={hideWhenDetached}");
    expect(viewport).toContain("--radix-popover-content-available-width");
    expect(viewport).toContain("--radix-select-content-available-width");
    expect(viewport).toContain("transform: translate3d(-50%, -50%, 0) !important;");
  });

  it("reserva linhas diferentes para os controles inferiores da Mesa", () => {
    const route = source("src/components/tabletop/tabletop-route-experience.tsx");
    const stack = source("src/styles/tabletop-bottom-stack-fix.css");

    expect(route).toContain('import "@/styles/tabletop-bottom-stack-fix.css";');
    expect(stack).toContain("--tadeon-tabletop-bottom-row-1");
    expect(stack).toContain("--tadeon-tabletop-bottom-row-2");
    expect(stack).toContain(".tadeon-tabletop-progressive-dock");
    expect(stack).toContain(".tadeon-tactical-dock");
    expect(stack).toContain(".tadeon-tabletop-selection-actions");
    expect(stack).toContain(".tadeon-creative-dock");
    expect(stack).not.toContain("var(--tadeon-tabletop-bottom-row-height) * 2");
  });

  it("contém também o popup artesanal de Tramas", () => {
    const stack = source("src/styles/tabletop-bottom-stack-fix.css");

    expect(stack).toContain(".tadeon-tactical-dock__power-list");
    expect(stack).toContain("max-width: calc(100vw - 2rem);");
    expect(stack).toContain("overscroll-behavior: contain;");
  });
});
