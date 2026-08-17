import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, WandSparkles } from "lucide-react";
import "@/styles/tabletop-map-chrome-repair.css";

const TOP_RAIL_KEY = "tadeon.tabletop.toprail.collapsed";
const DOCK_POSITION_KEY = "tadeon.tabletop.creative-dock.position";

function stageGeometry() {
  const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
  if (!stage) return null;
  const rect = stage.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { stage, rect };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function readDockPosition() {
  try {
    const raw = window.localStorage.getItem(DOCK_POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { x?: unknown; y?: unknown };
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function TabletopUrgentReconciliationBridge() {
  const [mounted, setMounted] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [topRailCollapsed, setTopRailCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TOP_RAIL_KEY) === "1";
  });

  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    setMounted(true);
    const html = document.documentElement;
    let drag:
      | {
          dock: HTMLElement;
          pointerId: number;
          offsetX: number;
          offsetY: number;
        }
      | null = null;

    const syncGeometry = () => {
      const geometry = stageGeometry();
      if (!geometry) return;
      const rect = geometry.rect;
      html.style.setProperty("--tadeon-tabletop-stage-top", `${Math.max(0, rect.top)}px`);
      html.style.setProperty(
        "--tadeon-tabletop-stage-right",
        `${Math.max(0, window.innerWidth - rect.right)}px`,
      );
      html.style.setProperty(
        "--tadeon-tabletop-stage-bottom",
        `${Math.max(0, window.innerHeight - rect.bottom)}px`,
      );
      html.style.setProperty("--tadeon-tabletop-stage-width", `${rect.width}px`);
      html.style.setProperty("--tadeon-tabletop-stage-height", `${rect.height}px`);
      html.style.setProperty("--tadeon-tabletop-stage-center", `${rect.left + rect.width / 2}px`);
    };

    const syncDock = () => {
      const dock = document.querySelector<HTMLElement>(".tadeon-creative-dock");
      const collapsed = dock?.dataset.open !== "true";
      setDockCollapsed(collapsed);
      html.dataset.tadeonCreativeDock = collapsed ? "collapsed" : "expanded";

      if (!dock || dock.dataset.open !== "true") return;
      const saved = readDockPosition();
      if (!saved || dock.dataset.tadeonDockDragged === "true") return;
      dock.dataset.tadeonDockDragged = "true";
      dock.style.setProperty("--tadeon-dock-x", `${saved.x}px`);
      dock.style.setProperty("--tadeon-dock-y", `${saved.y}px`);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target || target.closest("button, input, textarea, select, a, [role='button']")) return;
      const header = target.closest<HTMLElement>(
        '.tadeon-creative-dock[data-open="true"] .tadeon-creative-dock__panel > header',
      );
      if (!header) return;
      const dock = header.closest<HTMLElement>(".tadeon-creative-dock");
      if (!dock) return;
      const rect = dock.getBoundingClientRect();
      drag = {
        dock,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      dock.dataset.tadeonDockDragging = "true";
      dock.dataset.tadeonDockDragged = "true";
      dock.style.setProperty("--tadeon-dock-x", `${rect.left}px`);
      dock.style.setProperty("--tadeon-dock-y", `${rect.top}px`);
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const stageRect = stageGeometry()?.rect;
      const dockRect = drag.dock.getBoundingClientRect();
      const leftBound = Math.max(8, stageRect?.left ?? 8);
      const rightBound = Math.max(
        leftBound,
        Math.min(
          window.innerWidth - dockRect.width - 8,
          (stageRect?.right ?? window.innerWidth) - dockRect.width,
        ),
      );
      const topBound = Math.max(8, stageRect?.top ?? 8);
      const bottomBound = Math.max(
        topBound,
        Math.min(
          window.innerHeight - dockRect.height - 8,
          (stageRect?.bottom ?? window.innerHeight) - dockRect.height,
        ),
      );
      const x = clamp(event.clientX - drag.offsetX, leftBound, rightBound);
      const y = clamp(event.clientY - drag.offsetY, topBound, bottomBound);
      drag.dock.style.setProperty("--tadeon-dock-x", `${x}px`);
      drag.dock.style.setProperty("--tadeon-dock-y", `${y}px`);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const x = Number.parseFloat(drag.dock.style.getPropertyValue("--tadeon-dock-x"));
      const y = Number.parseFloat(drag.dock.style.getPropertyValue("--tadeon-dock-y"));
      delete drag.dock.dataset.tadeonDockDragging;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        window.localStorage.setItem(DOCK_POSITION_KEY, JSON.stringify({ x, y }));
      }
      drag = null;
    };

    const resizeObserver = new ResizeObserver(syncGeometry);
    const domObserver = new MutationObserver(() => {
      syncDock();
      syncGeometry();
    });

    const bind = () => {
      const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
      if (stage) resizeObserver.observe(stage);
      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "data-open", "data-state"],
      });
      syncGeometry();
      syncDock();
    };

    const frame = window.requestAnimationFrame(bind);
    window.addEventListener("resize", syncGeometry);
    window.addEventListener("scroll", syncGeometry, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      domObserver.disconnect();
      window.removeEventListener("resize", syncGeometry);
      window.removeEventListener("scroll", syncGeometry, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      delete html.dataset.tadeonTabletopToprail;
      delete html.dataset.tadeonCreativeDock;
      delete html.dataset.tadeonTabletopSelectionActive;
      [
        "--tadeon-tabletop-stage-top",
        "--tadeon-tabletop-stage-right",
        "--tadeon-tabletop-stage-bottom",
        "--tadeon-tabletop-stage-width",
        "--tadeon-tabletop-stage-height",
        "--tadeon-tabletop-stage-center",
      ].forEach((property) => html.style.removeProperty(property));
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.tadeonTabletopToprail = topRailCollapsed
      ? "collapsed"
      : "expanded";
    window.localStorage.setItem(TOP_RAIL_KEY, topRailCollapsed ? "1" : "0");
  }, [mounted, topRailCollapsed]);

  if (!mounted) return null;

  const openSetup = () => {
    document.querySelector<HTMLButtonElement>(".tadeon-smart-setup__launcher")?.click();
  };

  return createPortal(
    <div className="tadeon-tabletop-toprail-controls" aria-label="Controles superiores da Mesa">
      {dockCollapsed && (
        <button
          type="button"
          className="tadeon-tabletop-toprail-setup"
          aria-label="Abrir Setup da Mesa"
          title="Setup da Mesa"
          onClick={openSetup}
        >
          <WandSparkles aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        className="tadeon-tabletop-toprail-toggle"
        aria-label={topRailCollapsed ? "Expandir barra superior da Mesa" : "Recolher barra superior da Mesa"}
        aria-pressed={topRailCollapsed}
        title={topRailCollapsed ? "Expandir controles superiores" : "Recolher controles para a lateral"}
        onClick={() => setTopRailCollapsed((current) => !current)}
      >
        {topRailCollapsed ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
      </button>
    </div>,
    document.body,
  );
}
