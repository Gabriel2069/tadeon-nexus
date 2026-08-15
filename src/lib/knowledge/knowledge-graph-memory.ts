import type {
  KnowledgeNodeStatus,
  KnowledgeNodeType,
  KnowledgeRelationDirection,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";

export type KnowledgeGraphSignalKind =
  | "explicit"
  | "mention"
  | "hierarchy"
  | "semantic";

export interface KnowledgeMemoryNode {
  id: string;
  title: string;
  summary: string;
  nodeType: KnowledgeNodeType;
  icon: string | null;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  campaignId: string | null;
  parentNodeId: string | null;
  updatedAt: string;
  tags: string[];
  semanticTerms: string[];
  explicitDegree: number;
  incomingMentions: number;
  outgoingMentions: number;
}

export interface KnowledgeMemorySignal {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  kind: Exclude<KnowledgeGraphSignalKind, "semantic">;
  relationType: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  strength: number;
  evidence: string[];
}

export interface KnowledgeMemoryPayload {
  focusNodeId: string;
  candidateLimit: number;
  truncated: boolean;
  nodes: KnowledgeMemoryNode[];
  signals: KnowledgeMemorySignal[];
}

export interface KnowledgeGraphSignal {
  kind: KnowledgeGraphSignalKind;
  label: string;
  strength: number;
  evidence: string[];
}

export interface KnowledgeGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  strength: number;
  kinds: KnowledgeGraphSignalKind[];
  signals: KnowledgeGraphSignal[];
  evidence: string[];
}

export interface KnowledgeGraphNode extends KnowledgeMemoryNode {
  depth: number;
  importance: number;
  weightedDegree: number;
}

export interface KnowledgeLocalGraph {
  focusNodeId: string;
  depth: number;
  limit: number;
  truncated: boolean;
  mode: "local" | "global";
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeGraphBuildOptions {
  mode?: "local" | "global";
  depth?: number;
  limit?: number;
  includeSemantic?: boolean;
  semanticThreshold?: number;
  semanticNeighbors?: number;
  minimumStrength?: number;
}

export interface KnowledgeForceOptions {
  linkDistance: number;
  linkStrength: number;
  repelStrength: number;
  centerStrength: number;
  clusterStrength: number;
  iterations?: number;
}

export interface KnowledgeGraphPoint {
  x: number;
  y: number;
}

const STOP_TERMS = new Set([
  "a",
  "ao",
  "aos",
  "aquela",
  "aquele",
  "aqueles",
  "as",
  "até",
  "com",
  "como",
  "da",
  "das",
  "de",
  "dela",
  "dele",
  "deles",
  "depois",
  "do",
  "dos",
  "e",
  "ela",
  "elas",
  "ele",
  "eles",
  "em",
  "entre",
  "era",
  "essa",
  "esse",
  "esta",
  "este",
  "foi",
  "mais",
  "mas",
  "mesmo",
  "muito",
  "na",
  "nas",
  "não",
  "no",
  "nos",
  "num",
  "numa",
  "o",
  "os",
  "ou",
  "para",
  "pela",
  "pelas",
  "pelo",
  "pelos",
  "por",
  "porque",
  "que",
  "se",
  "sem",
  "ser",
  "seu",
  "sua",
  "suas",
  "também",
  "tem",
  "ter",
  "um",
  "uma",
  "umas",
  "uns",
]);

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizedTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function titleTerms(title: string) {
  return title
    .split(/[^\p{L}\p{N}]+/u)
    .map(normalizedTerm)
    .filter((term) => term.length >= 4 && !STOP_TERMS.has(term));
}

function semanticTermSet(node: KnowledgeMemoryNode) {
  const weighted = new Map<string, number>();
  for (const raw of node.semanticTerms) {
    const term = normalizedTerm(raw);
    if (term.length < 4 || STOP_TERMS.has(term) || /^\d+$/.test(term)) continue;
    weighted.set(term, Math.max(weighted.get(term) ?? 0, 1));
  }
  for (const term of titleTerms(node.title)) {
    weighted.set(term, Math.max(weighted.get(term) ?? 0, 1.75));
  }
  return weighted;
}

function unique(values: string[], limit = 8) {
  return [...new Set(values.filter(Boolean))].slice(0, limit);
}

function pairKey(left: string, right: string) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

function relationPriority(type: RelationType) {
  switch (type) {
    case "opposes":
    case "allied_with":
    case "member_of":
    case "owns":
    case "created_by":
      return 5;
    case "part_of":
    case "contains":
    case "located_in":
    case "parent_of":
    case "child_of":
      return 4;
    case "precedes":
    case "follows":
    case "reveals":
      return 3;
    case "mentions":
      return 2;
    case "related_to":
      return 1;
    default:
      return 0;
  }
}

interface SemanticCandidate {
  sourceNodeId: string;
  targetNodeId: string;
  strength: number;
  evidence: string[];
}

function deriveSemanticSignals(
  nodes: KnowledgeMemoryNode[],
  threshold: number,
  neighborLimit: number,
) {
  const termMaps = new Map(nodes.map((node) => [node.id, semanticTermSet(node)]));
  const documentFrequency = new Map<string, number>();
  for (const terms of termMaps.values()) {
    for (const term of terms.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }
  const idf = (term: string) =>
    Math.log((nodes.length + 1) / ((documentFrequency.get(term) ?? 0) + 1)) + 1;

  const candidates: SemanticCandidate[] = [];
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const left = nodes[leftIndex];
    const leftTerms = termMaps.get(left.id) ?? new Map<string, number>();
    const leftTags = new Set(left.tags.map(normalizedTerm).filter(Boolean));
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const right = nodes[rightIndex];
      const rightTerms = termMaps.get(right.id) ?? new Map<string, number>();
      const sharedTerms: Array<{ term: string; weight: number }> = [];
      let intersection = 0;
      let leftMass = 0;
      let rightMass = 0;

      for (const [term, weight] of leftTerms) {
        const value = weight * idf(term);
        leftMass += value * value;
        const rightWeight = rightTerms.get(term);
        if (!rightWeight) continue;
        const shared = Math.min(value, rightWeight * idf(term));
        intersection += shared * shared;
        sharedTerms.push({ term, weight: shared });
      }
      for (const [term, weight] of rightTerms) {
        const value = weight * idf(term);
        rightMass += value * value;
      }
      const contentSimilarity =
        leftMass > 0 && rightMass > 0
          ? clamp(intersection / Math.sqrt(leftMass * rightMass))
          : 0;
      const sharedTags = right.tags
        .map(normalizedTerm)
        .filter((tag) => tag && leftTags.has(tag));
      const tagStrength = sharedTags.length
        ? Math.min(0.72, 0.32 + sharedTags.length * 0.12)
        : 0;
      const contentStrength = clamp(contentSimilarity * 1.45, 0, 0.82);
      const strength = 1 - (1 - contentStrength) * (1 - tagStrength);
      if (strength < threshold) continue;
      if (sharedTerms.length < 2 && sharedTags.length === 0) continue;

      sharedTerms.sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term));
      const topTerms = sharedTerms.slice(0, 4).map((entry) => entry.term);
      candidates.push({
        sourceNodeId: left.id,
        targetNodeId: right.id,
        strength,
        evidence: unique([
          topTerms.length ? `Conteúdo em comum: ${topTerms.join(", ")}` : "",
          sharedTags.length ? `Tags em comum: ${sharedTags.slice(0, 4).join(", ")}` : "",
        ]),
      });
    }
  }

  candidates.sort((left, right) => right.strength - left.strength);
  const degree = new Map<string, number>();
  return candidates.filter((candidate) => {
    const sourceDegree = degree.get(candidate.sourceNodeId) ?? 0;
    const targetDegree = degree.get(candidate.targetNodeId) ?? 0;
    if (sourceDegree >= neighborLimit || targetDegree >= neighborLimit) return false;
    degree.set(candidate.sourceNodeId, sourceDegree + 1);
    degree.set(candidate.targetNodeId, targetDegree + 1);
    return true;
  });
}

interface PairMetadata {
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  priority: number;
  primaryStrength: number;
}

function combineSignals(
  payload: KnowledgeMemoryPayload,
  semanticCandidates: SemanticCandidate[],
) {
  const grouped = new Map<string, KnowledgeGraphSignal[]>();
  const metadata = new Map<string, PairMetadata>();

  const register = (
    sourceNodeId: string,
    targetNodeId: string,
    signal: KnowledgeGraphSignal,
    relationType: RelationType,
    label: string,
    direction: KnowledgeRelationDirection,
    visibility: KnowledgeVisibility,
  ) => {
    if (sourceNodeId === targetNodeId) return;
    const key = pairKey(sourceNodeId, targetNodeId);
    grouped.set(key, [...(grouped.get(key) ?? []), signal]);
    const priority = relationPriority(relationType);
    const current = metadata.get(key);
    if (
      !current ||
      priority > current.priority ||
      (priority === current.priority && signal.strength > current.primaryStrength)
    ) {
      metadata.set(key, {
        sourceNodeId,
        targetNodeId,
        relationType,
        label,
        direction,
        visibility,
        priority,
        primaryStrength: signal.strength,
      });
    }
  };

  for (const signal of payload.signals) {
    register(
      signal.sourceNodeId,
      signal.targetNodeId,
      {
        kind: signal.kind,
        label: signal.label,
        strength: clamp(signal.strength),
        evidence: signal.evidence,
      },
      signal.relationType,
      signal.label,
      signal.direction,
      signal.visibility,
    );
  }

  for (const semantic of semanticCandidates) {
    register(
      semantic.sourceNodeId,
      semantic.targetNodeId,
      {
        kind: "semantic",
        label: "Afinidade de conteúdo",
        strength: semantic.strength,
        evidence: semantic.evidence,
      },
      "related_to",
      "Afinidade de conteúdo",
      "bidirectional",
      "workspace",
    );
  }

  return [...grouped.entries()].map(([key, signals]) => {
    const primary = metadata.get(key)!;
    const strength = clamp(
      1 - signals.reduce(
        (remaining, signal) => remaining * (1 - clamp(signal.strength) * 0.88),
        1,
      ),
      0,
      0.99,
    );
    return {
      id: `memory:${key}`,
      sourceNodeId: primary.sourceNodeId,
      targetNodeId: primary.targetNodeId,
      relationType: primary.relationType,
      label: primary.label,
      direction: primary.direction,
      visibility: primary.visibility,
      strength,
      kinds: [...new Set(signals.map((signal) => signal.kind))],
      signals: [...signals].sort((left, right) => right.strength - left.strength),
      evidence: unique(signals.flatMap((signal) => signal.evidence), 6),
    } satisfies KnowledgeGraphEdge;
  });
}

function graphDepths(
  focusNodeId: string,
  edges: KnowledgeGraphEdge[],
  minimumStrength: number,
) {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.strength < minimumStrength) continue;
    adjacency.set(edge.sourceNodeId, [
      ...(adjacency.get(edge.sourceNodeId) ?? []),
      edge.targetNodeId,
    ]);
    adjacency.set(edge.targetNodeId, [
      ...(adjacency.get(edge.targetNodeId) ?? []),
      edge.sourceNodeId,
    ]);
  }
  const depths = new Map<string, number>([[focusNodeId, 0]]);
  const queue = [focusNodeId];
  while (queue.length) {
    const current = queue.shift()!;
    const nextDepth = (depths.get(current) ?? 0) + 1;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (depths.has(neighbor)) continue;
      depths.set(neighbor, nextDepth);
      queue.push(neighbor);
    }
  }
  return depths;
}

export function buildKnowledgeGraph(
  payload: KnowledgeMemoryPayload,
  options: KnowledgeGraphBuildOptions = {},
): KnowledgeLocalGraph {
  const mode = options.mode ?? "local";
  const requestedDepth = Math.max(1, Math.min(4, Math.trunc(options.depth ?? 2)));
  const limit = Math.max(20, Math.min(500, Math.trunc(options.limit ?? 220)));
  const semanticThreshold = clamp(options.semanticThreshold ?? 0.22, 0.08, 0.85);
  const semanticNeighbors = Math.max(
    1,
    Math.min(12, Math.trunc(options.semanticNeighbors ?? 5)),
  );
  const minimumStrength = clamp(options.minimumStrength ?? 0.12, 0, 0.85);
  const semantic =
    options.includeSemantic === false
      ? []
      : deriveSemanticSignals(payload.nodes, semanticThreshold, semanticNeighbors);
  const allEdges = combineSignals(payload, semantic).filter(
    (edge) =>
      edge.strength >= minimumStrength ||
      edge.kinds.some((kind) => kind !== "semantic"),
  );
  const depths = graphDepths(payload.focusNodeId, allEdges, minimumStrength);

  const weightedDegree = new Map<string, number>();
  for (const edge of allEdges) {
    weightedDegree.set(
      edge.sourceNodeId,
      (weightedDegree.get(edge.sourceNodeId) ?? 0) + edge.strength,
    );
    weightedDegree.set(
      edge.targetNodeId,
      (weightedDegree.get(edge.targetNodeId) ?? 0) + edge.strength,
    );
  }

  const enriched = payload.nodes.map((node) => {
    const degree = weightedDegree.get(node.id) ?? 0;
    const referenceWeight =
      Math.log1p(node.explicitDegree) * 0.8 +
      Math.log1p(node.incomingMentions) * 1.15 +
      Math.log1p(node.outgoingMentions) * 0.35 +
      Math.log1p(degree) * 1.05;
    return {
      ...node,
      depth: depths.get(node.id) ?? 99,
      importance:
        node.id === payload.focusNodeId
          ? 1
          : clamp(1 - Math.exp(-referenceWeight / 4.2), 0.08, 1),
      weightedDegree: degree,
    } satisfies KnowledgeGraphNode;
  });

  let selected =
    mode === "local"
      ? enriched.filter((node) => node.depth <= requestedDepth)
      : enriched;
  selected.sort((left, right) => {
    if (left.id === payload.focusNodeId) return -1;
    if (right.id === payload.focusNodeId) return 1;
    if (mode === "local" && left.depth !== right.depth) {
      return left.depth - right.depth;
    }
    return (
      right.importance - left.importance ||
      left.title.localeCompare(right.title, "pt-BR")
    );
  });
  const wasLimited = selected.length > limit;
  selected = selected.slice(0, limit);
  const selectedIds = new Set(selected.map((node) => node.id));
  const edges = allEdges
    .filter(
      (edge) =>
        selectedIds.has(edge.sourceNodeId) && selectedIds.has(edge.targetNodeId),
    )
    .sort((left, right) => right.strength - left.strength);

  return {
    focusNodeId: payload.focusNodeId,
    depth: requestedDepth,
    limit,
    truncated: payload.truncated || wasLimited,
    mode,
    nodes: selected,
    edges,
  };
}

export function graphLinkDistance(strength: number, baseDistance: number) {
  return Math.max(44, baseDistance * (1.38 - clamp(strength) * 0.82));
}

function hashNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function nodeGroup(type: KnowledgeNodeType) {
  if (["character", "npc", "creature", "people"].includes(type)) return 0;
  if (
    [
      "kingdom",
      "region",
      "city",
      "location",
      "river",
      "sea",
      "terrain",
      "tectonic_plate",
    ].includes(type)
  ) {
    return 1;
  }
  if (["plot", "clue", "historical_event", "session"].includes(type)) return 2;
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) {
    return 3;
  }
  if (["organization", "religion", "culture", "language"].includes(type)) return 4;
  return 5;
}

export function computeKnowledgeForceLayout(
  graph: KnowledgeLocalGraph,
  options: KnowledgeForceOptions,
  pinned: Readonly<Record<string, KnowledgeGraphPoint>> = {},
) {
  const nodes = graph.nodes;
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const positions = nodes.map((node, index) => {
    const pinnedPoint = pinned[node.id];
    if (pinnedPoint) return { ...pinnedPoint };
    if (node.id === graph.focusNodeId) return { x: 0, y: 0 };
    const hash = hashNumber(node.id);
    const angle = ((hash % 3600) / 3600) * Math.PI * 2;
    const depth = node.depth >= 99 ? 3 : Math.max(1, node.depth);
    const radius = 78 + depth * 92 + ((hash >>> 8) % 48);
    return {
      x: Math.cos(angle) * radius + ((index % 5) - 2) * 5,
      y: Math.sin(angle) * radius + ((index % 7) - 3) * 5,
    };
  });
  const velocity = nodes.map(() => ({ x: 0, y: 0 }));
  const iterations = Math.max(
    30,
    Math.min(180, Math.trunc(options.iterations ?? 105)),
  );
  const linkStrength = Math.max(0, options.linkStrength);
  const repelStrength = Math.max(0, options.repelStrength);
  const centerStrength = Math.max(0, options.centerStrength);
  const clusterStrength = Math.max(0, options.clusterStrength);

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const cooling = 1 - iteration / iterations;
    for (let left = 0; left < nodes.length; left += 1) {
      for (let right = left + 1; right < nodes.length; right += 1) {
        let dx = positions[right].x - positions[left].x;
        let dy = positions[right].y - positions[left].y;
        let distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 4) {
          const jitter =
            (((hashNumber(`${nodes[left].id}:${nodes[right].id}`) % 101) - 50) /
              50) *
            0.8;
          dx += jitter || 0.3;
          dy -= jitter || 0.2;
          distanceSquared = dx * dx + dy * dy;
        }
        const distance = Math.sqrt(distanceSquared);
        const force =
          (repelStrength * 820 * cooling) / Math.max(280, distanceSquared);
        const ux = dx / distance;
        const uy = dy / distance;
        velocity[left].x -= ux * force;
        velocity[left].y -= uy * force;
        velocity[right].x += ux * force;
        velocity[right].y += uy * force;

        const leftRadius = 12 + nodes[left].importance * 15;
        const rightRadius = 12 + nodes[right].importance * 15;
        const minimum = leftRadius + rightRadius + 18;
        if (distance < minimum) {
          const overlap = (minimum - distance) * 0.055 * cooling;
          velocity[left].x -= ux * overlap;
          velocity[left].y -= uy * overlap;
          velocity[right].x += ux * overlap;
          velocity[right].y += uy * overlap;
        }
      }
    }

    for (const edge of graph.edges) {
      const source = indexById.get(edge.sourceNodeId);
      const target = indexById.get(edge.targetNodeId);
      if (source === undefined || target === undefined) continue;
      const dx = positions[target].x - positions[source].x;
      const dy = positions[target].y - positions[source].y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = graphLinkDistance(edge.strength, options.linkDistance);
      const spring =
        ((distance - desired) / distance) *
        linkStrength *
        (0.016 + edge.strength * 0.03) *
        cooling;
      const fx = dx * spring;
      const fy = dy * spring;
      velocity[source].x += fx;
      velocity[source].y += fy;
      velocity[target].x -= fx;
      velocity[target].y -= fy;
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const point = positions[index];
      velocity[index].x -= point.x * centerStrength * 0.0018 * cooling;
      velocity[index].y -= point.y * centerStrength * 0.0018 * cooling;

      const group = nodeGroup(node.nodeType);
      const groupAngle = (group / 6) * Math.PI * 2 - Math.PI / 2;
      const groupRadius = graph.mode === "global" ? 150 : 72;
      const gx = Math.cos(groupAngle) * groupRadius;
      const gy = Math.sin(groupAngle) * groupRadius;
      velocity[index].x +=
        (gx - point.x) * clusterStrength * 0.00075 * cooling;
      velocity[index].y +=
        (gy - point.y) * clusterStrength * 0.00075 * cooling;

      if (node.id === graph.focusNodeId && graph.mode === "local") {
        velocity[index].x -= point.x * 0.028 * cooling;
        velocity[index].y -= point.y * 0.028 * cooling;
      }
    }

    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const pinnedPoint = pinned[node.id];
      if (pinnedPoint) {
        positions[index] = { ...pinnedPoint };
        velocity[index] = { x: 0, y: 0 };
        continue;
      }
      velocity[index].x *= 0.76;
      velocity[index].y *= 0.76;
      positions[index].x += Math.max(-14, Math.min(14, velocity[index].x));
      positions[index].y += Math.max(-14, Math.min(14, velocity[index].y));
    }
  }

  return new Map(nodes.map((node, index) => [node.id, positions[index]]));
}
