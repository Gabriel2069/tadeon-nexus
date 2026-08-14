import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Crosshair,
  Focus,
  Loader2,
  Maximize2,
  Network,
  Search,
  Sparkles,
  Workflow,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  knowledgeGraphService,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type KnowledgeLocalGraph,
} from "@/lib/knowledge/knowledge-graph-service";
import { KnowledgeServiceError } from "@/lib/knowledge/knowledge-errors";
import {
  KNOWLEDGE_NODE_TYPES,
  KNOWLEDGE_VISIBILITIES,
  RELATION_TYPES,
  type KnowledgeNodeType,
  type KnowledgeVisibility,
  type RelationType,
} from "@/lib/nexus-contracts";

interface KnowledgeGraphProps {
  workspaceId: string;
  campaignId: string | null;
  focusNodeId: string;
  onOpenNode: (nodeId: string) => void;
}

interface Point {
  x: number;
  y: number;
}

type GraphLayout = "web" | "tree";

const TYPE_LABELS: Partial<Record<KnowledgeNodeType, string>> = {
  rule: "Regra",
  concept: "Conceito",
  character: "Personagem",
  npc: "NPC",
  creature: "Criatura",
  organization: "Organização",
  religion: "Religião",
  culture: "Cultura",
  people: "Povo",
  language: "Idioma",
  kingdom: "Reino",
  region: "Região",
  city: "Cidade",
  location: "Local",
  river: "Rio",
  sea: "Mar",
  terrain: "Relevo",
  tectonic_plate: "Placa tectônica",
  historical_event: "Evento",
  plot: "Trama",
  clue: "Pista",
  fragment: "Fragmento",
  weapon: "Arma",
  object: "Objeto",
  map: "Mapa",
  document: "Documento",
  free_note: "Nota livre",
};

const CATEGORY_LEGEND = [
  ["#d9d7a4", "Pessoas"],
  ["#4f6e5d", "Lugares"],
  ["#7e5b2f", "Instituições"],
  ["#716b7b", "Conceitos"],
  ["#52788c", "Regras"],
  ["#74242d", "Eventos"],
] as const;

function typeLabel(type: KnowledgeNodeType) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function nodeColor(type: KnowledgeNodeType) {
  if (["character", "npc", "creature", "people"].includes(type)) return "#d9d7a4";
  if (
    ["region", "city", "location", "river", "sea", "terrain", "tectonic_plate", "kingdom"].includes(
      type,
    )
  ) {
    return "#4f6e5d";
  }
  if (["organization", "religion", "culture", "language"].includes(type)) return "#7e5b2f";
  if (type === "rule") return "#52788c";
  if (["historical_event", "plot", "clue", "session"].includes(type)) return "#74242d";
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) return "#8a5561";
  if (["document", "map", "free_note"].includes(type)) return "#7a8187";
  return "#716b7b";
}

function relationColor(type: RelationType) {
  if (["contains", "part_of", "parent_of", "child_of"].includes(type)) return "#d9d7a4";
  if (["located_in", "member_of"].includes(type)) return "#4f6e5d";
  if (["opposes"].includes(type)) return "#a74c55";
  if (["precedes", "follows"].includes(type)) return "#716b7b";
  if (["reveals"].includes(type)) return "#52788c";
  if (["allied_with", "related_to"].includes(type)) return "#7e5b2f";
  return "#77808a";
}

function graphError(error: unknown) {
  return error instanceof KnowledgeServiceError
    ? error.userMessage
    : "Não foi possível carregar o grafo local.";
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function webPositions(graph: KnowledgeLocalGraph) {
  const points = new Map<string, Point>();
  const velocities = new Map<string, Point>();
  const focusId = graph.focusNodeId;

  for (const node of graph.nodes) {
    if (node.id === focusId) {
      points.set(node.id, { x: 0, y: 0 });
      velocities.set(node.id, { x: 0, y: 0 });
      continue;
    }
    const seed = hashString(node.id);
    const angle = ((seed % 10000) / 10000) * Math.PI * 2;
    const radius = node.depth <= 1 ? 185 : 360 + ((seed >>> 8) % 80);
    points.set(node.id, {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
    velocities.set(node.id, { x: 0, y: 0 });
  }

  const nodeIds = graph.nodes.map((node) => node.id);
  const depthById = new Map(graph.nodes.map((node) => [node.id, node.depth]));

  for (let iteration = 0; iteration < 48; iteration += 1) {
    for (let leftIndex = 0; leftIndex < nodeIds.length; leftIndex += 1) {
      const leftId = nodeIds[leftIndex];
      const left = points.get(leftId)!;
      for (let rightIndex = leftIndex + 1; rightIndex < nodeIds.length; rightIndex += 1) {
        const rightId = nodeIds[rightIndex];
        const right = points.get(rightId)!;
        let dx = right.x - left.x;
        let dy = right.y - left.y;
        let distanceSquared = dx * dx + dy * dy;
        if (distanceSquared < 16) {
          const seed = hashString(`${leftId}:${rightId}`);
          dx = (seed % 7) - 3;
          dy = ((seed >>> 4) % 7) - 3;
          distanceSquared = Math.max(16, dx * dx + dy * dy);
        }
        const distance = Math.sqrt(distanceSquared);
        const repulsion = Math.min(2.6, 1550 / distanceSquared);
        const fx = (dx / distance) * repulsion;
        const fy = (dy / distance) * repulsion;
        if (leftId !== focusId) {
          const velocity = velocities.get(leftId)!;
          velocity.x -= fx;
          velocity.y -= fy;
        }
        if (rightId !== focusId) {
          const velocity = velocities.get(rightId)!;
          velocity.x += fx;
          velocity.y += fy;
        }
      }
    }

    for (const edge of graph.edges) {
      const source = points.get(edge.sourceNodeId);
      const target = points.get(edge.targetNodeId);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const sourceDepth = depthById.get(edge.sourceNodeId) ?? 1;
      const targetDepth = depthById.get(edge.targetNodeId) ?? 1;
      const desired = Math.max(sourceDepth, targetDepth) > 1 ? 118 : 145;
      const spring = (distance - desired) * 0.012;
      const fx = (dx / distance) * spring;
      const fy = (dy / distance) * spring;
      if (edge.sourceNodeId !== focusId) {
        const velocity = velocities.get(edge.sourceNodeId)!;
        velocity.x += fx;
        velocity.y += fy;
      }
      if (edge.targetNodeId !== focusId) {
        const velocity = velocities.get(edge.targetNodeId)!;
        velocity.x -= fx;
        velocity.y -= fy;
      }
    }

    for (const node of graph.nodes) {
      if (node.id === focusId) continue;
      const point = points.get(node.id)!;
      const velocity = velocities.get(node.id)!;
      const distance = Math.max(1, Math.hypot(point.x, point.y));
      const targetRadius = node.depth <= 1 ? 205 : 390;
      const radial = (targetRadius - distance) * 0.006;
      velocity.x += (point.x / distance) * radial;
      velocity.y += (point.y / distance) * radial;
      velocity.x *= 0.78;
      velocity.y *= 0.78;
      point.x += velocity.x;
      point.y += velocity.y;
    }
  }

  return points;
}

function treePositions(graph: KnowledgeLocalGraph) {
  const points = new Map<string, Point>();
  const levels = new Map<number, KnowledgeGraphNode[]>();
  const degree = new Map<string, number>();
  for (const edge of graph.edges) {
    degree.set(edge.sourceNodeId, (degree.get(edge.sourceNodeId) ?? 0) + 1);
    degree.set(edge.targetNodeId, (degree.get(edge.targetNodeId) ?? 0) + 1);
  }
  for (const node of graph.nodes) {
    const entries = levels.get(node.depth) ?? [];
    entries.push(node);
    levels.set(node.depth, entries);
  }

  for (const level of [...levels.keys()].sort((left, right) => left - right)) {
    const entries = [...(levels.get(level) ?? [])].sort(
      (left, right) =>
        (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0) ||
        left.title.localeCompare(right.title, "pt-BR"),
    );
    const perRow = level === 0 ? 1 : level === 1 ? 8 : 11;
    const rows = Math.ceil(entries.length / perRow);
    entries.forEach((node, index) => {
      const row = Math.floor(index / perRow);
      const start = row * perRow;
      const rowLength = Math.min(perRow, entries.length - start);
      const column = index - start;
      const spacing = level === 1 ? 150 : 120;
      const yBase = level === 0 ? -260 : level === 1 ? -40 : 220;
      points.set(node.id, {
        x: (column - (rowLength - 1) / 2) * spacing,
        y: yBase + (row - (rows - 1) / 2) * 68,
      });
    });
  }
  return points;
}

function edgeCurve(source: Point, target: Point, edge: KnowledgeGraphEdge) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const normalX = -dy / distance;
  const normalY = dx / distance;
  const seed = hashString(edge.id);
  const direction = seed % 2 === 0 ? 1 : -1;
  const bend = Math.min(34, distance * 0.08) * direction;
  return {
    x: (source.x + target.x) / 2 + normalX * bend,
    y: (source.y + target.y) / 2 + normalY * bend,
  };
}

export function KnowledgeGraph({
  workspaceId,
  campaignId,
  focusNodeId,
  onOpenNode,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({ active: false, moved: false, x: 0, y: 0 });
  const [graphFocusId, setGraphFocusId] = useState(focusNodeId);
  const [graph, setGraph] = useState<KnowledgeLocalGraph | null>(null);
  const [selectedId, setSelectedId] = useState(focusNodeId);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [depth, setDepth] = useState<1 | 2>(2);
  const [limit, setLimit] = useState(200);
  const [nodeType, setNodeType] = useState<KnowledgeNodeType | "all">("all");
  const [relationType, setRelationType] = useState<RelationType | "all">("all");
  const [visibility, setVisibility] = useState<KnowledgeVisibility | "all">("all");
  const [layout, setLayout] = useState<GraphLayout>("web");
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState({ width: 900, height: 620 });
  const [pan, setPan] = useState<Point>({ x: 450, y: 310 });
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setGraphFocusId(focusNodeId);
    setSelectedId(focusNodeId);
  }, [focusNodeId]);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await knowledgeGraphService.loadLocal({
        workspaceId,
        focusNodeId: graphFocusId,
        campaignId,
        includeWorkspace: true,
        depth,
        limit,
        nodeTypes: nodeType === "all" ? undefined : [nodeType],
        relationTypes: relationType === "all" ? undefined : [relationType],
        visibilities: visibility === "all" ? undefined : [visibility],
      });
      setGraph(result);
      setSelectedId((current) =>
        result.nodes.some((node) => node.id === current) ? current : result.focusNodeId,
      );
    } catch (nextError) {
      setGraph(null);
      setError(graphError(nextError));
    } finally {
      setLoading(false);
    }
  }, [campaignId, depth, graphFocusId, limit, nodeType, relationType, visibility, workspaceId]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(460, Math.round(entry.contentRect.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      setViewport({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const positions = useMemo(() => {
    if (!graph) return new Map<string, Point>();
    return layout === "web" ? webPositions(graph) : treePositions(graph);
  }, [graph, layout]);

  const degree = useMemo(() => {
    const next = new Map<string, number>();
    for (const edge of graph?.edges ?? []) {
      next.set(edge.sourceNodeId, (next.get(edge.sourceNodeId) ?? 0) + 1);
      next.set(edge.targetNodeId, (next.get(edge.targetNodeId) ?? 0) + 1);
    }
    return next;
  }, [graph?.edges]);

  const neighbors = useMemo(() => {
    const next = new Map<string, Set<string>>();
    for (const edge of graph?.edges ?? []) {
      const source = next.get(edge.sourceNodeId) ?? new Set<string>();
      const target = next.get(edge.targetNodeId) ?? new Set<string>();
      source.add(edge.targetNodeId);
      target.add(edge.sourceNodeId);
      next.set(edge.sourceNodeId, source);
      next.set(edge.targetNodeId, target);
    }
    return next;
  }, [graph?.edges]);

  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null;

  const fitGraph = useCallback(() => {
    const values = [...positions.values()];
    if (!values.length) return;
    const minX = Math.min(...values.map((point) => point.x));
    const maxX = Math.max(...values.map((point) => point.x));
    const minY = Math.min(...values.map((point) => point.y));
    const maxY = Math.max(...values.map((point) => point.y));
    const contentWidth = Math.max(300, maxX - minX + 170);
    const contentHeight = Math.max(300, maxY - minY + 170);
    const fitted = Math.min(
      1.18,
      Math.max(0.24, Math.min(viewport.width / contentWidth, viewport.height / contentHeight)),
    );
    setZoom(fitted);
    setPan({
      x: viewport.width / 2 - ((minX + maxX) / 2) * fitted,
      y: viewport.height / 2 - ((minY + maxY) / 2) * fitted,
    });
  }, [positions, viewport.height, viewport.width]);

  useEffect(() => {
    fitGraph();
  }, [fitGraph, graph?.focusNodeId, layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#080a0e";
    context.fillRect(0, 0, viewport.width, viewport.height);

    const atmosphere = context.createRadialGradient(
      viewport.width * 0.46,
      viewport.height * 0.4,
      0,
      viewport.width * 0.46,
      viewport.height * 0.4,
      Math.max(viewport.width, viewport.height) * 0.8,
    );
    atmosphere.addColorStop(0, "rgba(79,110,93,.105)");
    atmosphere.addColorStop(0.48, "rgba(31,54,68,.055)");
    atmosphere.addColorStop(1, "rgba(8,10,14,0)");
    context.fillStyle = atmosphere;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.fillStyle = "rgba(217,215,164,.12)";
    for (let x = 22; x < viewport.width; x += 44) {
      for (let y = 22; y < viewport.height; y += 44) {
        context.fillRect(x, y, 0.75, 0.75);
      }
    }

    context.save();
    context.translate(pan.x, pan.y);
    context.scale(zoom, zoom);

    const emphasisId = hoveredId ?? (selectedId !== graph?.focusNodeId ? selectedId : null);
    const activeNodes = new Set<string>();
    if (emphasisId) {
      activeNodes.add(emphasisId);
      for (const neighbor of neighbors.get(emphasisId) ?? []) activeNodes.add(neighbor);
    }

    for (const edge of graph?.edges ?? []) {
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      const connectedToEmphasis =
        !emphasisId || edge.sourceNodeId === emphasisId || edge.targetNodeId === emphasisId;
      const color = relationColor(edge.relationType);
      context.globalAlpha = emphasisId ? (connectedToEmphasis ? 0.9 : 0.075) : 0.35;
      context.strokeStyle = color;
      context.lineWidth = (connectedToEmphasis && emphasisId ? 1.8 : 0.85) / zoom;
      context.beginPath();
      context.moveTo(source.x, source.y);
      if (layout === "tree") {
        const middleY = source.y + (target.y - source.y) * 0.52;
        context.bezierCurveTo(source.x, middleY, target.x, middleY, target.x, target.y);
      } else {
        const curve = edgeCurve(source, target, edge);
        context.quadraticCurveTo(curve.x, curve.y, target.x, target.y);
      }
      context.stroke();

      if (edge.direction === "directed" && (connectedToEmphasis || !emphasisId)) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const targetRadius = 7 + Math.min(8, Math.sqrt(degree.get(edge.targetNodeId) ?? 1) * 1.6);
        const x = target.x - Math.cos(angle) * (targetRadius + 3);
        const y = target.y - Math.sin(angle) * (targetRadius + 3);
        const size = 5.2 / Math.sqrt(Math.max(zoom, 0.4));
        context.fillStyle = color;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(
          x - Math.cos(angle - Math.PI / 6) * size,
          y - Math.sin(angle - Math.PI / 6) * size,
        );
        context.lineTo(
          x - Math.cos(angle + Math.PI / 6) * size,
          y - Math.sin(angle + Math.PI / 6) * size,
        );
        context.closePath();
        context.fill();
      }

      if (emphasisId && connectedToEmphasis && zoom > 0.9 && edge.label) {
        const x = (source.x + target.x) / 2;
        const y = (source.y + target.y) / 2;
        context.globalAlpha = 0.8;
        context.fillStyle = "#9a9793";
        context.font = `${9.5 / zoom}px Inter, system-ui`;
        context.textAlign = "center";
        context.textBaseline = "bottom";
        context.fillText(edge.label.slice(0, 28), x, y - 4 / zoom);
      }
    }

    for (const node of graph?.nodes ?? []) {
      const point = positions.get(node.id);
      if (!point) continue;
      const nodeDegree = degree.get(node.id) ?? 0;
      const focus = node.id === graph?.focusNodeId;
      const selected = node.id === selectedId;
      const hovered = node.id === hoveredId;
      const active = !emphasisId || activeNodes.has(node.id);
      const color = nodeColor(node.nodeType);
      const radius = focus ? 18 : 6.5 + Math.min(9.5, Math.sqrt(Math.max(1, nodeDegree)) * 1.75);
      context.globalAlpha = active ? 1 : 0.14;

      if (selected || hovered || focus) {
        context.shadowColor = color;
        context.shadowBlur = (selected ? 18 : hovered ? 13 : 8) / Math.max(zoom, 0.65);
      }
      context.fillStyle = color;
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = selected
        ? "#f2eec8"
        : hovered
          ? "rgba(242,238,200,.82)"
          : focus
            ? "rgba(217,215,164,.72)"
            : "rgba(255,255,255,.26)";
      context.lineWidth = (selected ? 2.4 : hovered || focus ? 1.7 : 0.8) / zoom;
      context.stroke();

      if (focus) {
        context.strokeStyle = "rgba(217,215,164,.22)";
        context.lineWidth = 1 / zoom;
        context.beginPath();
        context.arc(point.x, point.y, radius + 7 / zoom, 0, Math.PI * 2);
        context.stroke();
      }

      const shouldLabel =
        selected ||
        hovered ||
        focus ||
        nodeDegree >= 6 ||
        (zoom >= 1.05 && node.depth <= 1) ||
        (zoom >= 1.45 && active);
      if (shouldLabel) {
        const maxLength = selected || hovered || focus ? 42 : 28;
        const label = node.title.length > maxLength ? `${node.title.slice(0, maxLength - 1)}…` : node.title;
        const fontSize = (selected || focus ? 12.5 : 10.5) / Math.max(zoom, 0.68);
        context.font = `${selected || focus ? 650 : 540} ${fontSize}px Inter, system-ui`;
        context.textAlign = "center";
        context.textBaseline = "top";
        const textWidth = context.measureText(label).width;
        const labelY = point.y + radius + 6 / zoom;
        context.fillStyle = active ? "rgba(8,10,14,.9)" : "rgba(8,10,14,.55)";
        context.fillRect(
          point.x - textWidth / 2 - 4 / zoom,
          labelY - 2 / zoom,
          textWidth + 8 / zoom,
          fontSize + 5 / zoom,
        );
        context.fillStyle = selected || focus ? "#f2eec8" : "#e9e3d5";
        context.fillText(label, point.x, labelY);
      }
    }

    context.globalAlpha = 1;
    context.restore();
  }, [degree, graph, hoveredId, layout, neighbors, pan.x, pan.y, positions, selectedId, viewport.height, viewport.width, zoom]);

  const hitNode = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !graph) return null;
      const x = (clientX - rect.left - pan.x) / zoom;
      const y = (clientY - rect.top - pan.y) / zoom;
      for (let index = graph.nodes.length - 1; index >= 0; index -= 1) {
        const node = graph.nodes[index];
        const point = positions.get(node.id);
        if (!point) continue;
        const radius =
          (node.id === graph.focusNodeId ? 21 : 10 + Math.min(10, Math.sqrt(degree.get(node.id) ?? 1) * 1.8)) +
          4 / Math.max(zoom, 0.5);
        if (Math.hypot(x - point.x, y - point.y) <= radius) return node.id;
      }
      return null;
    },
    [degree, graph, pan.x, pan.y, positions, zoom],
  );

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { active: true, moved: false, x: event.clientX, y: event.clientY };
    event.currentTarget.style.cursor = "grabbing";
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.active) {
      const hit = hitNode(event.clientX, event.clientY);
      setHoveredId(hit);
      event.currentTarget.style.cursor = hit ? "pointer" : "grab";
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const moved = dragRef.current.moved;
    dragRef.current.active = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const hit = hitNode(event.clientX, event.clientY);
    setHoveredId(hit);
    event.currentTarget.style.cursor = hit ? "pointer" : "grab";
    if (!moved && hit) setSelectedId(hit);
  };

  const wheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = { x: (pointer.x - pan.x) / zoom, y: (pointer.y - pan.y) / zoom };
    const nextZoom = Math.min(2.8, Math.max(0.24, zoom * Math.exp(-event.deltaY * 0.0012)));
    setPan({ x: pointer.x - world.x * nextZoom, y: pointer.y - world.y * nextZoom });
    setZoom(nextZoom);
  };

  const orderedNodes = useMemo(
    () =>
      [...(graph?.nodes ?? [])].sort(
        (left, right) =>
          (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0) ||
          left.depth - right.depth ||
          left.title.localeCompare(right.title, "pt-BR"),
      ),
    [degree, graph?.nodes],
  );

  const keyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const currentIndex = orderedNodes.findIndex((node) => node.id === selectedId);
    const move = (offset: number) => {
      if (!orderedNodes.length) return;
      const index = currentIndex < 0 ? 0 : (currentIndex + offset + orderedNodes.length) % orderedNodes.length;
      setSelectedId(orderedNodes[index].id);
    };
    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      move(1);
    } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Enter" && selectedNode) {
      event.preventDefault();
      onOpenNode(selectedNode.id);
    } else if (event.key === "0") {
      event.preventDefault();
      fitGraph();
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((current) => Math.min(2.8, current * 1.2));
    } else if (event.key === "-") {
      event.preventDefault();
      setZoom((current) => Math.max(0.24, current / 1.2));
    }
  };

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return [];
    return (graph?.nodes ?? [])
      .filter((node) => node.title.toLocaleLowerCase("pt-BR").includes(normalized))
      .sort((left, right) => (degree.get(right.id) ?? 0) - (degree.get(left.id) ?? 0))
      .slice(0, 10);
  }, [degree, graph?.nodes, query]);

  const density = graph?.nodes.length
    ? ((graph.edges.length * 2) / Math.max(1, graph.nodes.length)).toFixed(1)
    : "0.0";

  return (
    <div className="tadeon-knowledge-graph grid min-h-[640px] gap-3 xl:grid-cols-[minmax(0,1fr)_310px]">
      <div className="tadeon-graph-canvas relative min-h-[560px] overflow-hidden rounded-xl border bg-[#080a0e]">
        <canvas
          ref={canvasRef}
          className="h-full min-h-[560px] w-full cursor-grab touch-none active:cursor-grabbing"
          data-layout={layout}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={(event) => {
            dragRef.current.active = false;
            event.currentTarget.style.cursor = "grab";
          }}
          onPointerLeave={(event) => {
            if (!dragRef.current.active) {
              setHoveredId(null);
              event.currentTarget.style.cursor = "grab";
            }
          }}
          onDoubleClick={(event) => {
            const hit = hitNode(event.clientX, event.clientY);
            if (hit) onOpenNode(hit);
          }}
          onWheel={wheel}
          onKeyDown={keyDown}
          aria-label={`${layout === "tree" ? "Árvore" : "Teia"} local interativa de O Nexus`}
          aria-describedby="nexus-graph-help"
          tabIndex={0}
        />

        <div className="tadeon-graph-toolbar absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] gap-1 overflow-x-auto rounded-lg border bg-background/94 p-1 shadow-xl">
          <div className="tadeon-graph-layout-switch" role="group" aria-label="Organização visual">
            <Button size="sm" variant="ghost" onClick={() => setLayout("web")} aria-pressed={layout === "web"}>
              <Network className="h-4 w-4" />
              Teia
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLayout("tree")} aria-pressed={layout === "tree"}>
              <Workflow className="h-4 w-4" />
              Árvore
            </Button>
          </div>
          <span className="tadeon-graph-toolbar__divider" aria-hidden="true" />
          <Button size="icon" variant="ghost" onClick={() => setZoom((current) => Math.min(2.8, current * 1.2))} aria-label="Aproximar">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom((current) => Math.max(0.24, current / 1.2))} aria-label="Afastar">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={fitGraph} aria-label="Ajustar grafo">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded-md border bg-background/92 px-2 py-1">{graph?.nodes.length ?? 0} nós</span>
          <span className="rounded-md border bg-background/92 px-2 py-1">{graph?.edges.length ?? 0} relações</span>
          <span className="rounded-md border bg-background/92 px-2 py-1">grau médio {density}</span>
          {graph?.truncated && <span className="rounded-md border border-primary/25 bg-background/92 px-2 py-1 text-primary">recorte ativo</span>}
        </div>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 shadow-xl">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Tecendo relações…</span>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 bottom-14 rounded-lg border border-destructive/40 bg-background/96 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <aside className="tadeon-graph-inspector min-h-0 space-y-3 overflow-y-auto rounded-xl border bg-card/55 p-3">
        <div>
          <p className="tadeon-eyebrow flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {layout === "tree" ? "Árvore local" : "Teia local"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            A escala do nó acompanha seu número de conexões. Passe o cursor para isolar uma vizinhança.
          </p>
          <p id="nexus-graph-help" className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
            Arraste para mover, use a roda para zoom, duplo clique abre. Setas percorrem nós, Enter abre e 0 reenquadra.
          </p>
        </div>

        <div className="tadeon-graph-legend" aria-label="Legenda de categorias">
          {CATEGORY_LEGEND.map(([color, label]) => (
            <span key={label}>
              <i style={{ backgroundColor: color }} aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na teia carregada…" className="pl-9" />
        </div>
        {matches.length > 0 && (
          <div className="tadeon-graph-matches space-y-1 rounded-lg border p-1">
            {matches.map((node) => (
              <button
                type="button"
                key={node.id}
                onClick={() => {
                  setSelectedId(node.id);
                  setQuery("");
                  const point = positions.get(node.id);
                  if (point) {
                    setPan({ x: viewport.width / 2 - point.x * zoom, y: viewport.height / 2 - point.y * zoom });
                  }
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/55"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: nodeColor(node.nodeType) }} />
                <span className="min-w-0 flex-1 truncate">{node.title}</span>
                <span className="text-[9px] text-muted-foreground">{degree.get(node.id) ?? 0}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Select value={String(depth)} onValueChange={(value) => setDepth(value === "1" ? 1 : 2)}>
            <SelectTrigger aria-label="Profundidade"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 nível</SelectItem>
              <SelectItem value="2">2 níveis</SelectItem>
            </SelectContent>
          </Select>
          <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger aria-label="Limite de nós"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="80">80 nós</SelectItem>
              <SelectItem value="140">140 nós</SelectItem>
              <SelectItem value="200">200 nós</SelectItem>
              <SelectItem value="250">250 nós</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Select value={nodeType} onValueChange={(value) => setNodeType(value as KnowledgeNodeType | "all")}>
          <SelectTrigger aria-label="Filtrar tipo de nó"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {KNOWLEDGE_NODE_TYPES.map((type) => <SelectItem key={type} value={type}>{typeLabel(type)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={relationType} onValueChange={(value) => setRelationType(value as RelationType | "all")}>
          <SelectTrigger aria-label="Filtrar relação"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as relações</SelectItem>
            {RELATION_TYPES.map((type) => <SelectItem key={type} value={type}>{type.replaceAll("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={(value) => setVisibility(value as KnowledgeVisibility | "all")}>
          <SelectTrigger aria-label="Filtrar visibilidade"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda visibilidade</SelectItem>
            {KNOWLEDGE_VISIBILITIES.map((item) => <SelectItem key={item} value={item}>{item.replaceAll("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        {selectedNode && (
          <div className="tadeon-graph-selection rounded-xl border bg-background/35 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: nodeColor(selectedNode.nodeType) }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-snug">{selectedNode.title}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {typeLabel(selectedNode.nodeType)} · {degree.get(selectedNode.id) ?? 0} conexões · nível {selectedNode.depth}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => { setGraphFocusId(selectedNode.id); setSelectedId(selectedNode.id); }}>
                <Focus className="h-3.5 w-3.5" />
                Focar
              </Button>
              <Button size="sm" onClick={() => onOpenNode(selectedNode.id)}>
                <Crosshair className="h-3.5 w-3.5" />
                Abrir
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
