import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  computeKnowledgeForceLayout,
  type KnowledgeGraphNode,
  type KnowledgeLocalGraph,
} from "@/lib/knowledge/knowledge-graph-memory";

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

  it("organiza a teia em aros sem permitir interseção entre esferas", () => {
    const focus: KnowledgeGraphNode = {
      id: "focus",
      title: "Centro",
      summary: "",
      nodeType: "concept",
      icon: null,
      status: "canonical",
      visibility: "workspace",
      campaignId: null,
      parentNodeId: null,
      updatedAt: new Date(0).toISOString(),
      tags: [],
      semanticTerms: [],
      explicitDegree: 20,
      incomingMentions: 20,
      outgoingMentions: 20,
      depth: 0,
      importance: 1,
      weightedDegree: 20,
    };
    const nodes: KnowledgeGraphNode[] = [
      focus,
      ...Array.from({ length: 72 }, (_, index) => ({
        ...focus,
        id: `node-${index}`,
        title: `Página ${index}`,
        nodeType: index % 3 === 0 ? "character" as const : index % 3 === 1 ? "location" as const : "plot" as const,
        depth: 1 + (index % 3),
        importance: 0.18 + (index % 7) * 0.1,
        weightedDegree: 1 + (index % 5),
      })),
    ];
    const graph: KnowledgeLocalGraph = {
      focusNodeId: focus.id,
      depth: 3,
      limit: 220,
      truncated: false,
      mode: "global",
      nodes,
      edges: [],
    };
    const positions = computeKnowledgeForceLayout(graph, {
      linkDistance: 190,
      linkStrength: 1,
      repelStrength: 1.65,
      centerStrength: 0.62,
      clusterStrength: 0.5,
    });
    const radius = (node: KnowledgeGraphNode) => 12 + node.importance * 15 + (node.depth === 0 ? 3 : 0);
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        const a = positions.get(nodes[left].id)!;
        const b = positions.get(nodes[right].id)!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
          radius(nodes[left]) + radius(nodes[right]),
        );
      }
    }
  });

  it("não sobrescreve mais layout, cor ou motion do menu original do mestre", () => {
    const css = source("src/styles/interface-reconciliation-final.css");
    expect(css).toContain("Master panel intentionally has no override");
    expect(css).not.toContain("--tadeon-master-accent:");
    expect(css).not.toContain("tadeon-master-surface-slide");
    expect(css).not.toContain("[data-master-tab][data-state=\"active\"]");
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
