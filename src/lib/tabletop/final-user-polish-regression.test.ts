import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("acabamento transversal solicitado", () => {
  it("faz o menu recolhido crescer para a direita sem cortar os ícones", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    expect(css).toContain("width:4.15rem !important");
    expect(css).toContain("justify-content:flex-start !important");
    expect(css).toContain("padding-left:1.02rem !important");
  });

  it("normaliza a largura de Backup, Usuários e Consulta offline", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    expect(css).toContain(".tadeon-route-tools,.tadeon-route-users,.tadeon-route-offline");
    expect(css).toContain("max-width:min(92rem,100%) !important");
  });

  it("aplica de verdade o preset aberto do grafo e reduz sobreposição visual", () => {
    const bridge = source("src/components/experience-final-polish-bridge.tsx");
    expect(bridge).toContain('"Distância-base": 260');
    expect(bridge).toContain("Repulsão: 2.4");
    expect(bridge).toContain("Centro: 0.08");
    expect(bridge).toContain("settingsToggle.click()");
    expect(bridge).toContain('aria-label="Reenquadrar grafo"');
  });

  it("mantém superfícies grandes da Mesa contidas e mutuamente exclusivas", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    expect(css).toContain(".tadeon-region-automation");
    expect(css).toContain("body:has(.tadeon-director-remote)");
    expect(css).toContain(".tadeon-tactical-dock__power-list");
    expect(css).toContain("visibility:hidden !important");
    expect(css).toContain("max-height:calc(100dvh");
  });

  it("cola o acionador radial à entidade em screen-space durante câmera e zoom", () => {
    const radial = source("src/components/tabletop/tabletop-radial-actions-bridge.tsx");
    const css = source("src/styles/interface-final-user-polish.css");
    expect(radial).toContain("const follow = () =>");
    expect(radial).toContain("window.requestAnimationFrame(follow)");
    expect(radial).toContain("runtime.worldToClient(entityCenter(entity))");
    expect(css).toContain("translate:-50% calc(-100% - .7rem) !important");
  });

  it("refina condições, barras, botão Mesa e vínculos da ficha", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    const bridge = source("src/components/experience-final-polish-bridge.tsx");
    expect(css).toContain('[data-tadeon-sheet-tabletop-action="true"]');
    expect(css).toContain('[data-condition-severity="critical"]');
    expect(css).toContain("--condition-glow-opacity");
    expect(css).toContain("#equilibrio,#exposicao");
    expect(css).toContain('.tadeon-link-panel[data-collapsed="true"]');
    expect(bridge).toContain("setConditionProgress(chip, 1)");
    expect(bridge).toContain("Modificadores não consomem PE.");
  });
});
