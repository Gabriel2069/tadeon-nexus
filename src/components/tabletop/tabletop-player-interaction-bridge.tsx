import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crosshair,
  Footprints,
  Loader2,
  Route,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { snapPointToGrid } from "@/lib/tabletop/grid-renderer";
import {
  buildMovementPlan,
  powerTemplateFromSource,
  templatePath,
  type TabletopPowerSource,
  type TabletopPowerTemplate,
} from "@/lib/tabletop/tabletop-tactical-preview";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import { TabletopStagePortal } from "@/components/tabletop/tabletop-stage-portal";
import "@/styles/tabletop-player-interaction.css";

type TacticalMode = "idle" | "movement" | "power";

interface SheetPlotRow {
  name?: string;
  plots?: unknown;
}

function plotSources(value: unknown): TabletopPowerSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") return [];
    const source = entry as Record<string, unknown>;
    const name = typeof source.nome === "string" ? source.nome.trim() : "";
    if (!name) return [];
    return [{
      id: typeof source.id === "string" && source.id ? source.id : `plot-${index}`,
      name,
      reach: typeof source.alcance === "string" ? source.alcance : "",
      effect: typeof source.efeito === "string" ? source.efeito : undefined,
      damage: typeof source.dano === "string" ? source.dano : undefined,
    }];
  });
}

function selectedEntity(snapshot: TabletopSnapshot | null) {
  const id = snapshot?.selectedIds[0];
  return id ? snapshot?.scene.entities.find((entity) => entity.id === id) ?? null : null;
}

function centerOf(entity: NonNullable<ReturnType<typeof selectedEntity>>): Point {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

function screenPoint(point: Point) {
  return currentTabletopRuntime()?.worldToClient(point) ?? point;
}

function svgPoints(points: Point[]) {
  return points.map((point) => {
    const client = screenPoint(point);
    return `${client.x},${client.y}`;
  }).join(" ");
}

function pointInsideEntity(point: Point, entity: TabletopEntity) {
  const center = { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
  const angle = (-entity.rotation * Math.PI) / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(localX) <= entity.width / 2 && Math.abs(localY) <= entity.height / 2;
}

function topTargetAtPoint(snapshot: TabletopSnapshot, point: Point, sourceId?: string) {
  const source = sourceId ? snapshot.scene.entities.find((entity) => entity.id === sourceId) : null;
  return [...snapshot.scene.entities]
    .filter(
      (entity) =>
        entity.id !== sourceId &&
        !entity.hidden &&
        (!source?.levelId || !entity.levelId || entity.levelId === source.levelId) &&
        pointInsideEntity(point, entity),
    )
    .sort((left, right) => right.zIndex - left.zIndex)[0] ?? null;
}

function pointInsidePolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects =
      (a.y > point.y) !== (b.y > point.y) &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= Number.EPSILON) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
}

function geometryContainsPoint(
  geometry: ReturnType<typeof templatePath>,
  point: Point,
) {
  if (geometry.kind === "circle")
    return Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y) <= geometry.radius;
  if (geometry.kind === "segment")
    return distanceToSegment(point, geometry.start, geometry.end) <= geometry.width / 2;
  return pointInsidePolygon(point, geometry.points);
}

function pathForTemplate(template: TabletopPowerTemplate, origin: Point, target: Point) {
  const geometry = templatePath(template, origin, target);
  if (geometry.kind === "circle") {
    const center = screenPoint(geometry.center);
    const edge = screenPoint({ x: geometry.center.x + geometry.radius, y: geometry.center.y });
    return {
      kind: "circle" as const,
      cx: center.x,
      cy: center.y,
      radius: Math.max(2, Math.hypot(edge.x - center.x, edge.y - center.y)),
    };
  }
  if (geometry.kind === "segment") {
    const start = screenPoint(geometry.start);
    const end = screenPoint(geometry.end);
    const widthPoint = screenPoint({ x: geometry.start.x + geometry.width, y: geometry.start.y });
    return {
      kind: "segment" as const,
      start,
      end,
      width: Math.max(2, Math.hypot(widthPoint.x - start.x, widthPoint.y - start.y)),
    };
  }
  return {
    kind: "polygon" as const,
    points: svgPoints(geometry.points),
  };
}

export function TabletopPlayerInteractionBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [mode, setMode] = useState<TacticalMode>("idle");
  const [movementPoints, setMovementPoints] = useState<Point[]>([]);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [powerSources, setPowerSources] = useState<TabletopPowerSource[]>([]);
  const [activePower, setActivePower] = useState<TabletopPowerTemplate | null>(null);
  const [targetIds, setTargetIds] = useState<Set<string>>(() => new Set());
  const [loadingPowers, setLoadingPowers] = useState(false);
  const [powerMenuOpen, setPowerMenuOpen] = useState(false);
  const sheetRequestRef = useRef(0);

  useEffect(() => {
    let frame = 0;
    let attempts = 0;
    const bootstrap = () => {
      const runtime = currentTabletopRuntime();
      if (runtime) {
        setSnapshot(runtime.snapshot());
        return;
      }
      if (attempts++ < 90) frame = window.requestAnimationFrame(bootstrap);
    };
    bootstrap();
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  const entity = selectedEntity(snapshot);
  const linkedSheetId =
    entity?.linkedSheetId ??
    ((entity as (TabletopEntity & { sheetSummary?: { sheetId?: string } }) | null)
      ?.sheetSummary?.sheetId ?? null);

  useEffect(() => {
    const request = ++sheetRequestRef.current;
    setPowerSources([]);
    if (!linkedSheetId) return;
    setLoadingPowers(true);
    void (async () => {
      try {
        const { data } = await supabase
          .from("character_sheets")
          .select("name,plots")
          .eq("id", linkedSheetId)
          .maybeSingle();
        if (request !== sheetRequestRef.current) return;
        setPowerSources(plotSources((data as SheetPlotRow | null)?.plots));
      } finally {
        if (request === sheetRequestRef.current) setLoadingPowers(false);
      }
    })();
  }, [linkedSheetId]);

  useEffect(() => {
    setTargetIds(new Set());
  }, [activePower?.id]);

  useEffect(() => {
    setPowerMenuOpen(false);
  }, [entity?.id]);

  useEffect(() => {
    const text = activePower
      ? [activePower.name, activePower.source.effect, activePower.source.damage]
          .filter(Boolean)
          .join(" ")
      : "";
    window.dispatchEvent(
      new CustomEvent("tadeon-tabletop-tactical-state", {
        detail: { mode, text },
      }),
    );
  }, [activePower, mode]);

  const origin = entity ? centerOf(entity) : null;
  const plannedPoints = useMemo(() => {
    if (mode !== "movement" || !origin) return movementPoints;
    const base = movementPoints.length ? movementPoints : [origin];
    return cursorWorld ? [...base, cursorWorld] : base;
  }, [cursorWorld, mode, movementPoints, origin]);
  const movementPlan = useMemo(
    () => snapshot && plannedPoints.length >= 2
      ? buildMovementPlan(snapshot.scene, plannedPoints)
      : null,
    [plannedPoints, snapshot],
  );
  const powerWorldGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? templatePath(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );
  const powerGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? pathForTemplate(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );
  const affectedEntities = useMemo(() => {
    if (!snapshot || mode !== "power" || !powerWorldGeometry) return [];
    return snapshot.scene.entities.filter((candidate) => {
      if (candidate.id === entity?.id || candidate.hidden) return false;
      if (entity?.levelId && candidate.levelId && candidate.levelId !== entity.levelId) return false;
      return geometryContainsPoint(powerWorldGeometry, centerOf(candidate));
    });
  }, [entity?.id, entity?.levelId, mode, powerWorldGeometry, snapshot]);

  useEffect(() => {
    const runtime = currentTabletopRuntime();
    const canvas = runtime?.host.querySelector("canvas");
    if (!runtime || !(canvas instanceof HTMLCanvasElement) || mode === "idle") return;
    const snap = (point: Point) => {
      const scene = runtime.snapshot().scene;
      return scene.snap
        ? snapPointToGrid(point, scene.gridMode, scene.gridSize * scene.gridScale)
        : point;
    };
    const pointerMove = (event: PointerEvent) => {
      setCursorWorld(snap(runtime.clientToWorld({ x: event.clientX, y: event.clientY })));
    };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const world = snap(runtime.clientToWorld({ x: event.clientX, y: event.clientY }));
      setCursorWorld(world);
      if (mode === "movement") {
        setMovementPoints((current) => {
          const start = current.length ? current : origin ? [origin] : [];
          return [...start, world];
        });
        return;
      }
      if (mode === "power") {
        const target = topTargetAtPoint(runtime.snapshot(), world, entity?.id);
        if (!target) return;
        setTargetIds((current) => {
          const next = new Set(current);
          if (next.has(target.id)) next.delete(target.id);
          else next.add(target.id);
          return next;
        });
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPowerMenuOpen(false);
      setMode("idle");
      setMovementPoints([]);
      setCursorWorld(null);
      setActivePower(null);
      setTargetIds(new Set());
    };
    canvas.addEventListener("pointermove", pointerMove, true);
    canvas.addEventListener("pointerdown", pointerDown, true);
    window.addEventListener("keydown", keyDown);
    return () => {
      canvas.removeEventListener("pointermove", pointerMove, true);
      canvas.removeEventListener("pointerdown", pointerDown, true);
      window.removeEventListener("keydown", keyDown);
    };
  }, [entity?.id, mode, origin]);

  if (!snapshot || new URLSearchParams(window.location.search).get("view") === "director") return null;

  const templates = powerSources.map((source) =>
    powerTemplateFromSource(source, snapshot.scene.gridSize * snapshot.scene.gridScale),
  );
  const moveScreenPoints = plannedPoints.map(screenPoint);
  const selectedLabel = entity?.label ?? "Nenhuma seleção";

  return (
    <>
      <svg className="tadeon-tactical-overlay" aria-hidden="true">
        {mode === "movement" && moveScreenPoints.length >= 2 && (
          <>
            <polyline
              className="tadeon-tactical-overlay__movement-shadow"
              points={moveScreenPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            />
            <polyline
              className="tadeon-tactical-overlay__movement"
              points={moveScreenPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            />
            {moveScreenPoints.map((point, index) => (
              <circle key={`${point.x}-${point.y}-${index}`} cx={point.x} cy={point.y} r={index === 0 ? 6 : 4} className="tadeon-tactical-overlay__node" />
            ))}
          </>
        )}
        {mode === "power" && powerGeometry?.kind === "circle" && (
          <circle cx={powerGeometry.cx} cy={powerGeometry.cy} r={powerGeometry.radius} className="tadeon-tactical-overlay__power" />
        )}
        {mode === "power" && powerGeometry?.kind === "polygon" && (
          <polygon points={powerGeometry.points} className="tadeon-tactical-overlay__power" />
        )}
        {mode === "power" && powerGeometry?.kind === "segment" && (
          <line
            x1={powerGeometry.start.x}
            y1={powerGeometry.start.y}
            x2={powerGeometry.end.x}
            y2={powerGeometry.end.y}
            strokeWidth={powerGeometry.width}
            className="tadeon-tactical-overlay__power-line"
          />
        )}
        {mode === "power" && affectedEntities.map((candidate) => {
          const point = screenPoint(centerOf(candidate));
          const marked = targetIds.has(candidate.id);
          return (
            <g key={`affected-${candidate.id}`} className={marked ? "tadeon-tactical-target is-marked" : "tadeon-tactical-target is-affected"}>
              <circle cx={point.x} cy={point.y} r={marked ? 17 : 12} />
              {marked && <><line x1={point.x - 23} y1={point.y} x2={point.x - 10} y2={point.y} /><line x1={point.x + 10} y1={point.y} x2={point.x + 23} y2={point.y} /><line x1={point.x} y1={point.y - 23} x2={point.x} y2={point.y - 10} /><line x1={point.x} y1={point.y + 10} x2={point.x} y2={point.y + 23} /></>}
            </g>
          );
        })}
        {mode === "power" && [...targetIds]
          .filter((id) => !affectedEntities.some((candidate) => candidate.id === id))
          .map((id) => snapshot.scene.entities.find((candidate) => candidate.id === id))
          .filter((candidate): candidate is TabletopEntity => Boolean(candidate))
          .map((candidate) => {
            const point = screenPoint(centerOf(candidate));
            return (
              <g key={`target-${candidate.id}`} className="tadeon-tactical-target is-marked is-outside">
                <circle cx={point.x} cy={point.y} r={17} />
                <line x1={point.x - 23} y1={point.y} x2={point.x - 10} y2={point.y} />
                <line x1={point.x + 10} y1={point.y} x2={point.x + 23} y2={point.y} />
                <line x1={point.x} y1={point.y - 23} x2={point.x} y2={point.y - 10} />
                <line x1={point.x} y1={point.y + 10} x2={point.x} y2={point.y + 23} />
              </g>
            );
          })}
      </svg>

      <TabletopStagePortal>
      <aside className="tadeon-tactical-dock" data-mode={mode}>
        <div className="tadeon-tactical-dock__identity">
          <span><Target aria-hidden="true" /></span>
          <div>
            <small>Controle tático</small>
            <strong>{selectedLabel}</strong>
          </div>
        </div>
        <div className="tadeon-tactical-dock__actions">
          <Button
            size="sm"
            variant={mode === "movement" ? "default" : "ghost"}
            disabled={!entity}
            onClick={() => {
              setMode((current) => current === "movement" ? "idle" : "movement");
              setMovementPoints(origin ? [origin] : []);
              setActivePower(null);
              setTargetIds(new Set());
              setCursorWorld(null);
            }}
          >
            <Footprints aria-hidden="true" /> Planejar
          </Button>
          <div
            className="tadeon-tactical-dock__power-menu"
            data-open={powerMenuOpen ? "true" : "false"}
          >
            <Button
              size="sm"
              variant={mode === "power" ? "default" : "ghost"}
              disabled={!entity || loadingPowers || templates.length === 0}
              aria-haspopup="menu"
              aria-expanded={powerMenuOpen}
              onClick={() => setPowerMenuOpen((current) => !current)}
              title={
                !linkedSheetId
                  ? "Vincule uma ficha ao token para usar suas Tramas reais como templates"
                  : templates.length === 0
                    ? "A ficha vinculada ainda não possui Tramas visualizáveis"
                    : "Visualizar alcance e forma das Tramas da ficha"
              }
            >
              {loadingPowers ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
              Poderes
            </Button>
            {templates.length > 0 && (
              <div className="tadeon-tactical-dock__power-list" role="menu">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={activePower?.id === template.id}
                    role="menuitem"
                    onClick={() => {
                      setPowerMenuOpen(false);
                      setActivePower(template);
                      setTargetIds(new Set());
                      setMode("power");
                      setMovementPoints([]);
                      setCursorWorld(origin);
                    }}
                  >
                    <span><Crosshair aria-hidden="true" /></span>
                    <span>
                      <strong>{template.name}</strong>
                      <small>{template.source.reach || "alcance contextual"} · {template.shape}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {mode !== "idle" && (
            <Button
              size="icon"
              variant="ghost"
              aria-label="Encerrar prévia tática"
              onClick={() => {
                setMode("idle");
                setMovementPoints([]);
                setCursorWorld(null);
                setActivePower(null);
                setTargetIds(new Set());
              }}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
        {mode === "movement" && movementPlan && (
          <div className="tadeon-tactical-dock__readout">
            <Route aria-hidden="true" />
            <span>
              <strong>{movementPlan.weightedCells.toFixed(1)} cél.</strong>
              <small>
                {movementPlan.weightedCells > movementPlan.cells + 0.05
                  ? `${movementPlan.cells.toFixed(1)} base + terreno`
                  : `${movementPlan.cells.toFixed(1)} base`}
              </small>
            </span>
            <button type="button" onClick={() => setMovementPoints(origin ? [origin] : [])}>Limpar rota</button>
            {Boolean((entity as (typeof entity & { controllable?: boolean }) | null)?.controllable) && movementPoints.length >= 2 && (
              <button
                type="button"
                className="tadeon-tactical-dock__confirm"
                onClick={() => {
                  if (!entity) return;
                  window.dispatchEvent(
                    new CustomEvent("tadeon-tabletop-move-request", {
                      detail: { entityId: entity.id, points: movementPoints },
                    }),
                  );
                  setMode("idle");
                  setCursorWorld(null);
                }}
              >
                Mover
              </button>
            )}
          </div>
        )}
        {mode === "power" && activePower && (
          <div className="tadeon-tactical-dock__readout is-power">
            <Sparkles aria-hidden="true" />
            <span>
              <strong>{activePower.name}</strong>
              <small title={activePower.source.damage || activePower.source.effect || "Prévia visual da Trama"}>
                {affectedEntities.length} na área · {targetIds.size} marcado{targetIds.size === 1 ? "" : "s"}
              </small>
            </span>
          </div>
        )}
      </aside>
      </TabletopStagePortal>
    </>
  );
}
