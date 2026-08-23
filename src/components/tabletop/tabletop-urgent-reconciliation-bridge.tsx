import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, WandSparkles } from "lucide-react";
import "@/styles/tabletop-map-chrome-repair.css";

const RELIABILITY_KEY = "tadeon.tabletop.reliability.collapsed";
const DOCK_POSITION_KEY = "tadeon.tabletop.creative-dock.position.v2";

function stageGeometry() {
  const stage = document.querySelector<HTMLElement>(
    "[data-tabletop-stage-portal]",
  );
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
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number")
      return null;
    return { x: parsed.x, y: parsed.y };
  } catch {
    return null;
  }
}

export function TabletopUrgentReconciliationBridge() {
  const [mounted, setMounted] = useState(false);
  const [reliabilityCollapsed, setReliabilityCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(RELIABILITY_KEY) === "1";
  });

  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    setMounted(true);
    const html = document.documentElement;
    let drag: {
      dock: HTMLElement;
      pointerId: number;
      offsetX: number;
      offsetY: number;
    } | null = null;

    const syncDock = () => {
      const dock = document.querySelector<HTMLElement>(".tadeon-creative-dock");
      html.dataset.tadeonCreativeDock =
        dock?.dataset.open === "true" ? "expanded" : "collapsed";
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
      if (
        !target ||
        target.closest("button, input, textarea, select, a, [role='button']")
      )
        return;
      const header = target.closest<HTMLElement>(
        '.tadeon-creative-dock[data-open="true"] .tadeon-creative-dock__panel > header',
      );
      const geometry = stageGeometry();
      const dock = header?.closest<HTMLElement>(".tadeon-creative-dock");
      if (!header || !geometry || !dock) return;
      const rect = dock.getBoundingClientRect();
      drag = {
        dock,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
      };
      dock.dataset.tadeonDockDragging = "true";
      dock.dataset.tadeonDockDragged = "true";
      dock.style.setProperty(
        "--tadeon-dock-x",
        `${rect.left - geometry.rect.left}px`,
      );
      dock.style.setProperty(
        "--tadeon-dock-y",
        `${rect.top - geometry.rect.top}px`,
      );
      header.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const geometry = stageGeometry();
      if (!geometry) return;
      const dockRect = drag.dock.getBoundingClientRect();
      const gap = 8;
      const leftBound = gap;
      const rightBound = Math.max(
        leftBound,
        geometry.rect.width - dockRect.width - gap,
      );
      const topBound = gap;
      const bottomBound = Math.max(
        topBound,
        geometry.rect.height - dockRect.height - gap,
      );
      const x = clamp(
        event.clientX - geometry.rect.left - drag.offsetX,
        leftBound,
        rightBound,
      );
      const y = clamp(
        event.clientY - geometry.rect.top - drag.offsetY,
        topBound,
        bottomBound,
      );
      drag.dock.style.setProperty("--tadeon-dock-x", `${x}px`);
      drag.dock.style.setProperty("--tadeon-dock-y", `${y}px`);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const x = Number.parseFloat(
        drag.dock.style.getPropertyValue("--tadeon-dock-x"),
      );
      const y = Number.parseFloat(
        drag.dock.style.getPropertyValue("--tadeon-dock-y"),
      );
      delete drag.dock.dataset.tadeonDockDragging;
      if (Number.isFinite(x) && Number.isFinite(y)) {
        window.localStorage.setItem(
          DOCK_POSITION_KEY,
          JSON.stringify({ x, y }),
        );
      }
      drag = null;
    };

    const domObserver = new MutationObserver(syncDock);
    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-open", "data-state"],
    });
    const frame = window.requestAnimationFrame(syncDock);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("pointermove", onPointerMove, true);
    window.addEventListener("pointerup", onPointerUp, true);
    window.addEventListener("pointercancel", onPointerUp, true);

    return () => {
      window.cancelAnimationFrame(frame);
      domObserver.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("pointermove", onPointerMove, true);
      window.removeEventListener("pointerup", onPointerUp, true);
      window.removeEventListener("pointercancel", onPointerUp, true);
      delete html.dataset.tadeonTabletopReliability;
      delete html.dataset.tadeonCreativeDock;
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.tadeonTabletopReliability =
      reliabilityCollapsed ? "collapsed" : "expanded";
    window.localStorage.setItem(
      RELIABILITY_KEY,
      reliabilityCollapsed ? "1" : "0",
    );
  }, [mounted, reliabilityCollapsed]);

  const stage =
    typeof document === "undefined"
      ? null
      : document.querySelector<HTMLElement>("[data-tabletop-stage-portal]");
  if (!mounted || !stage) return null;

  const openSetup = () => {
    document
      .querySelector<HTMLButtonElement>(".tadeon-smart-setup__launcher")
      ?.click();
  };

  return createPortal(
    <div
      className="tadeon-tabletop-toprail-controls"
      aria-label="Controles flutuantes da Mesa"
    >
      <button
        type="button"
        className="tadeon-tabletop-toprail-toggle"
        aria-label={
          reliabilityCollapsed
            ? "Expandir status de autosave, áudio e editor"
            : "Minimizar status de autosave, áudio e editor"
        }
        aria-pressed={reliabilityCollapsed}
        title={
          reliabilityCollapsed
            ? "Expandir Autosave, Áudio e Editor"
            : "Minimizar Autosave, Áudio e Editor"
        }
        onClick={() => setReliabilityCollapsed((current) => !current)}
      >
        {reliabilityCollapsed ? (
          <ChevronLeft aria-hidden="true" />
        ) : (
          <ChevronRight aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        className="tadeon-tabletop-toprail-setup"
        aria-label="Abrir Setup da Mesa"
        title="Setup da Mesa"
        onClick={openSetup}
      >
        <WandSparkles aria-hidden="true" />
      </button>
    </div>,
    stage,
  );
}
