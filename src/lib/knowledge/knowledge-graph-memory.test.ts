import { describe, expect, it } from "vitest";
import {
  buildKnowledgeGraph,
  computeKnowledgeForceLayout,
  graphLinkDistance,
  type KnowledgeMemoryNode,
  type KnowledgeMemoryPayload,
} from "@/lib/knowledge/knowledge-graph-memory";

function node(
  id: string,
  title: string,
  semanticTerms: string[],
  overrides: Partial<KnowledgeMemoryNode> = {},
): KnowledgeMemoryNode {
  return {
    id,
    title,
    summary: "",
    nodeType: "concept",
    icon: null,
    status: "canonical",
    visibility: "workspace",
    campaignId: null,
    parentNodeId: null,
    updatedAt: "2026-08-15T00:00:00.000Z",
    tags: [],
    semanticTerms,
    explicitDegree: 0,
    incomingMentions: 0,
    outgoingMentions: 0,
    ...overrides,
  };
}

const payload: KnowledgeMemoryPayload = {
  focusNodeId: "myrova",
  candidateLimit: 100,
  truncated: false,
  nodes: [
    node(
      "myrova",
      "Myrova",
      ["myrova", "porto", "comercio", "navios", "maritimo", "mercadores"],
      { tags: ["mar", "comércio"], explicitDegree: 2, incomingMentions: 4 },
    ),
    node(
      "porto",
      "Porto de Myrova",
      ["myrova", "porto", "comercio", "navios", "maritimo", "docas"],
      { tags: ["mar", "comércio"], incomingMentions: 1 },
    ),
    node(
      "valeris",
      "Casa Valeris",
      ["familia", "nobreza", "linhagem", "politica", "herdeiros"],
      { explicitDegree: 1, incomingMentions: 3 },
    ),
    node(
      "vulcao",
      "Vulcanismo de Veth",
      ["magma", "vulcao", "tectonica", "sismicidade", "crosta"],
    ),
  ],
  signals: [
    {
      id: "edge-myrova-valeris",
      sourceNodeId: "myrova",
      targetNodeId: "valeris",
      kind: "explicit",
      relationType: "allied_with",
      label: "Aliança mercantil",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.9,
      evidence: ["Relação explícita: Aliança mercantil"],
    },
    {
      id: "mention-myrova-valeris",
      sourceNodeId: "myrova",
      targetNodeId: "valeris",
      kind: "mention",
      relationType: "mentions",
      label: "3 menções no conteúdo",
      direction: "directed",
      visibility: "workspace",
      strength: 0.62,
      evidence: ["A página cita a outra 3 vezes no conteúdo."],
    },
  ],
};

describe("knowledge second-brain graph", () => {
  it("discovers contextual proximity from content and tags", () => {
    const graph = buildKnowledgeGraph(payload, {
      mode: "global",
      includeSemantic: true,
      semanticThreshold: 0.2,
      semanticNeighbors: 5,
    });

    const semantic = graph.edges.find(
      (edge) =>
        new Set([edge.sourceNodeId, edge.targetNodeId]).has("myrova") &&
        new Set([edge.sourceNodeId, edge.targetNodeId]).has("porto"),
    );
    expect(semantic).toBeDefined();
    expect(semantic?.kinds).toContain("semantic");
    expect(semantic?.direction).toBe("bidirectional");
    expect(semantic?.evidence.join(" ")).toMatch(/Conteúdo em comum|Tags em comum/);

    const unrelated = graph.edges.find(
      (edge) =>
        new Set([edge.sourceNodeId, edge.targetNodeId]).has("myrova") &&
        new Set([edge.sourceNodeId, edge.targetNodeId]).has("vulcao"),
    );
    expect(unrelated).toBeUndefined();
  });

  it("aggregates independent evidence into one stronger connection", () => {
    const graph = buildKnowledgeGraph(payload, { mode: "global" });
    const edge = graph.edges.find(
      (candidate) =>
        candidate.sourceNodeId === "myrova" && candidate.targetNodeId === "valeris",
    );

    expect(edge).toBeDefined();
    expect(edge?.kinds).toEqual(expect.arrayContaining(["explicit", "mention"]));
    expect(edge?.strength).toBeGreaterThan(0.9);
    expect(edge?.evidence).toEqual(
      expect.arrayContaining([
        "Relação explícita: Aliança mercantil",
        "A página cita a outra 3 vezes no conteúdo.",
      ]),
    );
  });

  it("uses references and weighted degree to make important nodes larger", () => {
    const graph = buildKnowledgeGraph(payload, { mode: "global" });
    const valeris = graph.nodes.find((entry) => entry.id === "valeris")!;
    const vulcao = graph.nodes.find((entry) => entry.id === "vulcao")!;

    expect(valeris.importance).toBeGreaterThan(vulcao.importance);
    expect(valeris.weightedDegree).toBeGreaterThan(vulcao.weightedDegree);
  });

  it("keeps stronger links physically closer than weak links", () => {
    expect(graphLinkDistance(0.92, 140)).toBeLessThan(graphLinkDistance(0.25, 140));
  });

  it("produces deterministic finite force positions and honors pinned nodes", () => {
    const graph = buildKnowledgeGraph(payload, { mode: "global" });
    const options = {
      linkDistance: 138,
      linkStrength: 1,
      repelStrength: 1,
      centerStrength: 0.9,
      clusterStrength: 0.5,
      iterations: 55,
    };
    const first = computeKnowledgeForceLayout(graph, options, {
      porto: { x: 321, y: -123 },
    });
    const second = computeKnowledgeForceLayout(graph, options, {
      porto: { x: 321, y: -123 },
    });

    expect(first.get("porto")).toEqual({ x: 321, y: -123 });
    expect([...first.entries()]).toEqual([...second.entries()]);
    for (const point of first.values()) {
      expect(Number.isFinite(point.x)).toBe(true);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });
});
