import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";

const TOP_RAIL_KEY = "tadeon.tabletop.toprail.collapsed";

function neutralSelectionSurfaces(active: boolean) {
  const surfaces = document.querySelectorAll<HTMLElement>(
    [
      ".tadeon-tabletop-panel-backdrop",
      ".tadeon-tabletop-panel-frame",
      '[class*="tabletop"][class*="backdrop"]',
      '[class*="tabletop"][class*="overlay"]',
      '[class*="selection"][class*="backdrop"]',
      '[class*="selection"][class*="overlay"]',
    ].join(","),
  );

  surfaces.forEach((surface) => {
    if (surface.classList.contains("tadeon-tabletop-panel-frame")) return;
    if (active) surface.dataset.tadeonSelectionSurface = "neutral";
    else delete surface.dataset.tadeonSelectionSurface;
  });
}

function closeMobileInspectorForSelection() {
  if (window.innerWidth >= 1180) return;
  const panel = document.querySelector<HTMLElement>(
    '.tadeon-tabletop-panel[data-mobile-open="true"]',
  );
  if (!panel) return;

  const backdrop = document.querySelector<HTMLButtonElement>(
    '.tadeon-tabletop-panel-backdrop[data-open="true"]',
  );
  if (backdrop) {
    backdrop.click();
    return;
  }

  const toggle = document.querySelector<HTMLButtonElement>(
    '.tadeon-tabletop-studio__header button[aria-expanded="true"][aria-label*="painel" i]',
  );
  toggle?.click();
}

export function TabletopUrgentReconciliationBridge() {
  const previousSelectedCountRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [topRailCollapsed, setTopRailCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TOP_RAIL_KEY) === "1";
  });

  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    setMounted(true);
    const html = document.documentElement;

    const syncGeometry = () => {
      const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      html.style.setProperty("--tadeon-tabletop-stage-top", `${Math.max(0, rect.top)}px`);
      html.style.setProperty("--tadeon-tabletop-stage-bottom", `${Math.max(0, window.innerHeight - rect.bottom)}px`);
      html.style.setProperty("--tadeon-tabletop-stage-height", `${rect.height}px`);
    };

    const syncSelection = () => {
      const selected = currentTabletopRuntime()?.snapshot().selectedIds.length ?? 0;
      const active = selected > 0;
      const enteredSelection = previousSelectedCountRef.current === 0 && selected > 0;
      previousSelectedCountRef.current = selected;

      if (active) html.dataset.tadeonTabletopSelectionActive = "true";
      else delete html.dataset.tadeonTabletopSelectionActive;
      neutralSelectionSurfaces(active);

      // Selecting an entity must not automatically turn the inspector into a
      // modal sheet. Close only on the transition into selection; if the user
      // explicitly opens the contextual panel afterwards, keep it usable.
      if (enteredSelection) closeMobileInspectorForSelection();
    };

    const observer = new ResizeObserver(syncGeometry);
    const bindStage = () => {
      const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
      if (stage) observer.observe(stage);
      syncGeometry();
      syncSelection();
    };

    const frame = window.requestAnimationFrame(bindStage);
    window.addEventListener("resize", syncGeometry);
    window.addEventListener("scroll", syncGeometry, true);
    window.addEventListener("tadeon-tabletop-render", syncSelection);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", syncSelection);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", syncGeometry);
      window.removeEventListener("scroll", syncGeometry, true);
      window.removeEventListener("tadeon-tabletop-render", syncSelection);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", syncSelection);
      previousSelectedCountRef.current = 0;
      delete html.dataset.tadeonTabletopSelectionActive;
      delete html.dataset.tadeonTabletopToprail;
      html.style.removeProperty("--tadeon-tabletop-stage-top");
      html.style.removeProperty("--tadeon-tabletop-stage-bottom");
      html.style.removeProperty("--tadeon-tabletop-stage-height");
      neutralSelectionSurfaces(false);
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

  return createPortal(
    <button
      type="button"
      className="tadeon-tabletop-toprail-toggle"
      aria-label={topRailCollapsed ? "Expandir barra superior da Mesa" : "Recolher barra superior da Mesa"}
      aria-pressed={topRailCollapsed}
      title={topRailCollapsed ? "Expandir controles superiores" : "Recolher controles para a lateral"}
      onClick={() => setTopRailCollapsed((current) => !current)}
    >
      {topRailCollapsed ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
    </button>,
    document.body,
  );
}
