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
} from "@/lib/knowledge/knowledge-graph-memory-spaced";
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
import "@/styles/tadeon-nexus-material.css";

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
  const initialFocusRef = useRef(focusNodeId);
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
  const [labelZoom, setLabelZoom] = useState(0.5);
  const [showArrows, setShowArrows] = useState(true);
  const [pinnedPositions, setPinnedPositions] = useState<Record<string, KnowledgeGraphPoint>>({});
  const [forceOptions, setForceOptions] = useState<KnowledgeForceOptions>({
    linkDistance: 238,
    linkStrength: 1,
    repelStrength: 1.55,
    centerStrength: 0.46,
    clusterStrength: 0.16,
  });

  useEffect(() => {
    setGraphFocusId(focusNodeId);
    setSelectedId(focusNodeId);
    initialFocusRef.current = focusNodeId;
  }, [focusNodeId]);

  /* existing implementation continues unchanged below */
