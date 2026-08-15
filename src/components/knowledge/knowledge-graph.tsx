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
  Minimize2,
  Network,
  Search,
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

type GraphLayout = "radial" | "tree";

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
  if (["character", "npc", "creature"].includes(type)) return "#d9d7a4";
  if (["region", "city", "location", "river", "sea", "terrain"].includes(type)) {
    return "#4f6e5d";
  }
  if (["plot", "clue", "historical_event", "session"].includes(type)) {
    return "#716b7b";
  }
  if (["fragment", "transcendental_ability", "weapon", "object"].includes(type)) {
    return "#74242d";
  }
  return "#1f3644";
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
  const [relationType, setRelationType] = useState<RelationType | "all">("all");
  const [visibility, setVisibility] = useState<KnowledgeVisibility | "all">("all");
  const [layout, setLayout] = useState<GraphLayout>("radial");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState({ width: 900, height: 560 });
  const [pan, setPan] = useState<Point>({ x: 450, y: 280 });
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);

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
    const levels = new Map<number, KnowledgeGraphNode[]>();
    for (const node of graph.nodes) {
      const entries = levels.get(node.depth) ?? [];
      entries.push(node);
      levels.set(node.depth, entries);
    }

    if (layout === "tree") {
      const orderedLevels = [...levels.keys()].sort((left, right) => left - right);
      for (const level of orderedLevels) {
        const unsortedEntries = levels.get(level) ?? [];
        const parentCenter = (nodeId: string) => {
          const parentXs = graph.edges
            .flatMap((edge) => {
              if (edge.sourceNodeId === nodeId) return [edge.targetNodeId];
              if (edge.targetNodeId === nodeId) return [edge.sourceNodeId];
              return [];
            })
            .map((id) => next.get(id)?.x)
            .filter((value): value is number => value !== undefined);
          if (!parentXs.length) return null;
          return parentXs.reduce((sum, value) => sum + value, 0) / parentXs.length;
        };
        const entries = [...unsortedEntries].sort((left, right) => {
          const leftCenter = parentCenter(left.id);
          const rightCenter = parentCenter(right.id);
          if (leftCenter !== null && rightCenter !== null) {
            const connectionOrder = leftCenter - rightCenter;
            if (connectionOrder !== 0) return connectionOrder;
          } else if (leftCenter !== null) {
            return -1;
          } else if (rightCenter !== null) {
            return 1;
          }
          return left.title.localeCompare(right.title, "pt-BR");
        });
        const perRow =
          level === 0
            ? Math.max(1, entries.length)
            : Math.min(level === 1 ? 8 : 10, Math.max(1, entries.length));
        const rowCount = Math.ceil(entries.length / perRow);

        entries.forEach((node, index) => {
          const row = Math.floor(index / perRow);
          const rowStart = row * perRow;
          const rowLength = Math.min(perRow, entries.length - rowStart);
          const column = index - rowStart;
          const spacing = level === 0 ? 150 : level === 1 ? 170 : 132;
          const baseY = level === 0 ? -230 : level === 1 ? -25 : 210;
          const rowOffset = (row - (rowCount - 1) / 2) * 74;
          next.set(node.id, {
            x: (column - (rowLength - 1) / 2) * spacing,
            y: baseY + rowOffset,
          });
        });
      }
      return next;
    }

    for (const [ring, entries] of levels) {
      if (ring === 0) {
        entries.forEach((node, index) =>
          next.set(node.id, {
            x: (index - (entries.length - 1) / 2) * 64,
            y: 0,
          }),
        );
        continue;
      }
      const radius = ring === 1 ? 175 : 315;
      entries.forEach((node, index) => {
        const angle = -Math.PI / 2 + (index / Math.max(1, entries.length)) * Math.PI * 2;
        next.set(node.id, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        });
      });
    }
    return next;
  }, [graph, layout]);

  const fitGraph = useCallback(() => {
    const values = [...positions.values()];
    const minX = values.length ? Math.min(...values.map((point) => point.x)) : 0;
    const maxX = values.length ? Math.max(...values.map((point) => point.x)) : 0;
    const minY = values.length ? Math.min(...values.map((point) => point.y)) : 0;
    const maxY = values.length ? Math.max(...values.map((point) => point.y)) : 0;
    const contentWidth = Math.max(280, maxX - minX + (layout === "tree" ? 210 : 140));
    const contentHeight = Math.max(260, maxY - minY + (layout === "tree" ? 190 : 140));
    const fitted = Math.min(
      1.25,
      Math.max(0.28, Math.min(viewport.width / contentWidth, viewport.height / contentHeight)),
    );
    setZoom(fitted);
    setPan({
      x: viewport.width / 2 - ((minX + maxX) / 2) * fitted,
      y: viewport.height / 2 - ((minY + maxY) / 2) * fitted,
    });
  }, [layout, positions, viewport.height, viewport.width]);

  useEffect(() => {
    fitGraph();
  }, [fitGraph, graph?.focusNodeId, layout]);

  const nodeById = useMemo(
    () => new Map((graph?.nodes ?? []).map((node) => [node.id, node])),
    [graph],
  );
  const selectedNode = selectedId ? (nodeById.get(selectedId) ?? null) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, viewport.width, viewport.height);
    context.fillStyle = "#090c10";
    context.fillRect(0, 0, viewport.width, viewport.height);
    const atmosphere = context.createRadialGradient(
      viewport.width * 0.48,
      viewport.height * 0.38,
      0,
      viewport.width * 0.48,
      viewport.height * 0.38,
      Math.max(viewport.width, viewport.height) * 0.72,
    );
    atmosphere.addColorStop(0, "rgba(79, 110, 93, 0.11)");
    atmosphere.addColorStop(0.52, "rgba(31, 54, 68, 0.055)");
    atmosphere.addColorStop(1, "rgba(8, 10, 14, 0)");
    context.fillStyle = atmosphere;
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
      const active = [selectedId, hoveredId].some(
        (nodeId) => nodeId === edge.sourceNodeId || nodeId === edge.targetNodeId,
      );
      context.strokeStyle = active ? "rgba(215, 168, 75, 0.85)" : "rgba(148, 163, 184, 0.35)";
      context.lineWidth = (active ? 2.4 : 1.2) / zoom;
      context.beginPath();
      context.moveTo(source.x, source.y);
      if (layout === "tree") {
        const middleY = source.y + (target.y - source.y) * 0.5;
        context.bezierCurveTo(source.x, middleY, target.x, middleY, target.x, target.y);
      } else {
        context.lineTo(target.x, target.y);
      }
      context.stroke();

      if (edge.direction === "directed") {
        const angle =
          layout === "tree" && Math.abs(target.y - source.y) > 1
            ? Math.sign(target.y - source.y) * (Math.PI / 2)
            : Math.atan2(target.y - source.y, target.x - source.x);
        const size = 8 / Math.sqrt(zoom);
        const distance = layout === "tree" ? 24 : 20;
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
      const hovered = node.id === hoveredId;
      context.shadowColor = selected || hovered ? nodeColor(node.nodeType) : "transparent";
      context.shadowBlur = selected ? 18 : hovered ? 10 : 0;
      if (layout === "tree") {
        const width = node.depth === 0 ? 132 : 116;
        const height = node.depth === 0 ? 42 : 36;
        const left = position.x - width / 2;
        const top = position.y - height / 2;
        context.beginPath();
        context.roundRect(left, top, width, height, node.depth === 0 ? 11 : 9);
        context.fillStyle = selected
          ? "rgba(217, 215, 164, 0.12)"
          : hovered
            ? "rgba(79, 110, 93, 0.16)"
            : "rgba(13, 17, 22, 0.96)";
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = selected
          ? "rgba(217, 215, 164, 0.92)"
          : hovered
            ? nodeColor(node.nodeType)
            : "rgba(217, 215, 164, 0.18)";
        context.lineWidth = (selected ? 2 : hovered ? 1.5 : 1) / zoom;
        context.stroke();
        context.fillStyle = nodeColor(node.nodeType);
        context.fillRect(left, top + 7, 3.5 / Math.max(zoom, 0.5), height - 14);

        if (zoom >= 0.42 || selected) {
          const maxLength = node.depth === 0 ? 22 : 18;
          const label =
            node.title.length > maxLength ? `${node.title.slice(0, maxLength - 1)}…` : node.title;
          context.fillStyle = selected ? "#f2eec8" : "#e9e3d5";
          context.font = `${selected ? 650 : 540} ${11 / Math.max(zoom, 0.62)}px Inter, system-ui`;
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(label, position.x + 2, position.y);
        }
      } else {
        context.fillStyle = nodeColor(node.nodeType);
        context.beginPath();
        context.arc(position.x, position.y, radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.strokeStyle = selected
          ? "#f2eec8"
          : hovered
            ? "rgba(242,238,200,.78)"
            : "rgba(255,255,255,.35)";
        context.lineWidth = (selected ? 3 : hovered ? 2 : 1) / zoom;
        context.stroke();

        if (zoom >= 0.7 && (node.depth < 2 || selected)) {
          context.fillStyle = "#e9e3d5";
          context.font = `${selected ? 650 : 520} ${12 / zoom}px Inter, system-ui`;
          context.textAlign = "center";
          context.textBaseline = "top";
          const label = node.title.length > 28 ? `${node.title.slice(0, 27)}…` : node.title;
          context.fillText(label, position.x, position.y + radius + 7 / zoom);
        }
      }
    }
    context.restore();
  }, [
    graph,
    hoveredId,
    layout,
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
        if (layout === "tree") {
          const width = node.depth === 0 ? 132 : 116;
          const height = node.depth === 0 ? 42 : 36;
          if (
            Math.abs(worldX - position.x) <= width / 2 + 4 &&
            Math.abs(worldY - position.y) <= height / 2 + 4
          ) {
            return node.id;
          }
          continue;
        }
        const radius = node.depth === 0 ? 28 : node.depth === 1 ? 22 : 18;
        if (Math.hypot(worldX - position.x, worldY - position.y) <= radius) {
          return node.id;
        }
      }
      return null;
    },
    [graph, layout, pan.x, pan.y, positions, zoom],
  );

  const pointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.cursor = "grabbing";
    setHoveredId(null);
    dragRef.current = {
      active: true,
      moved: false,
      x: event.clientX,
      y: event.clientY,
    };
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
    const drag = dragRef.current;
    drag.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const hit = hitNode(event.clientX, event.clientY);
    event.currentTarget.style.cursor = hit ? "pointer" : "grab";
    setHoveredId(hit);
    if (!drag.moved) {
      if (hit) setSelectedId(hit);
    }
  };

  const wheel = (event: ReactWheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const pointer = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const world = {
      x: (pointer.x - pan.x) / zoom,
      y: (pointer.y - pan.y) / zoom,
    };
    const nextZoom = Math.min(2.4, Math.max(0.35, zoom * Math.exp(-event.deltaY * 0.0012)));
    setPan({
      x: pointer.x - world.x * nextZoom,
      y: pointer.y - world.y * nextZoom,
    });
    setZoom(nextZoom);
  };

  const matches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return [];
    return (graph?.nodes ?? [])
      .filter((node) => node.title.toLocaleLowerCase("pt-BR").includes(normalized))
      .slice(0, 8);
  }, [graph?.nodes, query]);

  const orderedNodes = useMemo(
    () =>
      [...(graph?.nodes ?? [])].sort(
        (left, right) => left.depth - right.depth || left.title.localeCompare(right.title, "pt-BR"),
      ),
    [graph?.nodes],
  );

  const keyDown = (event: ReactKeyboardEvent<HTMLCanvasElement>) => {
    const currentIndex = orderedNodes.findIndex((node) => node.id === selectedId);
    const move = (offset: number) => {
      if (!orderedNodes.length) return;
      const index =
        currentIndex < 0 ? 0 : (currentIndex + offset + orderedNodes.length) % orderedNodes.length;
      setSelectedId(orderedNodes[index].id);
    };

    if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      move(1);
    } else if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Home" && orderedNodes.length) {
      event.preventDefault();
      setSelectedId(graph?.focusNodeId ?? orderedNodes[0].id);
    } else if (event.key === "Enter" && selectedNode) {
      event.preventDefault();
      onOpenNode(selectedNode.id);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom((current) => Math.min(2.4, current * 1.2));
    } else if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      setZoom((current) => Math.max(0.35, current / 1.2));
    } else if (event.key === "0") {
      event.preventDefault();
      fitGraph();
    }
  };

  if (!focusNodeId) {
    return (
      <div className="flex min-h-[520px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        Abra uma página para iniciar o grafo local.
      </div>
    );
  }

  return (
    <div
      data-expanded={expanded ? "true" : "false"}
      className={
        expanded
          ? "tadeon-knowledge-graph fixed inset-2 z-[220] min-h-0 overflow-hidden rounded-2xl border bg-background p-2 shadow-2xl sm:inset-4"
          : "tadeon-knowledge-graph grid min-h-[600px] gap-3 lg:grid-cols-[minmax(0,1fr)_300px]"
      }
    >
      <div
        className={
          expanded
            ? "tadeon-graph-canvas relative h-full min-h-0 overflow-hidden rounded-xl border bg-[#090c10]"
            : "tadeon-graph-canvas relative min-h-[520px] overflow-hidden rounded-xl border bg-[#090c10]"
        }
      >
        <canvas
          ref={canvasRef}
          className={
            expanded
              ? "h-full min-h-0 w-full cursor-grab touch-none active:cursor-grabbing"
              : "h-full min-h-[520px] w-full cursor-grab touch-none active:cursor-grabbing"
          }
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
        <div className="tadeon-graph-toolbar absolute left-3 top-3 flex gap-1 rounded-lg border bg-background/85 p-1 backdrop-blur">
          <div className="tadeon-graph-layout-switch" role="group" aria-label="Organização visual">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLayout("radial")}
              aria-pressed={layout === "radial"}
            >
              <Network className="h-4 w-4" />
              Teia
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLayout("tree")}
              aria-pressed={layout === "tree"}
            >
              <Workflow className="h-4 w-4" />
              Árvore
            </Button>
          </div>
          <span className="tadeon-graph-toolbar__divider" aria-hidden="true" />
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
          <Button size="icon" variant="ghost" onClick={fitGraph} aria-label="Reenquadrar grafo">
            <Focus className="h-4 w-4" />
          </Button>
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

      {!expanded && (
        <aside className="tadeon-graph-inspector space-y-3 overflow-y-auto rounded-xl border bg-card/55 p-3">
          <div>
            <p className="tadeon-eyebrow">{layout === "tree" ? "Árvore local" : "Teia local"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {graph?.nodes.length ?? 0} nós · {graph?.edges.length ?? 0} relações
            </p>
            <p
              id="nexus-graph-help"
              className="mt-2 text-[10px] leading-relaxed text-muted-foreground"
            >
              Arraste para mover, use a roda para zoom. No teclado, percorra os nós com as setas,
              Enter abre e 0 reenquadra.
            </p>
          </div>

          <div className="tadeon-graph-legend" aria-label="Legenda de categorias">
            {[
              ["#d9d7a4", "Pessoas"],
              ["#4f6e5d", "Lugares"],
              ["#716b7b", "Tramas"],
              ["#74242d", "Artefatos"],
            ].map(([color, label]) => (
              <span key={label}>
                <i style={{ backgroundColor: color }} aria-hidden="true" />
                {label}
              </span>
            ))}
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
                      setPan({
                        x: viewport.width / 2 - point.x * zoom,
                        y: viewport.height / 2 - point.y * zoom,
                      });
                    }
                  }}
                  className="block w-full truncate rounded px-2 py-1.5 text-left text-xs"
                >
                  {node.title}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Select value={String(depth)} onValueChange={(value) => setDepth(value === "2" ? 2 : 1)}>
              <SelectTrigger aria-label="Profundidade">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 nível</SelectItem>
                <SelectItem value="2">2 níveis</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
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
            onValueChange={(value) => setNodeType(value as KnowledgeNodeType | "all")}
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
            onValueChange={(value) => setRelationType(value as RelationType | "all")}
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
            onValueChange={(value) => setVisibility(value as KnowledgeVisibility | "all")}
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
            <div className="tadeon-graph-selection rounded-xl border bg-background/35 p-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: nodeColor(selectedNode.nodeType) }}
                />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold">{selectedNode.title}</p>
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
      )}
    </div>
  );
}
