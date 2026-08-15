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
import type { Point, TabletopSnapshot } from "@/lib/tabletop/types";
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

function useRadialContextMenu() {
  useEffect(() => {
    let radial: HTMLDivElement | null = null;
    let sourceMenu: HTMLElement | null = null;

    const remove = () => {
      radial?.remove();
      radial = null;
      sourceMenu = null;
    };

    const sync = () => {
      const menu = document.querySelector<HTMLElement>(".tadeon-tabletop-context-menu");
      if (!menu) {
        remove();
        return;
      }
      if (menu === sourceMenu && radial?.isConnected) return;
      remove();
      const actions = Array.from(menu.querySelectorAll<HTMLButtonElement>("button"))
        .filter((button) => {
          const text = button.textContent?.replace(/\s+/g, " ").trim() ?? "";
          const style = window.getComputedStyle(button);
          return !button.disabled && style.display !== "none" && text.length >= 2 && text.length <= 34;
        })
        .slice(0, 8);
      if (actions.length < 2) return;

      radial = document.createElement("div");
      radial.className = "tadeon-tabletop-radial-menu";
      radial.setAttribute("role", "menu");
      radial.setAttribute("aria-label", "Ações radiais da seleção");
      const rect = menu.getBoundingClientRect();
      const centerX = Math.max(118, Math.min(window.innerWidth - 118, rect.left - 92));
      const centerY = Math.max(118, Math.min(window.innerHeight - 118, rect.top + Math.min(rect.height, 240) / 2));
      radial.style.left = `${centerX}px`;
      radial.style.top = `${centerY}px`;
      actions.forEach((original, index) => {
        const angle = -Math.PI / 2 + (index / actions.length) * Math.PI * 2;
        const item = document.createElement("button");
        item.type = "button";
        item.className = "tadeon-tabletop-radial-menu__item";
        item.style.setProperty("--radial-x", `${Math.cos(angle) * 78}px`);
        item.style.setProperty("--radial-y", `${Math.sin(angle) * 78}px`);
        const label = original.textContent?.replace(/\s+/g, " ").trim() || original.getAttribute("aria-label") || "Ação";
        item.textContent = label.length > 18 ? `${label.slice(0, 17)}…` : label;
        item.title = label;
        item.setAttribute("role", "menuitem");
        item.addEventListener("click", () => original.click());
        radial?.appendChild(item);
      });
      const hub = document.createElement("div");
      hub.className = "tadeon-tabletop-radial-menu__hub";
      hub.textContent = "Ações";
      radial.appendChild(hub);
      document.body.appendChild(radial);
      sourceMenu = menu;
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", sync);
      remove();
    };
  }, []);
}

export function TabletopPlayerInteractionBridge() {
  useRadialContextMenu();
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [mode, setMode] = useState<TacticalMode>("idle");
  const [movementPoints, setMovementPoints] = useState<Point[]>([]);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [powerSources, setPowerSources] = useState<TabletopPowerSource[]>([]);
  const [activePower, setActivePower] = useState<TabletopPowerTemplate | null>(null);
  const [loadingPowers, setLoadingPowers] = useState(false);
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
  const linkedSheetId = entity?.linkedSheetId ?? null;

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
  const powerGeometry = useMemo(
    () => activePower && origin && cursorWorld
      ? pathForTemplate(activePower, origin, cursorWorld)
      : null,
    [activePower, cursorWorld, origin],
  );

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
      }
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMode("idle");
      setMovementPoints([]);
      setCursorWorld(null);
      setActivePower(null);
    };
    canvas.addEventListener("pointermove", pointerMove, true);
    canvas.addEventListener("pointerdown", pointerDown, true);
    window.addEventListener("keydown", keyDown);
    return () => {
      canvas.removeEventListener("pointermove", pointerMove, true);
      canvas.removeEventListener("pointerdown", pointerDown, true);
      window.removeEventListener("keydown", keyDown);
    };
  }, [mode, origin]);

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
      </svg>

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
              setCursorWorld(null);
            }}
          >
            <Footprints aria-hidden="true" /> Planejar
          </Button>
          <div className="tadeon-tactical-dock__power-menu">
            <Button
              size="sm"
              variant={mode === "power" ? "default" : "ghost"}
              disabled={!entity || loadingPowers || templates.length === 0}
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
              <div className="tadeon-tactical-dock__power-list">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={activePower?.id === template.id}
                    onClick={() => {
                      setActivePower(template);
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
              <small>{activePower.source.damage || activePower.source.effect || "prévia visual da Trama"}</small>
            </span>
          </div>
        )}
      </aside>
    </>
  );
}
