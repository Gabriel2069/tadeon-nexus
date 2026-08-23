import { useEffect } from "react";
import "@/styles/tabletop-floating-layout-236.css";
import "@/styles/tabletop-floating-menu-shift-236.css";
import "@/styles/tabletop-floating-layout-238.css";

const CORE_FLOATING_SELECTORS = [
  ".tadeon-tabletop-progressive-dock",
  ".tadeon-tactical-dock",
  ".tadeon-tabletop-selection-actions",
  ".tadeon-semantic-transform",
  ".tadeon-nexus-tabletop-locator",
  ".tadeon-tabletop-reliability-strip",
  ".tadeon-director-enhancement-bar",
  ".tadeon-tabletop-precision-editor",
] as const;

const APP_BOTTOM_SELECTORS = [
  ".tadeon-mobile-dock",
  ".tadeon-mobile-bottom-nav",
  ".tadeon-bottom-navigation",
  ".tadeon-app-bottom-nav",
] as const;

const CONSTRAINED_MENU_SELECTORS = [
  ".tadeon-tabletop-context-menu",
  ".tadeon-rename-popover",
  ".tadeon-tactical-dock__power-list",
] as const;

const HEIGHT_VARIABLES: Array<[string, string]> = [
  [".tadeon-tabletop-progressive-dock", "--tadeon-tabletop-progressive-h"],
  [".tadeon-tactical-dock", "--tadeon-tabletop-tactical-h"],
  [".tadeon-tabletop-selection-actions", "--tadeon-tabletop-selection-h"],
  [".tadeon-tabletop-toolbar", "--tadeon-tabletop-toolbar-h"],
  [".tadeon-tabletop-reliability-strip", "--tadeon-tabletop-reliability-h"],
  [".tadeon-tabletop-now", "--tadeon-tabletop-now-h"],
  [".tadeon-placeables", "--tadeon-tabletop-placeables-h"],
  [".tadeon-semantic-transform", "--tadeon-tabletop-semantic-h"],
  [".tadeon-nexus-tabletop-locator", "--tadeon-tabletop-locator-h"],
  [".tadeon-creative-dock", "--tadeon-tabletop-creative-h"],
];

type Insets = { top: number; right: number; bottom: number; left: number };
type StageBounds = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

function visible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  )
    return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function heightFor(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  return visible(element)
    ? Math.ceil(element.getBoundingClientRect().height)
    : 0;
}

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function activeSurface(
  rootSelector: string,
  handleSelector: string,
  panelSelector: string,
) {
  const root = document.querySelector<HTMLElement>(rootSelector);
  if (!visible(root)) return null;
  const open = root.dataset.open === "true";
  const preferred = document.querySelector<HTMLElement>(
    open ? panelSelector : handleSelector,
  );
  return visible(preferred) ? preferred : root;
}

function floatingSurfaces() {
  const surfaces = CORE_FLOATING_SELECTORS.map((selector) =>
    document.querySelector<HTMLElement>(selector),
  ).filter(visible);
  const utilitySurfaces = [
    activeSurface(
      ".tadeon-tabletop-now",
      ".tadeon-tabletop-now__handle",
      ".tadeon-tabletop-now__panel",
    ),
    activeSurface(
      ".tadeon-placeables",
      ".tadeon-placeables__handle",
      ".tadeon-placeables__panel",
    ),
    activeSurface(
      ".tadeon-creative-dock",
      ".tadeon-creative-dock__handle",
      ".tadeon-creative-dock__panel",
    ),
  ].filter(visible);
  return [...surfaces, ...utilitySurfaces];
}

function bottomChromeHeight() {
  const vh = window.innerHeight;
  let reserved = 0;
  for (const selector of APP_BOTTOM_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      if (!visible(element)) return;
      const rect = element.getBoundingClientRect();
      if (rect.bottom < vh * 0.72) return;
      reserved = Math.max(reserved, vh - Math.max(0, rect.top));
    });
  }
  return Math.min(vh * 0.35, reserved);
}

function isTabletLike() {
  const shortestScreenSide = Math.min(
    window.screen.width,
    window.screen.height,
  );
  return (
    navigator.maxTouchPoints > 0 &&
    shortestScreenSide >= 600 &&
    shortestScreenSide <= 1100
  );
}

function measureStageGeometry(appBottom: number): StageBounds | null {
  const stage =
    document.querySelector<HTMLElement>("[data-tabletop-stage-portal]") ??
    document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
  if (!visible(stage)) return null;

  const rect = stage.getBoundingClientRect();
  const viewport = window.visualViewport;
  const viewportLeft = viewport?.offsetLeft ?? 0;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportRight = viewportLeft + (viewport?.width ?? window.innerWidth);
  const viewportBottom =
    viewportTop + (viewport?.height ?? window.innerHeight) - appBottom;
  const gap = 8;
  const left = Math.max(rect.left, viewportLeft) + gap;
  const top = Math.max(rect.top, viewportTop) + gap;
  const right = Math.min(rect.right, viewportRight) - gap;
  const bottom = Math.min(rect.bottom, viewportBottom) - gap;
  if (right - left < 48 || bottom - top < 48) return null;

  return {
    top,
    right,
    bottom,
    left,
    width: right - left,
    height: bottom - top,
  };
}

function edgeInsets(elements: HTMLElement[], appBottom: number): Insets {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 10;
  let top = 0;
  let right = 0;
  let bottom = appBottom;
  let left = 0;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const isWide = rect.width > vw * 0.58;
    const isTall = rect.height > vh * 0.58;

    if (centerY < vh * 0.3 && !isTall)
      top = Math.max(top, rect.bottom + margin);
    if (centerY > vh * 0.7 && !isTall)
      bottom = Math.max(bottom, vh - rect.top + margin);
    if (centerX < vw * 0.28 && !isWide)
      left = Math.max(left, rect.right + margin);
    if (centerX > vw * 0.72 && !isWide)
      right = Math.max(right, vw - rect.left + margin);
  }

  return { top, right, bottom, left };
}

function constrainMenus(insets: Insets, stageBounds: StageBounds | null) {
  const stageLeft = stageBounds?.left ?? 8;
  const stageRight = stageBounds?.right ?? window.innerWidth - 8;
  const stageTop = stageBounds?.top ?? 8;
  const stageBottom = stageBounds?.bottom ?? window.innerHeight - 8;

  let left = Math.max(stageLeft, insets.left + 8);
  let right = Math.min(stageRight, window.innerWidth - insets.right - 8);
  let top = Math.max(stageTop, insets.top + 8);
  let bottom = Math.min(stageBottom, window.innerHeight - insets.bottom - 8);

  if (right - left < 120) {
    left = stageLeft;
    right = stageRight;
  }
  if (bottom - top < 96) {
    top = stageTop;
    bottom = stageBottom;
  }

  for (const selector of CONSTRAINED_MENU_SELECTORS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      if (!visible(element)) return;
      const rect = element.getBoundingClientRect();
      let x = 0;
      let y = 0;
      if (rect.left < left) x = left - rect.left;
      else if (rect.right > right) x = right - rect.right;
      if (rect.top < top) y = top - rect.top;
      else if (rect.bottom > bottom) y = bottom - rect.bottom;
      element.style.setProperty(
        "--tadeon-tabletop-safe-shift-x",
        `${Math.round(x)}px`,
      );
      element.style.setProperty(
        "--tadeon-tabletop-safe-shift-y",
        `${Math.round(y)}px`,
      );
    });
  }
}

function openUtility() {
  const candidates: Array<[string, string]> = [
    ['.tadeon-tabletop-now[data-open="true"]', "now"],
    ['.tadeon-placeables[data-open="true"]', "placeables"],
    ['.tadeon-creative-dock[data-open="true"]', "creative"],
    [".tadeon-tabletop-precision-editor", "precision"],
    ['.tadeon-tabletop-panel[data-mobile-open="true"]', "inspector"],
  ];
  return (
    candidates.find(([selector]) =>
      visible(document.querySelector(selector)),
    )?.[1] ?? "none"
  );
}

export function TabletopFloatingLayoutBridge() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.location.pathname.startsWith("/tabletop")
    )
      return;

    const root = document.documentElement;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let stageBounds: StageBounds | null = null;
    let measuredStage: HTMLElement | null = null;
    const observed = new Set<Element>();
    const settleTimers: number[] = [];

    const schedule = (remeasure = false) => {
      if (remeasure) stageBounds = null;
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    const sync = () => {
      frame = 0;
      if (!document.querySelector(".tadeon-tabletop-studio")) return;

      root.dataset.tadeonTabletopTablet = isTabletLike() ? "true" : "false";
      for (const [selector, variable] of HEIGHT_VARIABLES)
        setPx(root, variable, heightFor(selector));
      const appBottom = bottomChromeHeight();
      setPx(root, "--tadeon-tabletop-app-bottom", appBottom);

      const stage =
        document.querySelector<HTMLElement>("[data-tabletop-stage-portal]") ??
        document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
      if (stage !== measuredStage) {
        measuredStage = stage;
        stageBounds = null;
      }
      stageBounds ??= measureStageGeometry(appBottom);

      const floating = floatingSurfaces();
      const insets = edgeInsets(floating, appBottom);
      setPx(root, "--tadeon-tabletop-safe-top", insets.top);
      setPx(root, "--tadeon-tabletop-safe-right", insets.right);
      setPx(root, "--tadeon-tabletop-safe-bottom", insets.bottom);
      setPx(root, "--tadeon-tabletop-safe-left", insets.left);
      root.dataset.tadeonTabletopUtility = openUtility();
      constrainMenus(insets, stageBounds);

      resizeObserver ??= new ResizeObserver(() => schedule(true));
      const measurable = [
        ...(visible(stage) ? [stage] : []),
        ...APP_BOTTOM_SELECTORS.flatMap((selector) =>
          [...document.querySelectorAll<HTMLElement>(selector)].filter(visible),
        ),
      ];
      for (const element of measurable) {
        if (observed.has(element)) continue;
        observed.add(element);
        resizeObserver.observe(element);
      }
    };

    const forceRemeasure = () => schedule(true);
    const mutationObserver = new MutationObserver(() => schedule(false));
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-open", "data-mobile-open", "data-state"],
    });

    window.addEventListener("resize", forceRemeasure, { passive: true });
    window.addEventListener("orientationchange", forceRemeasure, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", forceRemeasure, {
      passive: true,
    });

    // A geometria assenta durante a abertura do chunk; depois disso fica congelada.
    // Nenhum listener de scroll reposiciona o chrome.
    for (const delay of [0, 80, 180, 360, 700, 1200]) {
      settleTimers.push(window.setTimeout(forceRemeasure, delay));
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      while (settleTimers.length) {
        const timer = settleTimers.pop();
        if (timer !== undefined) window.clearTimeout(timer);
      }
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", forceRemeasure);
      window.removeEventListener("orientationchange", forceRemeasure);
      window.visualViewport?.removeEventListener("resize", forceRemeasure);
      delete root.dataset.tadeonTabletopUtility;
      delete root.dataset.tadeonTabletopTablet;

      for (const [, variable] of HEIGHT_VARIABLES)
        root.style.removeProperty(variable);
      for (const variable of [
        "--tadeon-tabletop-app-bottom",
        "--tadeon-tabletop-safe-top",
        "--tadeon-tabletop-safe-right",
        "--tadeon-tabletop-safe-bottom",
        "--tadeon-tabletop-safe-left",
      ])
        root.style.removeProperty(variable);
    };
  }, []);

  return null;
}
