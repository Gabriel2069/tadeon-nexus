import { describe, expect, it } from "vitest";
import {
  computeKnowledgeForceLayout,
  type KnowledgeForceOptions,
  type KnowledgeGraphNode,
  type KnowledgeLocalGraph,
} from "./knowledge-graph-memory-spaced";

function node(
  id: string,
  importance: number,
  depth: number,
  overrides: Partial<KnowledgeGraphNode> = {},
): KnowledgeGraphNode {
  return {
    id,
    title: id,
    summary: "",
    nodeType: "concept",
    icon: null,
    status: "canonical",
    visibility: "workspace",
    campaignId: null,
    parentNodeId: null,
    updatedAt: "2026-08-17T00:00:00.000Z",
    tags: [],
    semanticTerms: [],
    explicitDegree: 0,
    incomingMentions: 0,
    outgoingMentions: 0,
    depth,
    importance,
    weightedDegree: 0,
    ...overrides,
  };
}

const graph: KnowledgeLocalGraph = {
  focusNodeId: "focus",
  depth: 2,
  limit: 50,
  truncated: false,
  mode: "local",
  nodes: [
    node("focus", 1, 0, { weightedDegree: 4 }),
    node("a", 0.82, 1, { weightedDegree: 3 }),
    node("b", 0.68, 1, { nodeType: "character", weightedDegree: 3 }),
    node("c", 0.55, 1, { nodeType: "location", weightedDegree: 2 }),
    node("d", 0.44, 1, { nodeType: "plot", weightedDegree: 2 }),
    node("e", 0.36, 2, { nodeType: "organization", weightedDegree: 2 }),
    node("f", 0.28, 2, { nodeType: "fragment", weightedDegree: 1 }),
    node("g", 0.2, 2, { nodeType: "document", weightedDegree: 1 }),
  ],
  edges: [
    {
      id: "focus-a",
      sourceNodeId: "focus",
      targetNodeId: "a",
      relationType: "related_to",
      label: "A",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.94,
      kinds: ["explicit"],
      signals: [],
      evidence: [],
    },
    {
      id: "focus-b",
      sourceNodeId: "focus",
      targetNodeId: "b",
      relationType: "related_to",
      label: "B",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.82,
      kinds: ["mention"],
      signals: [],
      evidence: [],
    },
    {
      id: "focus-c",
      sourceNodeId: "focus",
      targetNodeId: "c",
      relationType: "related_to",
      label: "C",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.66,
      kinds: ["hierarchy"],
      signals: [],
      evidence: [],
    },
    {
      id: "a-d",
      sourceNodeId: "a",
      targetNodeId: "d",
      relationType: "related_to",
      label: "D",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.72,
      kinds: ["explicit"],
      signals: [],
      evidence: [],
    },
    {
      id: "b-e",
      sourceNodeId: "b",
      targetNodeId: "e",
      relationType: "related_to",
      label: "E",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.58,
      kinds: ["mention"],
      signals: [],
      evidence: [],
    },
    {
      id: "c-f",
      sourceNodeId: "c",
      targetNodeId: "f",
      relationType: "related_to",
      label: "F",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.46,
      kinds: ["semantic"],
      signals: [],
      evidence: [],
    },
    {
      id: "d-g",
      sourceNodeId: "d",
      targetNodeId: "g",
      relationType: "related_to",
      label: "G",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.38,
      kinds: ["semantic"],
      signals: [],
      evidence: [],
    },
    {
      id: "b-d",
      sourceNodeId: "b",
      targetNodeId: "d",
      relationType: "related_to",
      label: "cross",
      direction: "bidirectional",
      visibility: "workspace",
      strength: 0.61,
      kinds: ["explicit"],
      signals: [],
      evidence: [],
    },
  ],
};

const options: KnowledgeForceOptions = {
  linkDistance: 138,
  linkStrength: 1,
  repelStrength: 1,
  centerStrength: 0.9,
  clusterStrength: 0.5,
  iterations: 70,
};

function radiusFor(entry: KnowledgeGraphNode) {
  return 12 + entry.importance * 15 + (entry.depth === 0 ? 3 : 0);
}

describe("organic knowledge web layout", () => {
  it("is deterministic, honors pinned nodes and avoids node overlap", () => {
    const pinned = { g: { x: 330, y: -175 } };
    const first = computeKnowledgeForceLayout(graph, options, pinned);
    const second = computeKnowledgeForceLayout(graph, options, pinned);

    expect([...first.entries()]).toEqual([...second.entries()]);
    expect(first.get("g")).toEqual(pinned.g);

    for (let left = 0; left < graph.nodes.length; left += 1) {
      for (let right = left + 1; right < graph.nodes.length; right += 1) {
        const leftNode = graph.nodes[left];
        const rightNode = graph.nodes[right];
        const leftPoint = first.get(leftNode.id)!;
        const rightPoint = first.get(rightNode.id)!;
        const distance = Math.hypot(rightPoint.x - leftPoint.x, rightPoint.y - leftPoint.y);
        expect(distance).toBeGreaterThanOrEqual(
          radiusFor(leftNode) + radiusFor(rightNode) + 4,
        );
      }
    }
  });

  it("does not arrange equal-depth nodes on one concentric ring", () => {
    const positions = computeKnowledgeForceLayout(graph, options);
    const depthOneRadii = graph.nodes
      .filter((entry) => entry.depth === 1)
      .map((entry) => {
        const point = positions.get(entry.id)!;
        return Math.round(Math.hypot(point.x, point.y));
      });

    expect(new Set(depthOneRadii).size).toBeGreaterThan(2);
  });

  it("keeps generous Obsidian-like reading space at the new default", () => {
    const spacious = computeKnowledgeForceLayout(graph, {
      ...options,
      linkDistance: 238,
      repelStrength: 1.55,
      centerStrength: 0.46,
      clusterStrength: 0.16,
    });
    const edgeLengths = graph.edges.map((edge) => {
      const source = spacious.get(edge.sourceNodeId)!;
      const target = spacious.get(edge.targetNodeId)!;
      return Math.hypot(target.x - source.x, target.y - source.y);
    }).sort((left, right) => left - right);

    expect(edgeLengths[Math.floor(edgeLengths.length / 2)]).toBeGreaterThan(150);
  });
});
