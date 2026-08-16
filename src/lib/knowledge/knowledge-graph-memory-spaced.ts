import {
  computeKnowledgeForceLayout as legacyForceLayout,
  type KnowledgeForceOptions,
  type KnowledgeGraphNode,
  type KnowledgeGraphPoint,
  type KnowledgeLocalGraph,
} from "./knowledge-graph-memory";

export * from "./knowledge-graph-memory";

function radiusFor(node: KnowledgeGraphNode) {
  return 12 + node.importance * 15 + (node.depth === 0 ? 3 : 0);
}

function domainOrder(type: KnowledgeGraphNode["nodeType"]) {
  if (["character", "npc", "creature", "people"].includes(type)) return 0;
  if (["kingdom", "region", "city", "location", "river", "sea", "terrain", "tectonic_plate"].includes(type)) return 1;
  if (["plot", "clue", "historical_event", "session"].includes(type)) return 2;
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) return 3;
  if (["organization", "religion", "culture", "language"].includes(type)) return 4;
  return 5;
}

function ordered(nodes: KnowledgeGraphNode[]) {
  return [...nodes].sort(
    (left, right) =>
      domainOrder(left.nodeType) - domainOrder(right.nodeType) ||
      right.importance - left.importance ||
      left.title.localeCompare(right.title, "pt-BR"),
  );
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export function computeKnowledgeForceLayout(
  graph: KnowledgeLocalGraph,
  options: KnowledgeForceOptions,
  pinned: Readonly<Record<string, KnowledgeGraphPoint>> = {},
) {
  if (!graph.nodes.length) return legacyForceLayout(graph, options, pinned);

  const positions = new Map<string, KnowledgeGraphPoint>();
  const focus = graph.nodes.find((node) => node.id === graph.focusNodeId) ?? graph.nodes[0];
  positions.set(focus.id, { x: 0, y: 0 });

  const byDepth = new Map<number, KnowledgeGraphNode[]>();
  for (const node of graph.nodes) {
    if (node.id === focus.id) continue;
    const depth = node.depth >= 99 ? 99 : Math.max(1, node.depth);
    byDepth.set(depth, [...(byDepth.get(depth) ?? []), node]);
  }

  const spacing = Math.max(18, Math.min(38, options.linkDistance * 0.16));
  let previousRadius = radiusFor(focus);
  let previousNodeRadius = radiusFor(focus);
  let ringIndex = 0;

  for (const depth of [...byDepth.keys()].sort((left, right) => left - right)) {
    const depthNodes = ordered(byDepth.get(depth) ?? []);
    const maxPerRing = graph.mode === "global" ? 30 : 24;
    for (const ringNodes of chunks(depthNodes, maxPerRing)) {
      ringIndex += 1;
      const count = ringNodes.length;
      const largest = Math.max(...ringNodes.map(radiusFor), 12);
      const minimumChord = largest * 2 + spacing;
      const chordRadius = count <= 1 ? 0 : minimumChord / (2 * Math.sin(Math.PI / count));
      const circumferenceRadius = ringNodes.reduce((total, node) => total + radiusFor(node) * 2 + spacing, 0) / (Math.PI * 2);
      const radialClearance = previousRadius + previousNodeRadius + largest + spacing * 1.35;
      const ringRadius = Math.max(96 + ringIndex * 18, chordRadius, circumferenceRadius, radialClearance);
      const phase = (ringIndex % 2 ? Math.PI / Math.max(2, count) : 0) + depth * 0.11;
      ringNodes.forEach((node, index) => {
        const angle = phase + (index / Math.max(1, count)) * Math.PI * 2;
        positions.set(node.id, { x: Math.cos(angle) * ringRadius, y: Math.sin(angle) * ringRadius });
      });
      previousRadius = ringRadius;
      previousNodeRadius = largest;
    }
  }

  for (const node of graph.nodes) {
    const candidate = pinned[node.id];
    if (!candidate) continue;
    const ownRadius = radiusFor(node);
    const collides = graph.nodes.some((other) => {
      if (other.id === node.id) return false;
      const point = positions.get(other.id);
      if (!point) return false;
      const minimum = ownRadius + radiusFor(other) + spacing;
      return Math.hypot(candidate.x - point.x, candidate.y - point.y) < minimum;
    });
    if (!collides) positions.set(node.id, { ...candidate });
  }

  return positions;
}
