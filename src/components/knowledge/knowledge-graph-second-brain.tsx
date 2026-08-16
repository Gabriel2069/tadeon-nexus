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
  BrainCircuit,
  Check,
  Crosshair,
  Focus,
  Link2,
  Loader2,
  Maximize2,
  Minimize2,
  Network,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Tags,
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
import { KnowledgeServiceError } from "@/lib/knowledge/knowledge-errors";
import {
  buildKnowledgeGraph,
  computeKnowledgeForceLayout,
  type KnowledgeForceOptions,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type KnowledgeGraphPoint,
  type KnowledgeGraphSignalKind,
} from "@/lib/knowledge/knowledge-graph-memory";
import {
  knowledgeGraphService,
  type KnowledgeLocalGraph,
  type KnowledgeMemoryPayload,
} from "@/lib/knowledge/knowledge-graph-service";
import {
  KNOWLEDGE_NODE_TYPES,
  KNOWLEDGE_VISIBILITIES,
  RELATION_TYPES,
  type KnowledgeNodeType,
  type KnowledgeVisibility,
  type RelationType,
} from "@/lib/nexus-contracts";
import "@/styles/nexus-second-brain.css";

interface KnowledgeGraphProps {
  workspaceId: string;
  campaignId: string | null;
  focusNodeId: string;
  onOpenNode: (nodeId: string) => void;
}

type GraphLayout = "force" | "tree";
type GraphMode = "local" | "global";

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
  terrain: "Terreno",
  tectonic_plate: "Placa tectônica",
  historical_event: "Evento",
  plot: "Trama",
  clue: "Pista",
  session: "Sessão",
  fragment: "Fragmento",
  transcendental_ability: "Habilidade",
  weapon: "Arma",
  object: "Objeto",
  document: "Documento",
  map: "Mapa",
  campaign: "Campanha",
  free_note: "Nota livre",
};

const SIGNAL_LABELS: Record<KnowledgeGraphSignalKind, string> = {
  explicit: "Relação escrita",
  mention: "Menção / backlink",
  hierarchy: "Hierarquia",
  semantic: "Afinidade de conteúdo",
};

function typeLabel(type: KnowledgeNodeType) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function nodeColor(type: KnowledgeNodeType) {
  if (["character", "npc", "creature", "people"].includes(type)) return "#d9d7a4";
  if (["region", "city", "location", "river", "sea", "terrain", "tectonic_plate", "kingdom"].includes(type)) {
    return "#5f836e";
  }
  if (["plot", "clue", "historical_event", "session"].includes(type)) return "#8a7995";
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) return "#923640";
  if (["organization", "religion", "culture", "language"].includes(type)) return "#b7814d";
  if (["rule", "concept", "document", "free_note"].includes(type)) return "#547b94";
  return "#65849a";
}

function edgeColor(edge: KnowledgeGraphEdge) {
  if (edge.kinds.includes("explicit")) return "104, 143, 165";
  if (edge.kinds.includes("hierarchy")) return "183, 129, 77";
  if (edge.kinds.includes("mention")) return "92, 145, 122";
  return "139, 112, 165";
}

function graphError(error: unknown) {
  return error instanceof KnowledgeServiceError
    ? error.userMessage
    : "Não foi possível carregar a memória conectada de O Nexus.";
}

function nodeRadius(node: KnowledgeGraphNode) {
  return 9 + node.importance * 15 + (node.depth === 0 ? 3 : 0);
}

function treePositions(graph: KnowledgeLocalGraph) {
  const positions = new Map<string, KnowledgeGraphPoint>();
  const depths = new Map<number, KnowledgeGraphNode[]>();
  for (const node of graph.nodes) {
    const depth = node.depth >= 99 ? 5 : node.depth;
    depths.set(depth, [...(depths.get(depth) ?? []), node]);
  }
  const orderedDepths = [...depths.keys()].sort((left, right) => left - right);
  for (const depth of orderedDepths) {
    const nodes = [...(depths.get(depth) ?? [])].sort(
      (left, right) => right.importance - left.importance || left.title.localeCompare(right.title, "pt-BR"),
    );
    const perRow = depth === 0 ? 1 : Math.min(depth <= 2 ? 8 : 10, Math.max(1, nodes.length));
    const rows = Math.ceil(nodes.length / perRow);
    nodes.forEach((node, index) => {
      const row = Math.floor(index / perRow);
      const rowStart = row * perRow;
      const rowLength = Math.min(perRow, nodes.length - rowStart);
      const column = index - rowStart;
      positions.set(node.id, {
        x: (column - (rowLength - 1) / 2) * (depth <= 2 ? 156 : 128),
        y: depth * 190 + (row - (rows - 1) / 2) * 76,
      });
    });
  }
  return positions;
}

function connectionIds(graph: KnowledgeLocalGraph, nodeId: string | null) {
  if (!nodeId) return new Set<string>();
  const ids = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.sourceNodeId === nodeId) ids.add(edge.targetNodeId);
    if (edge.targetNodeId === nodeId) ids.add(edge.sourceNodeId);
  }
  return ids;
}

function strengthLabel(strength: number) {
  if (strength >= 0.82) return "muito forte";
  if (strength >= 0.64) return "forte";
  if (strength >= 0.44) return "moderada";
  return "sutil";
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  display?: string;
}) {
  return (
    <label className="tadeon-brain-slider">
      <span>{label}<strong>{display ?? value.toFixed(2)}</strong></span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export function KnowledgeGraph({
  workspaceId,
  campaignId,
  focusNodeId,
  onOpenNode,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    mode: "pan" | "node";
    nodeId: string | null;
    x: number;
    y: number;
    pan: KnowledgeGraphPoint;
  }>({ active: false, moved: false, mode: "pan", nodeId: null, x: 0, y: 0, pan: { x: 0, y: 0 } });

  const [graphFocusId, setGraphFocusId] = useState(focusNodeId);
  const [memory, setMemory] = useState<KnowledgeMemoryPayload | null>(null);
  const [selectedId, setSelectedId] = useState(focusNodeId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<GraphMode>("local");
  const [depth, setDepth] = useState(2);
  const [limit, setLimit] = useState(220);
  const [nodeType, setNodeType] = useState<KnowledgeNodeType | "all">("all");
  const [relationType, setRelationType] = useState<RelationType | "all">("all");
  const [visibility, setVisibility] = useState<KnowledgeVisibility | "all">("all");
  const [layout, setLayout] = useState<GraphLayout>("force");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState({ width: 900, height: 560 });
  const [pan, setPan] = useState<KnowledgeGraphPoint>({ x: 450, y: 280 });
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [includeExplicit, setIncludeExplicit] = useState(true);
  const [includeMentions, setIncludeMentions] = useState(true);
  const [includeHierarchy, setIncludeHierarchy] = useState(true);
  const [includeSemantic, setIncludeSemantic] = useState(true);
  const [semanticThreshold, setSemanticThreshold] = useState(0.22);
  const [minimumStrength, setMinimumStrength] = useState(0.12);
  const [labelZoom, setLabelZoom] = useState(0.62);
  const [showArrows, setShowArrows] = useState(true);
  const [pinnedPositions, setPinnedPositions] = useState<Record<string, KnowledgeGraphPoint>>({});
  const [forceOptions, setForceOptions] = useState<KnowledgeForceOptions>({
    linkDistance: 138,
    linkStrength: 1,
    repelStrength: 1,
    centerStrength: 0.9,
    clusterStrength: 0.5,
  });

  useEffect(() => {
    setGraphFocusId(focusNodeId);
    setSelectedId(focusNodeId);
  }, [focusNodeId]);

  useEffect(() => {
    if (!expanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setExpanded(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const loadMemory = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await knowledgeGraphService.loadMemory({
        workspaceId,
        focusNodeId: graphFocusId,
        campaignId,
        includeWorkspace: true,
        candidateLimit: 500,
        nodeTypes: nodeType === "all" ? undefined : [nodeType],
        relationTypes: relationType === "all" ? undefined : [relationType],
        visibilities: visibility === "all" ? undefined : [visibility],
      });
      setMemory(result);
      setSelectedId((current) => result.nodes.some((node) => node.id === current) ? current : result.focusNodeId);
    } catch (nextError) {
      setMemory(null);
      setError(graphError(nextError));
    } finally {
      setLoading(false);
    }
  }, [campaignId, graphFocusId, nodeType, relationType, visibility, workspaceId]);

  useEffect(() => void loadMemory(), [loadMemory]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.max(320, Math.round(entry.contentRect.width));
      const height = Math.max(420, Math.round(entry.contentRect.height));
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      setViewport({ width, height });
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const filteredMemory = useMemo(() => {
    if (!memory) return null;
    return {
      ...memory,
      signals: memory.signals.filter((signal) => {
        if (signal.kind === "explicit") return includeExplicit;
        if (signal.kind === "mention") return includeMentions;
        if (signal.kind === "hierarchy") return includeHierarchy;
        return true;
      }),
    };
  }, [includeExplicit, includeHierarchy, includeMentions, memory]);

  const graph = useMemo(() => {
    if (!filteredMemory) return null;
    return buildKnowledgeGraph(filteredMemory, {
      mode,
      depth,
      limit,
      includeSemantic,
      semanticThreshold,
      semanticNeighbors: mode === "global" ? 4 : 6,
      minimumStrength,
    });
  }, [depth, filteredMemory, includeSemantic, limit, minimumStrength, mode, semanticThreshold]);

  const basePositions = useMemo(() => {
    if (!graph) return new Map<string, KnowledgeGraphPoint>();
    return layout === "tree"
      ? treePositions(graph)
      : computeKnowledgeForceLayout(graph, {
          ...forceOptions,
          iterations: graph.nodes.length > 300 ? 72 : graph.nodes.length > 180 ? 88 : 108,
        });
  }, [forceOptions, graph, layout]);

  const positions = useMemo(() => {
    const next = new Map(basePositions);
    for (const [id, point] of Object.entries(pinnedPositions)) {
      if (next.has(id)) next.set(id, point);
    }
    return next;
  }, [basePositions, pinnedPositions]);

  const selectedNode = useMemo(
    () => graph?.nodes.find((node) => node.id === selectedId) ?? null,
    [graph, selectedId],
  );
  const activeId = hoveredId ?? selectedId;
  const activeConnections = useMemo(
    () => graph ? connectionIds(graph, activeId) : new Set<string>(),
    [activeId, graph],
  );

  const fitGraph = useCallback(() => {
    if (!graph || !graph.nodes.length || !positions.size) return;
    const points = graph.nodes.map((node) => positions.get(node.id)).filter((point): point is KnowledgeGraphPoint => Boolean(point));
    if (!points.length) return;
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const width = Math.max(120, maxX - minX + 140);
    const height = Math.max(120, maxY - minY + 140);
    const nextZoom = Math.min(1.55, Math.max(0.24, Math.min((viewport.width - 40) / width, (viewport.height - 40) / height)));
    setZoom(nextZoom);
    setPan({
      x: viewport.width / 2 - ((minX + maxX) / 2) * nextZoom,
      y: viewport.height / 2 - ((minY + maxY) / 2) * nextZoom,
    });
  }, [graph, positions, viewport.height, viewport.width]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(fitGraph);
    return () => window.cancelAnimationFrame(frame);
  }, [fitGraph, layout, mode, expanded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !graph) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);

    const gradient = context.createRadialGradient(
      viewport.width * 0.5,
      viewport.height * 0.45,
      20,
      viewport.width * 0.5,
      viewport.height * 0.45,
      Math.max(viewport.width, viewport.height) * 0.7,
    );
    gradient.addColorStop(0, "rgba(35, 48, 60, 0.28)");
    gradient.addColorStop(0.62, "rgba(12, 17, 22, 0.1)");
    gradient.addColorStop(1, "rgba(5, 8, 11, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.save();
    context.translate(pan.x, pan.y);
    context.scale(zoom, zoom);

    for (const edge of [...graph.edges].sort((left, right) => left.strength - right.strength)) {
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      const active = edge.sourceNodeId === activeId || edge.targetNodeId === activeId;
      const contextual = !activeId || activeConnections.has(edge.sourceNodeId) && activeConnections.has(edge.targetNodeId);
      const rgb = edgeColor(edge);
      const alpha = active ? 0.92 : contextual ? 0.12 + edge.strength * 0.5 : 0.035;
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
      context.lineWidth = (active ? 1.6 : 0.55) + edge.strength * (active ? 2.7 : 1.9);
      context.strokeStyle = `rgba(${rgb}, ${alpha})`;
      if (!active && edge.kinds.length === 1 && edge.kinds[0] === "semantic") context.setLineDash([5, 7]);
      else if (!active && edge.kinds.length === 1 && edge.kinds[0] === "mention") context.setLineDash([2, 5]);
      else context.setLineDash([]);
      context.stroke();
      context.setLineDash([]);

      if (showArrows && edge.direction === "directed" && !edge.kinds.every((kind) => kind === "semantic")) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const targetNode = graph.nodes.find((node) => node.id === edge.targetNodeId);
        const offset = targetNode ? nodeRadius(targetNode) + 4 : 17;
        const tipX = target.x - Math.cos(angle) * offset;
        const tipY = target.y - Math.sin(angle) * offset;
        context.beginPath();
        context.moveTo(tipX, tipY);
        context.lineTo(tipX - Math.cos(angle - 0.55) * 8, tipY - Math.sin(angle - 0.55) * 8);
        context.lineTo(tipX - Math.cos(angle + 0.55) * 8, tipY - Math.sin(angle + 0.55) * 8);
        context.closePath();
        context.fillStyle = `rgba(${rgb}, ${active ? 0.86 : alpha + 0.08})`;
        context.fill();
      }

      if (active && zoom >= 0.55) {
        const x = (source.x + target.x) / 2;
        const y = (source.y + target.y) / 2;
        const label = `${edge.label} · ${Math.round(edge.strength * 100)}%`;
        context.font = "600 10px ui-sans-serif, system-ui";
        const width = context.measureText(label).width + 12;
        context.fillStyle = "rgba(8, 12, 16, 0.88)";
        context.fillRect(x - width / 2, y - 11, width, 18);
        context.fillStyle = "rgba(231, 235, 239, 0.9)";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(label, x, y - 2);
      }
    }

    for (const node of graph.nodes) {
      const point = positions.get(node.id);
      if (!point) continue;
      const radius = nodeRadius(node);
      const active = node.id === activeId;
      const selected = node.id === selectedId;
      const connected = !activeId || activeConnections.has(node.id);
      context.save();
      context.globalAlpha = connected ? 1 : 0.22;
      context.shadowBlur = active || selected ? 22 : 8 + node.importance * 8;
      context.shadowColor = nodeColor(node.nodeType);
      context.beginPath();
      context.arc(point.x, point.y, radius, 0, Math.PI * 2);
      context.fillStyle = nodeColor(node.nodeType);
      context.fill();
      context.shadowBlur = 0;
      context.beginPath();
      context.arc(point.x, point.y, radius + (selected ? 4 : 2), 0, Math.PI * 2);
      context.lineWidth = selected ? 2.3 : active ? 1.7 : 1;
      context.strokeStyle = selected
        ? "rgba(245, 243, 220, 0.95)"
        : active
          ? "rgba(255,255,255,0.78)"
          : `rgba(255,255,255,${0.12 + node.importance * 0.18})`;
      context.stroke();
      if (node.id === graph.focusNodeId) {
        context.beginPath();
        context.arc(point.x, point.y, radius + 8, 0, Math.PI * 2);
        context.lineWidth = 1;
        context.strokeStyle = "rgba(217, 215, 164, 0.38)";
        context.stroke();
      }

      const shouldLabel =
        selected ||
        active ||
        node.id === graph.focusNodeId ||
        (zoom >= labelZoom && (node.importance >= 0.18 || graph.nodes.length <= 80));
      if (shouldLabel) {
        const fontSize = Math.max(9, Math.min(14, 9.5 + node.importance * 4.2));
        context.font = `${node.importance > 0.62 ? 700 : 600} ${fontSize}px ui-sans-serif, system-ui`;
        context.textAlign = "center";
        context.textBaseline = "top";
        context.lineWidth = 3.5;
        context.strokeStyle = "rgba(5, 8, 11, 0.92)";
        context.strokeText(node.title, point.x, point.y + radius + 7);
        context.fillStyle = connected ? "rgba(236, 238, 239, 0.92)" : "rgba(236, 238, 239, 0.42)";
        context.fillText(node.title, point.x, point.y + radius + 7);
      }
      context.restore();
    }
    context.restore();
  }, [activeConnections, activeId, graph, labelZoom, pan, positions, selectedId, showArrows, viewport.height, viewport.width, zoom]);

  const clientToWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [pan.x, pan.y, zoom]);

  const hitNode = useCallback((clientX: number, clientY: number) => {
    if (!graph) return null;
    const world = clientToWorld(clientX, clientY);
    if (!world) return null;
    return [...graph.nodes]
      .sort((left, right) => right.importance - left.importance)
      .find((node) => {
        const point = positions.get(node.id);
        if (!point) return false;
        return Math.hypot(world.x - point.x, world.y - point.y) <= nodeRadius(node) + 7 / zoom;
      })?.id ?? null;
  }, [clientToWorld, graph, positions, zoom]);

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const nodeId = hitNode(event.clientX, event.clientY);
    dragRef.current = {
      active: true,
      moved: false,
      mode: nodeId ? "node" : "pan",
      nodeId,
      x: event.clientX,
      y: event.clientY,
      pan,
    };
    if (nodeId) setSelectedId(nodeId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = nodeId ? "grabbing" : "grabbing";
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.active) {
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      if (Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
      if (dragRef.current.mode === "pan") {
        setPan({ x: dragRef.current.pan.x + dx, y: dragRef.current.pan.y + dy });
      } else if (dragRef.current.nodeId) {
        const point = clientToWorld(event.clientX, event.clientY);
        if (point) {
          const nodeId = dragRef.current.nodeId;
          setPinnedPositions((current) => ({ ...current, [nodeId]: point }));
        }
      }
      return;
    }
    setHoveredId(hitNode(event.clientX, event.clientY));
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const state = dragRef.current;
    dragRef.current.active = false;
    if (!state.moved && state.nodeId) setSelectedId(state.nodeId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    event.currentTarget.style.cursor = "grab";
  };

  const wheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const world = { x: (pointer.x - pan.x) / zoom, y: (pointer.y - pan.y) / zoom };
    const nextZoom = Math.min(3, Math.max(0.18, zoom * Math.exp(-event.deltaY * 0.0012)));
    setPan({ x: pointer.x - world.x * nextZoom, y: pointer.y - world.y * nextZoom });
    setZoom(nextZoom);
  };

  const orderedNodes = useMemo(
    () => [...(graph?.nodes ?? [])].sort((left, right) => right.importance - left.importance || left.title.localeCompare(right.title, "pt-BR")),
    [graph?.nodes],
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
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((current) => Math.min(3, current * 1.2));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom((current) => Math.max(0.18, current / 1.2));
    } else if (event.key === "0") {
      event.preventDefault();
      fitGraph();
    }
  };

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized || !graph) return [];
    return graph.nodes
      .filter((node) => [node.title, node.summary, ...node.tags].join(" ").toLocaleLowerCase("pt-BR").includes(normalized))
      .sort((left, right) => right.importance - left.importance)
      .slice(0, 10);
  }, [graph, query]);

  const selectedEdges = useMemo(() => {
    if (!graph || !selectedNode) return [];
    return graph.edges
      .filter((edge) => edge.sourceNodeId === selectedNode.id || edge.targetNodeId === selectedNode.id)
      .sort((left, right) => right.strength - left.strength)
      .slice(0, 8)
      .map((edge) => ({
        edge,
        node: graph.nodes.find((node) => node.id === (edge.sourceNodeId === selectedNode.id ? edge.targetNodeId : edge.sourceNodeId)) ?? null,
      }))
      .filter((entry): entry is { edge: KnowledgeGraphEdge; node: KnowledgeGraphNode } => Boolean(entry.node));
  }, [graph, selectedNode]);

  if (!focusNodeId) {
    return <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Abra uma página para iniciar o grafo.</div>;
  }

  return (
    <div
      data-expanded={expanded ? "true" : "false"}
      className={expanded
        ? "tadeon-knowledge-graph tadeon-second-brain fixed inset-2 z-[220] min-h-0 overflow-hidden rounded-2xl border bg-background p-2 shadow-2xl sm:inset-4"
        : "tadeon-knowledge-graph tadeon-second-brain grid min-h-[650px] gap-3 lg:grid-cols-[minmax(0,1fr)_330px]"}
    >
      <div className={expanded
        ? "tadeon-graph-canvas relative h-full min-h-0 overflow-hidden rounded-xl border bg-[#070a0e]"
        : "tadeon-graph-canvas relative min-h-[570px] overflow-hidden rounded-xl border bg-[#070a0e]"}
      >
        <canvas
          ref={canvasRef}
          className={expanded
            ? "h-full min-h-0 w-full cursor-grab touch-none active:cursor-grabbing"
            : "h-full min-h-[570px] w-full cursor-grab touch-none active:cursor-grabbing"}
          data-layout={layout}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          onPointerLeave={() => {
            if (!dragRef.current.active) setHoveredId(null);
          }}
          onDoubleClick={(event) => {
            const hit = hitNode(event.clientX, event.clientY);
            if (hit) onOpenNode(hit);
          }}
          onWheel={wheel}
          onKeyDown={keyDown}
          aria-label={`${layout === "tree" ? "Árvore" : "Teia ponderada"} de O Nexus`}
          aria-describedby="nexus-graph-help"
          tabIndex={0}
        />

        <div className="tadeon-brain-toolbar absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded-xl border p-1.5">
          <div className="tadeon-graph-layout-switch" role="group" aria-label="Organização visual">
            <Button size="sm" variant="ghost" onClick={() => setLayout("force")} aria-pressed={layout === "force"}>
              <Network className="h-4 w-4" /> Teia
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setLayout("tree")} aria-pressed={layout === "tree"}>
              <Workflow className="h-4 w-4" /> Árvore
            </Button>
          </div>
          <span className="tadeon-graph-toolbar__divider" aria-hidden="true" />
          <Button size="icon" variant="ghost" onClick={() => setZoom((current) => Math.min(3, current * 1.2))} aria-label="Aproximar"><ZoomIn className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setZoom((current) => Math.max(0.18, current / 1.2))} aria-label="Afastar"><ZoomOut className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={fitGraph} aria-label="Reenquadrar grafo"><Focus className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={() => setPinnedPositions({})} aria-label="Soltar nós fixados" title="Soltar nós fixados"><RefreshCw className="h-4 w-4" /></Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setExpanded((current) => !current)}
            aria-label={expanded ? "Reduzir grafo" : "Ampliar grafo"}
            aria-pressed={expanded}
            title={expanded ? "Voltar ao painel" : "Ampliar grafo"}
          >
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        <div className="tadeon-brain-mode absolute bottom-3 left-3 flex overflow-hidden rounded-xl border">
          <button type="button" data-active={mode === "local"} onClick={() => setMode("local")}><Crosshair /> Vizinhança</button>
          <button type="button" data-active={mode === "global"} onClick={() => setMode("global")}><BrainCircuit /> Todo o Nexus</button>
        </div>

        {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-sm"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>}
        {error && <div className="absolute inset-x-4 bottom-16 rounded-lg border border-destructive/40 bg-destructive/15 p-3 text-sm text-destructive">{error}</div>}
        {graph?.truncated && <div className="absolute bottom-14 right-3 rounded-lg border bg-background/90 px-2.5 py-1.5 text-[10px] text-muted-foreground">Limite visual atingido; aumente o limite ou refine filtros.</div>}
      </div>

      {!expanded && (
        <aside className="tadeon-brain-inspector overflow-y-auto rounded-xl border p-3">
          <div className="tadeon-brain-heading">
            <span><BrainCircuit /></span>
            <div>
              <p className="tadeon-eyebrow">Segundo cérebro</p>
              <strong>{mode === "local" ? "Vizinhança contextual" : "Memória global"}</strong>
              <small>{graph?.nodes.length ?? 0} nós · {graph?.edges.length ?? 0} conexões</small>
            </div>
          </div>
          <p id="nexus-graph-help" className="tadeon-brain-help">Arraste o fundo para navegar. Arraste um nó para fixá-lo. A distância, espessura e tamanho agora refletem importância e força da relação. Duplo clique abre a página.</p>

          <div className="tadeon-brain-signal-legend" aria-label="Fontes das conexões">
            <span data-kind="explicit"><i />Relação</span>
            <span data-kind="mention"><i />Menção</span>
            <span data-kind="hierarchy"><i />Hierarquia</span>
            <span data-kind="semantic"><i />Conteúdo</span>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar título, resumo ou tag…" className="pl-9" />
          </div>
          {matches.length > 0 && (
            <div className="tadeon-brain-matches">
              {matches.map((node) => (
                <button key={node.id} type="button" onClick={() => {
                  setSelectedId(node.id);
                  setQuery("");
                  const point = positions.get(node.id);
                  if (point) setPan({ x: viewport.width / 2 - point.x * zoom, y: viewport.height / 2 - point.y * zoom });
                }}>
                  <span style={{ backgroundColor: nodeColor(node.nodeType) }} />
                  <strong>{node.title}</strong>
                  <small>{Math.round(node.importance * 100)}%</small>
                </button>
              ))}
            </div>
          )}

          <div className="tadeon-brain-filters">
            {mode === "local" && (
              <Select value={String(depth)} onValueChange={(value) => setDepth(Number(value))}>
                <SelectTrigger aria-label="Profundidade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 salto</SelectItem>
                  <SelectItem value="2">2 saltos</SelectItem>
                  <SelectItem value="3">3 saltos</SelectItem>
                  <SelectItem value="4">4 saltos</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
              <SelectTrigger aria-label="Limite de nós"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="120">120 nós</SelectItem>
                <SelectItem value="220">220 nós</SelectItem>
                <SelectItem value="400">400 nós</SelectItem>
                <SelectItem value="500">500 nós</SelectItem>
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
            <SelectTrigger aria-label="Filtrar relação explícita"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as relações escritas</SelectItem>
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

          <div className="tadeon-brain-sources">
            {([
              ["explicit", "Relações", includeExplicit, setIncludeExplicit],
              ["mention", "Menções", includeMentions, setIncludeMentions],
              ["hierarchy", "Hierarquia", includeHierarchy, setIncludeHierarchy],
              ["semantic", "Conteúdo", includeSemantic, setIncludeSemantic],
            ] as const).map(([kind, label, active, setter]) => (
              <button key={kind} type="button" data-active={active} onClick={() => setter(!active)}>
                {active ? <Check /> : <span />}{label}
              </button>
            ))}
          </div>

          <SliderRow label="Força mínima visível" value={minimumStrength} min={0} max={0.7} step={0.02} onChange={setMinimumStrength} display={`${Math.round(minimumStrength * 100)}%`} />
          {includeSemantic && <SliderRow label="Afinidade mínima" value={semanticThreshold} min={0.1} max={0.62} step={0.02} onChange={setSemanticThreshold} display={`${Math.round(semanticThreshold * 100)}%`} />}

          <button type="button" className="tadeon-brain-settings-toggle" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((current) => !current)}><Settings2 /> Física e leitura <span>{settingsOpen ? "−" : "+"}</span></button>
          {settingsOpen && (
            <div className="tadeon-brain-settings">
              <SliderRow label="Força dos vínculos" value={forceOptions.linkStrength} min={0.25} max={2} step={0.05} onChange={(value) => setForceOptions((current) => ({ ...current, linkStrength: value }))} />
              <SliderRow label="Distância-base" value={forceOptions.linkDistance} min={70} max={260} step={5} onChange={(value) => setForceOptions((current) => ({ ...current, linkDistance: value }))} display={`${Math.round(forceOptions.linkDistance)} px`} />
              <SliderRow label="Repulsão" value={forceOptions.repelStrength} min={0.2} max={2.4} step={0.05} onChange={(value) => setForceOptions((current) => ({ ...current, repelStrength: value }))} />
              <SliderRow label="Centro" value={forceOptions.centerStrength} min={0} max={2} step={0.05} onChange={(value) => setForceOptions((current) => ({ ...current, centerStrength: value }))} />
              <SliderRow label="Agrupamento por domínio" value={forceOptions.clusterStrength} min={0} max={2} step={0.05} onChange={(value) => setForceOptions((current) => ({ ...current, clusterStrength: value }))} />
              <SliderRow label="Aparecimento dos rótulos" value={labelZoom} min={0.28} max={1.15} step={0.03} onChange={setLabelZoom} display={`${labelZoom.toFixed(2)}×`} />
              <button type="button" className="tadeon-brain-check" data-active={showArrows} onClick={() => setShowArrows((current) => !current)}>{showArrows && <Check />} Setas em relações direcionais</button>
            </div>
          )}

          {selectedNode && (
            <section className="tadeon-brain-selection">
              <header>
                <span style={{ backgroundColor: nodeColor(selectedNode.nodeType) }} />
                <div><small>{typeLabel(selectedNode.nodeType)}</small><strong>{selectedNode.title}</strong></div>
                <b>{Math.round(selectedNode.importance * 100)}%</b>
              </header>
              {selectedNode.summary && <p>{selectedNode.summary}</p>}
              <div className="tadeon-brain-metrics">
                <span><Link2 /><strong>{selectedNode.explicitDegree}</strong><small>relações</small></span>
                <span><Crosshair /><strong>{selectedNode.incomingMentions}</strong><small>backlinks</small></span>
                <span><Sparkles /><strong>{selectedNode.weightedDegree.toFixed(1)}</strong><small>força</small></span>
                <span><Tags /><strong>{selectedNode.tags.length}</strong><small>tags</small></span>
              </div>
              {selectedNode.tags.length > 0 && <div className="tadeon-brain-tags">{selectedNode.tags.slice(0, 8).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
              <div className="tadeon-brain-actions">
                <Button size="sm" variant="outline" onClick={() => {
                  setGraphFocusId(selectedNode.id);
                  setMode("local");
                  setSelectedId(selectedNode.id);
                }}><Focus className="h-3.5 w-3.5" />Focar</Button>
                <Button size="sm" onClick={() => onOpenNode(selectedNode.id)}><Crosshair className="h-3.5 w-3.5" />Abrir</Button>
              </div>

              {selectedEdges.length > 0 && (
                <div className="tadeon-brain-relations">
                  <h4>Relações mais fortes</h4>
                  {selectedEdges.map(({ edge, node }) => (
                    <button key={edge.id} type="button" onClick={() => setSelectedId(node.id)}>
                      <span className="tadeon-brain-relation-dot" style={{ backgroundColor: nodeColor(node.nodeType) }} />
                      <div>
                        <strong>{node.title}</strong>
                        <small>{edge.kinds.map((kind) => SIGNAL_LABELS[kind]).join(" + ")} · {strengthLabel(edge.strength)} · {Math.round(edge.strength * 100)}%</small>
                        {edge.evidence[0] && <em>{edge.evidence[0]}</em>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
