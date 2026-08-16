import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("reconciliação final das superfícies", () => {
  it("posiciona chrome da Mesa pela geometria real do stage", () => {
    const css = source("src/styles/interface-reconciliation-final.css");
    expect(css).toContain("--tadeon-tabletop-stage-right");
    expect(css).toContain("--tadeon-tabletop-stage-center");
    expect(css).toContain("--tadeon-tabletop-stage-width");
    expect(css).toContain(".tadeon-smart-setup__launcher");
    expect(css).toContain(".tadeon-creative-dock[data-open=\"false\"]");
  });

  it("selecionar não transforma o canvas em uma superfície modal", () => {
    const css = source("src/styles/interface-reconciliation-final.css");
    expect(css).toContain(".tadeon-tabletop-panel-backdrop");
    expect(css).toContain("background: transparent !important");
    expect(css).toContain("pointer-events: none !important");
  });

  it("mantém Nova página legível e oferece pastas rasas no Nexus", () => {
    const css = source("src/styles/interface-reconciliation-final.css");
    const folders = source("src/components/knowledge/nexus-folder-bar-bridge.tsx");
    expect(css).toContain("min-width: 7.8rem !important");
    expect(css).toContain(".tadeon-nexus-folderbar");
    expect(folders).toContain('label: "Pessoas"');
    expect(folders).toContain('label: "Mundo"');
    expect(folders).not.toContain("parentFolder");
  });

  it("calibra o grafo denso sem remover os controles manuais", () => {
    const graph = source("src/components/knowledge/nexus-graph-declutter-bridge.tsx");
    expect(graph).toContain('setRange("Distância-base", 190)');
    expect(graph).toContain('setRange("Repulsão", 1.65)');
    expect(graph).toContain('setRange("Centro", 0.62)');
    expect(graph).toContain("tadeon-brain-settings-toggle");
  });

  it("preserva o sotaque vermelho e o slide no painel separado do mestre", () => {
    const css = source("src/styles/interface-reconciliation-final.css");
    expect(css).toContain("--tadeon-master-accent: 351 52% 31%");
    expect(css).toContain("[data-master-tab][data-state=\"active\"]");
    expect(css).toContain("tadeon-master-surface-slide");
  });

  it("executa cues de Região e renderiza transições na saída do Diretor", () => {
    const timeline = source("src/components/tabletop/tabletop-director-timeline-bridge.tsx");
    const output = source("src/components/tabletop/tabletop-director-workspace.tsx");
    const css = source("src/styles/interface-reconciliation-final.css");
    expect(timeline).toContain("tadeon-tabletop-director-run-cue");
    expect(output).toContain("data-transition={activeCue?.transition");
    expect(output).toContain("is-transitioning");
    expect(css).toContain("tadeon-director-cue-fade");
    expect(css).toContain("tadeon-director-cue-orbit");
  });

  it("carrega a reconciliação depois das autoridades visuais anteriores", () => {
    const root = source("src/routes/__root.tsx");
    const radial = root.indexOf('{ rel: "stylesheet", href: radialPresenceCss }');
    const reconciliation = root.indexOf('{ rel: "stylesheet", href: reconciliationCss }');
    expect(radial).toBeGreaterThan(-1);
    expect(reconciliation).toBeGreaterThan(radial);
  });
});
