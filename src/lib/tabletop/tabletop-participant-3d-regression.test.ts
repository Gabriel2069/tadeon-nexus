import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Mesa participante em projeção espacial", () => {
  const workspace = read("src/components/tabletop/tabletop-participant-workspace.tsx");
  const renderer = read("src/lib/tabletop/entity-renderer.ts");
  const service = read("src/lib/tabletop/tabletop-participant-service.ts");
  const endpoint = read("supabase/functions/tabletop-view/index.ts");
  const setup = read("src/components/tabletop/tabletop-smart-setup-bridge.tsx");
  const master = read("src/components/tabletop/tabletop-workspace.tsx");

  it("aplica e atualiza a câmera dirigida pelo mestre", () => {
    expect(workspace).toContain("engine.applyDirectorCamera");
    expect(workspace).toContain('event.type === "director.state"');
    expect(workspace).toContain("engine.setGridVisible");
  });

  it("entrega a arquitetura visual completa sem liberar interação indevida", () => {
    expect(service).toContain('"roof_visible"');
    expect(service).toContain("playerOperable: z.boolean()");
    expect(endpoint).toContain("walls: (walls ?? [])");
    expect(endpoint).toContain("wall.player_operable === true");
  });

  it("mantém tokens sem imagem volumétricos no modo 3D", () => {
    expect(renderer).toContain('label: "token-standee"');
    expect(renderer).toContain("const fallbackStandee = spatialToken && !entity.assetUrl");
    expect(renderer).toContain("tokenDepth.visible = spatialToken");
  });

  it("oferece quatro direções, rotação contínua e inclinação no Setup", () => {
    expect(setup).toContain('"Noroeste"');
    expect(setup).toContain('"Nordeste"');
    expect(setup).toContain('"Sudeste"');
    expect(setup).toContain('"Sudoeste"');
    expect(setup).toContain('aria-label="Girar visão 45 graus para a direita"');
    expect(setup).toContain("elevationScale");
    expect(setup).toContain('new CustomEvent("tadeon-tabletop-spatial-view"');
    expect(master).toContain('window.addEventListener("tadeon-tabletop-spatial-view"');
  });
});
