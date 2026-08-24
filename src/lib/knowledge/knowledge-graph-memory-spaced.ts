import {
  computeKnowledgeForceLayout as legacyForceLayout,
  graphLinkDistance,
  type KnowledgeForceOptions,
  type KnowledgeGraphNode,
  type KnowledgeGraphPoint,
  type KnowledgeLocalGraph,
} from "./knowledge-graph-memory";

export * from "./knowledge-graph-memory";

function radiusFor(node: KnowledgeGraphNode) {
  return 12 + node.importance * 15 + (node.depth === 0 ? 3 : 0);
}

function hashNumber(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicDirection(leftId: string, rightId: string) {
  const hash = hashNumber(leftId < rightId ? `${leftId}:${rightId}` : `${rightId}:${leftId}`);
  const angle = ((hash % 4096) / 4096) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function movePoint(
  point: KnowledgeGraphPoint,
  dx: number,
  dy: number,
  maximum = 18,
) {
  const length = Math.hypot(dx, dy);
  if (length <= maximum || length === 0) {
    point.x += dx;
    point.y += dy;
    return;
  }
  const scale = maximum / length;
  point.x += dx * scale;
  point.y += dy * scale;
}

function relaxWeb(
  graph: KnowledgeLocalGraph,
  initial: Map<string, KnowledgeGraphPoint>,
  options: KnowledgeForceOptions,
  pinned: Readonly<Record<string, KnowledgeGraphPoint>>,
) {
  const positions = new Map(
    graph.nodes.map((node) => [node.id, { ...(initial.get(node.id) ?? { x: 0, y: 0 }) }]),
  );
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const degree = new Map<string, number>();
  for (const edge of graph.edges) {
    degree.set(edge.sourceNodeId, (degree.get(edge.sourceNodeId) ?? 0) + 1);
    degree.set(edge.targetNodeId, (degree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const passes = graph.nodes.length > 320 ? 18 : graph.nodes.length > 180 ? 24 : 34;
  const collisionGap = Math.max(26, Math.min(52, options.linkDistance * 0.18));

  for (let pass = 0; pass < passes; pass += 1) {
    const alpha = 1 - pass / passes;

    /* Topology tension: strong relations behave as the short strands of the
       web; weak/semantic relations stay longer and therefore do not collapse
       the whole graph into one dense ball. */
    for (const edge of graph.edges) {
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      const sourcePinned = Boolean(pinned[edge.sourceNodeId]);
      const targetPinned = Boolean(pinned[edge.targetNodeId]);
      let dx = target.x - source.x;
      let dy = target.y - source.y;
      let distance = Math.hypot(dx, dy);
      if (distance < 0.01) {
        const direction = deterministicDirection(edge.sourceNodeId, edge.targetNodeId);
        dx = direction.x;
        dy = direction.y;
        distance = 1;
      }
      const strandSpacing = edge.kinds.includes("semantic") && edge.kinds.length === 1
        ? 1.28
        : edge.strength >= 0.8
          ? 1.04
          : 1.14;
      const desired = graphLinkDistance(edge.strength, options.linkDistance) * strandSpacing;
      const delta = distance - desired;
      const spring = delta * (0.024 + edge.strength * 0.026) * alpha;
      const ux = dx / distance;
      const uy = dy / distance;
      if (!sourcePinned && !targetPinned) {
        movePoint(source, ux * spring * 0.5, uy * spring * 0.5, 12);
        movePoint(target, -ux * spring * 0.5, -uy * spring * 0.5, 12);
      } else if (!sourcePinned) {
        movePoint(source, ux * spring, uy * spring, 12);
      } else if (!targetPinned) {
        movePoint(target, -ux * spring, -uy * spring, 12);
      }
    }

    /* Hard collision pass. The previous force solver only nudged overlaps while
       cooling; this pass resolves them after the simulation has settled. */
    for (let leftIndex = 0; leftIndex < graph.nodes.length; leftIndex += 1) {
      const leftNode = graph.nodes[leftIndex];
      const left = positions.get(leftNode.id)!;
      for (let rightIndex = leftIndex + 1; rightIndex < graph.nodes.length; rightIndex += 1) {
        const rightNode = graph.nodes[rightIndex];
        const right = positions.get(rightNode.id)!;
        const minimum = radiusFor(leftNode) + radiusFor(rightNode) + collisionGap;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minimum) continue;
        if (distance < 0.01) {
          const direction = deterministicDirection(leftNode.id, rightNode.id);
          dx = direction.x;
          dy = direction.y;
          distance = 1;
        }
        const ux = dx / distance;
        const uy = dy / distance;
        const overlap = (minimum - distance) * (0.54 + alpha * 0.18);
        const leftPinned = Boolean(pinned[leftNode.id]);
        const rightPinned = Boolean(pinned[rightNode.id]);
        if (!leftPinned && !rightPinned) {
          movePoint(left, -ux * overlap * 0.5, -uy * overlap * 0.5, 16);
          movePoint(right, ux * overlap * 0.5, uy * overlap * 0.5, 16);
        } else if (!leftPinned) {
          movePoint(left, -ux * overlap, -uy * overlap, 16);
        } else if (!rightPinned) {
          movePoint(right, ux * overlap, uy * overlap, 16);
        }
      }
    }

    /* Hubs become quiet anchors. Isolated pages drift outward instead of
       occupying the central reading area with no strand connecting them. */
    for (const node of graph.nodes) {
      if (pinned[node.id]) continue;
      const point = positions.get(node.id)!;
      const connections = degree.get(node.id) ?? 0;
      if (node.id === graph.focusNodeId && graph.mode === "local") {
        point.x *= 0.64;
        point.y *= 0.64;
        continue;
      }
      if (connections === 0) {
        const distance = Math.max(1, Math.hypot(point.x, point.y));
        const outward = (2.4 + alpha * 2.2) / distance;
        point.x += point.x * outward;
        point.y += point.y * outward;
      } else if (connections >= 4) {
        const hubPull = Math.min(0.012, connections * 0.00125) * alpha;
        point.x *= 1 - hubPull;
        point.y *= 1 - hubPull;
      }
    }

    for (const [nodeId, point] of Object.entries(pinned)) {
      if (positions.has(nodeId)) positions.set(nodeId, { ...point });
    }
  }

  /* A final uncompromising separation pass removes the last sub-pixel overlaps
     left after topology tension, without reintroducing concentric placement. */
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    for (let leftIndex = 0; leftIndex < graph.nodes.length; leftIndex += 1) {
      const leftNode = graph.nodes[leftIndex];
      const left = positions.get(leftNode.id)!;
      for (let rightIndex = leftIndex + 1; rightIndex < graph.nodes.length; rightIndex += 1) {
        const rightNode = graph.nodes[rightIndex];
        const right = positions.get(rightNode.id)!;
        const minimum = radiusFor(leftNode) + radiusFor(rightNode) + collisionGap * 0.82;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distance = Math.hypot(dx, dy);
        if (distance >= minimum - 0.25) continue;
        moved = true;
        if (distance < 0.01) {
          const direction = deterministicDirection(leftNode.id, rightNode.id);
          dx = direction.x;
          dy = direction.y;
          distance = 1;
        }
        const ux = dx / distance;
        const uy = dy / distance;
        const overlap = minimum - distance + 0.35;
        const leftPinned = Boolean(pinned[leftNode.id]);
        const rightPinned = Boolean(pinned[rightNode.id]);
        if (!leftPinned && !rightPinned) {
          movePoint(left, -ux * overlap * 0.5, -uy * overlap * 0.5, 20);
          movePoint(right, ux * overlap * 0.5, uy * overlap * 0.5, 20);
        } else if (!leftPinned) {
          movePoint(left, -ux * overlap, -uy * overlap, 20);
        } else if (!rightPinned) {
          movePoint(right, ux * overlap, uy * overlap, 20);
        }
      }
    }
    if (!moved) break;
  }

  return positions;
}

export function computeKnowledgeForceLayout(
  graph: KnowledgeLocalGraph,
  options: KnowledgeForceOptions,
  pinned: Readonly<Record<string, KnowledgeGraphPoint>> = {},
) {
  if (!graph.nodes.length) return legacyForceLayout(graph, options, pinned);

  const organic = legacyForceLayout(
    graph,
    {
      ...options,
      linkDistance: Math.max(140, options.linkDistance * 1.05),
      linkStrength: Math.max(0.2, options.linkStrength * 1.04),
      repelStrength: Math.max(0.45, options.repelStrength * 1.5),
      centerStrength: options.centerStrength * 0.42,
      clusterStrength: options.clusterStrength * 0.12,
      iterations: Math.max(
        options.iterations ?? 0,
        graph.nodes.length > 300 ? 88 : graph.nodes.length > 180 ? 112 : 132,
      ),
    },
    pinned,
  );

  return relaxWeb(graph, organic, options, pinned);
}
