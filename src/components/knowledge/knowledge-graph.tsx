import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  Crosshair,
  Focus,
  Loader2,
  Maximize2,
  Search,
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

const TYPE_LABELS: Partial<Record<KnowledgeNodeType, string>> = {
  character: "Personagem",
  npc: "NPC",
  creature: "Criatura",
  culture: "Cultura",
  region: "Região",
  city: "Cidade",
  location: "Local",
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

function typeLabel(type: KnowledgeNodeType) {
  return TYPE_LABELS[type] ?? type.replaceAll("_", " ");
}

function nodeColor(type: KnowledgeNodeType) {
  if (["character", "npc", "creature"].includes(type)) return "#d7a84b";
  if (["region", "city", "location", "river", "sea", "terrain"].includes(type)) {
    return "#55a6a0";
  }
  if (["plot", "clue", "historical_event", "session"].includes(type)) {
    return "#b477d0";
  }
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) {
    return "#d66d70";
  }
  return "#7c8fc8";
}

function graphError(error: unknown) {
  return error instanceof KnowledgeServiceError
    ? error.userMessage
    : "Não foi possível carregar o grafo local.";
}

export function KnowledgeGraph({
  workspaceId,
  campaignId,
  focusNodeId,
  onOpenNode,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    x: 0,
    y: 0,
  });
  const [graphFocusId, setGraphFocusId] = useState(focusNodeId);
  const [graph, setGraph] = useState<KnowledgeLocalGraph | null>(null);
  const [selectedId, setSelectedId] = useState(focusNodeId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [depth, setDepth] = useState<1 | 2>(1);
  const [limit, setLimit] = useState(120);
  const [nodeType, setNodeType] = useState<KnowledgeNodeType | "all">("all");
  const [relationType, setRelationType] =
    useState<RelationType | "all">("all");
  const [visibility, setVisibility] =
    useState<KnowledgeVisibility | "all">("all");
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState({ width: 900, height: 560 });
  const [pan, setPan] = useState<Point>({ x: 450, y: 280 });
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
        result.nodes.some((node) => node.id === current)
          ? current
          : result.focusNodeId,
      );
    } catch (nextError) {
      setGraph(null);
      setError(graphError(nextError));
    } finally {
      setLoading(false);
    }
  }, [
    campaignId,
    depth,
    graphFocusId,
    limit,
    nodeType,
    relationType,
    visibility,
    workspaceId,
  ]);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

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
    return () => {
      observer.disconnect();
      canvas.width = 0;
      canvas.height = 0;
    };
  }, []);

  const positions = useMemo(() => {
    const next = new Map<string, Point>();
    if (!graph) return next;
    const rings = new Map<number, KnowledgeGraphNode[]>();
    for (const node of graph.nodes) {
      const entries = rings.get(node.depth) ?? [];
      entries.push(node);
      rings.set(node.depth, entries);
    }
    for (const [ring, entries] of rings) {
      if (ring === 0) {
        for (const node of entries) next.set(node.id, { x: 0, y: 0 });
        continue;
      }
      const radius = ring === 1 ? 175 : 315;
      entries.forEach((node, index) => {
        const angle =
          -Math.PI / 2 + (index / Math.max(1, entries.length)) * Math.PI * 2;
        next.set(node.id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });
    }
    return next;
  }, [graph]);

  const fitGraph = useCallback(() => {
    const radius = depth === 2 ? 365 : 225;
    const fitted = Math.min(
      1.25,
      Math.max(
        0.4,
        Math.min(viewport.width, viewport.height) / (radius * 2),
      ),
    );
    setZoom(fitted);
    setPan({ x: viewport.width / 2, y: viewport.height / 2 });
  }, [depth, viewport.height, viewport.width]);

  useEffect(() => {
    fitGraph();
  }, [fitGraph, graph?.focusNodeId]);

  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const selectedNode = selectedId ? nodeById.get(selectedId) ?? null : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#11131a";
    context.fillRect(0, 0, viewport.width, viewport.height);

    context.save();
    context.translate(pan.x, pan.y);
    context.scale(zoom, zoom);

    context.strokeStyle = "rgba(148, 163, 184, 0.08)";
    context.lineWidth = 1 / zoom;
    const grid = 48;
    const left = -pan.x / zoom;
    const top = -pan.y / zoom;
    const right = left + viewport.width / zoom;
    const bottom = top + viewport.height / zoom;
    for (let x = Math.floor(left / grid) * grid; x < right; x += grid) {
      context.beginPath();
      context.moveTo(x, top);
      context.lineTo(x, bottom);
      context.stroke();
    }
    for (let y = Math.floor(top / grid) * grid; y < bottom; y += grid) {
      context.beginPath();
      context.moveTo(left, y);
      context.lineTo(right, y);
      context.stroke();
    }

    for (const edge of graph?.edges ?? []) {
      const source = positions.get(edge.sourceNodeId);
      const target = positions.get(edge.targetNodeId);
      if (!source || !target) continue;
      const active =
        selectedId === edge.sourceNodeId || selectedId === edge.targetNodeId;
      context.strokeStyle = active
        ? "rgba(215, 168, 75, 0.85)"
        : "rgba(148, 163, 184, 0.35)";
      context.lineWidth = (active ? 2.4 : 1.2) / zoom;
      context.beginPath();
      context.moveTo(source.x, source.y);
      context.lineTo(target.x, target.y);
      context.stroke();

      if (edge.direction === "directed") {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const size = 8 / Math.sqrt(zoom);
        const distance = 20;
        const x = target.x - Math.cos(angle) * distance;
        const y = target.y - Math.sin(angle) * distance;
        context.fillStyle = context.strokeStyle;
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
    }

    for (const node of graph?.nodes ?? []) {
      const position = positions.get(node.id);
      if (!position) continue;
      const radius = node.depth === 0 ? 24 : node.depth === 1 ? 17 : 13;
      const selected = node.id === selectedId;
      context.shadowColor = selected ? nodeColor(node.nodeType) : "transparent";
      context.shadowBlur = selected ? 18 : 0;
      context.fillStyle = nodeColor(node.nodeType);
      context.beginPath();
      context.arc(position.x, position.y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.strokeStyle = selected ? "#fff6da" : "rgba(255,255,255,.35)";
      context.lineWidth = (selected ? 3 : 1) / zoom;
      context.stroke();

      if (zoom >= 0.7 && (node.depth < 2 || selected)) {
        context.fillStyle = "#f4f1e8";
        context.font = `${selected ? 600 : 500} ${12 / zoom}px system-ui`;
        context.textAlign = "center";
        context.textBaseline = "top";
        const label =
          node.title.length > 28 ? `${node.title.slice(0, 27)}…` : node.title;
        context.fillText(label, position.x, position.y + radius + 7 / zoom);
      }
    }
    context.restore();
  }, [
    graph,
    nodeById,
    pan,
    positions,
    selectedId,
    viewport.height,
    viewport.width,
    zoom,
  ]);

  const hitNode = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || !graph) return null;
      const worldX = (clientX - rect.left - pan.x) / zoom;
      const worldY = (clientY - rect.top - pan.y) / zoom;
      for (let index = graph.nodes.length - 1; index >= 0; index -= 1) {
        const node = graph.nodes[index];
        const position = positions.get(node.id);
        if (!position) continue;
        const radius = node.depth === 0 ? 28 : node.depth === 1 ? 22 : 18;
        if (Math.hypot(worldX - position.x, worldY - position.y) <= radius) {
          return node.id;
        }
      }
      return null;
    },
    [graph, pan.x, pan.y, positions, zoom],
  );

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
    };
  };

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  const pointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    drag.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!drag.moved) {
      const hit = hitNode(event.clientX, event.clientY);
      if (hit) setSelectedId(hit);
    }
  };

  const wheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const nextZoom = Math.min(
      2.4,
      Math.max(0.35, zoom * Math.exp(-event.deltaY * 0.0012)),
    );
    setZoom(nextZoom);
  };

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return [];
    return (graph?.nodes ?? [])
      .filter((node) =>
        node.title.toLocaleLowerCase("pt-BR").includes(normalized),
      )
      .slice(0, 8);
  }, [graph?.nodes, query]);

  if (!focusNodeId) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Abra uma página para iniciar o grafo local.
      </div>
    );
  }

  return (
    <div className="grid min-h-[600px] gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative min-h-[520px] overflow-hidden rounded-xl border bg-[#11131a]">
        <canvas
          ref={canvasRef}
          className="h-full min-h-[520px] w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => {
            dragRef.current.active = false;
          }}
          onWheel={wheel}
          aria-label="Grafo local interativo de O Nexus"
          tabIndex={0}
        />
        <div className="absolute left-3 top-3 flex gap-1 rounded-lg border bg-background/85 p-1 backdrop-blur">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom((current) => Math.min(2.4, current * 1.2))}
            aria-label="Aproximar"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setZoom((current) => Math.max(0.35, current / 1.2))}
            aria-label="Afastar"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={fitGraph}
            aria-label="Ajustar grafo"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {graph?.truncated && (
          <div className="absolute bottom-3 left-3 rounded-md bg-background/85 px-2 py-1 text-[10px] text-muted-foreground">
            Limite atingido; refine os filtros ou foque uma vizinhança.
          </div>
        )}
      </div>

      <aside className="space-y-3 overflow-y-auto rounded-xl border bg-card/55 p-3">
        <div>
          <p className="tadeon-eyebrow">Grafo local</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {graph?.nodes.length ?? 0} nós · {graph?.edges.length ?? 0} relações
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nó carregado…"
            className="pl-9"
          />
        </div>
        {matches.length > 0 && (
          <div className="space-y-1 rounded-lg border p-1">
            {matches.map((node) => (
              <button
                type="button"
                key={node.id}
                onClick={() => {
                  setSelectedId(node.id);
                  setQuery("");
                }}
                className="block w-full truncate rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
              >
                {node.title}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={String(depth)}
            onValueChange={(value) => setDepth(value === "2" ? 2 : 1)}
          >
            <SelectTrigger aria-label="Profundidade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 nível</SelectItem>
              <SelectItem value="2">2 níveis</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String(limit)}
            onValueChange={(value) => setLimit(Number(value))}
          >
            <SelectTrigger aria-label="Limite de nós">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">60 nós</SelectItem>
              <SelectItem value="120">120 nós</SelectItem>
              <SelectItem value="200">200 nós</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select
          value={nodeType}
          onValueChange={(value) =>
            setNodeType(value as KnowledgeNodeType | "all")
          }
        >
          <SelectTrigger aria-label="Filtrar tipo de nó">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {KNOWLEDGE_NODE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={relationType}
          onValueChange={(value) =>
            setRelationType(value as RelationType | "all")
          }
        >
          <SelectTrigger aria-label="Filtrar relação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as relações</SelectItem>
            {RELATION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={visibility}
          onValueChange={(value) =>
            setVisibility(value as KnowledgeVisibility | "all")
          }
        >
          <SelectTrigger aria-label="Filtrar visibilidade">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda visibilidade</SelectItem>
            {KNOWLEDGE_VISIBILITIES.map((item) => (
              <SelectItem key={item} value={item}>
                {item.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedNode && (
          <div className="rounded-xl border bg-background/35 p-3">
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: nodeColor(selectedNode.nodeType) }}
              />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">
                {selectedNode.title}
              </p>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
              {typeLabel(selectedNode.nodeType)} · nível {selectedNode.depth}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setGraphFocusId(selectedNode.id);
                  setSelectedId(selectedNode.id);
                }}
              >
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
