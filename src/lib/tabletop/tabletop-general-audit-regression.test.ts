import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("auditoria transversal de paridade e layout", () => {
  it("ancora o indicador global de Tabs no próprio TabsList", () => {
    const tabs = source("src/components/ui/tabs.tsx");
    const css = source("src/styles.css");
    expect(tabs).toContain("relative isolate inline-flex");
    expect(css).toContain("top: 0;\n  bottom: auto;");
  });

  it("reserva espaço real para os dois controles do cabeçalho móvel", () => {
    expect(source("src/components/app-layout.tsx")).toContain(
      "grid-cols-[5.9rem_minmax(0,1fr)_5.9rem]",
    );
  });

  it("propaga o andar ativo e filtra áudio espacial por level_id", () => {
    const engine = source("src/lib/tabletop/tabletop-engine.ts");
    const reliability = source("src/components/tabletop/tabletop-reliability-editor-bridge.tsx");
    expect(source("src/lib/tabletop/types.ts")).toContain("activeLevelId?: string | null");
    expect(engine).toContain("activeLevelId: this.activeLevelId");
    expect(reliability).toContain("level_id?: string | null");
    expect(reliability).toContain("wall.level_id === activeLevelId");
    expect(reliability).toContain("entity.levelId === activeLevelId");
  });

  it("remove o radial invisível e torna Poderes explícito para toque", () => {
    const interaction = source("src/components/tabletop/tabletop-player-interaction-bridge.tsx");
    expect(interaction).not.toContain("MutationObserver(sync)");
    expect(interaction).toContain("powerMenuOpen");
    expect(interaction).toContain('aria-haspopup="menu"');
    expect(source("src/styles/tabletop-player-interaction.css")).toContain(
      '.tadeon-tactical-dock__power-menu[data-open="true"]',
    );
  });

  it("mantém o polígono privado do servidor como autoridade de visibilidade", () => {
    const renderer = source("src/lib/tabletop/visibility-renderer.ts");
    expect(renderer).toContain(
      "if (light.visibilityPolygon && light.visibilityPolygon.length >= 3)",
    );
    expect(renderer).toContain("return light.visibilityPolygon");
  });

  it("expõe forma da névoa e propriedades da luz no contrato sanitizado do jogador", () => {
    const participant = source("src/lib/tabletop/tabletop-participant-service.ts");
    const edge = source("supabase/functions/tabletop-view/index.ts");
    expect(participant).toContain(
      'shape: z.enum(["brush", "rectangle", "ellipse", "polygon"]).default("brush")',
    );
    expect(participant).toContain('shape: z.enum(["radial", "cone", "line", "rectangle"])');
    expect(edge).toContain('.eq("hidden", false)');
    expect(edge).toContain("publicLightProperties");
    expect(edge).toContain('stroke.geometry === "rectangle"');
    expect(edge).toContain("visibilityPolygon: buildVisibilityPolygon");
    expect(edge).toContain("publicProperties(entity.properties)");
  });

  it("mantém Sheet e Drawer acima do chrome da Mesa", () => {
    const css = source("src/styles/viewport-fit-final.css");
    expect(css).toContain('[data-slot="sheet-overlay"]');
    expect(css).toContain('[data-slot="drawer-overlay"]');
    expect(css).toContain('[data-slot="sheet-content"]');
    expect(css).toContain("z-index: 241 !important");
  });

  it("mantém o dock essencial ao lado do inspector não modal no tablet", () => {
    const css = source("src/styles/tabletop-spatial-finish.css");
    expect(css).toContain("--tadeon-tabletop-inspector-width");
    expect(css).toContain("visibility: visible !important");
  });
});
