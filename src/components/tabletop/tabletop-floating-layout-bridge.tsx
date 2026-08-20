import { useEffect } from "react";
import "@/styles/tabletop-floating-layout-236.css";

const FLOATING_SELECTORS = [
  ".tadeon-tabletop-progressive-dock",
  ".tadeon-tactical-dock",
  ".tadeon-tabletop-selection-actions",
  ".tadeon-tabletop-now",
  ".tadeon-placeables",
  ".tadeon-creative-dock",
  ".tadeon-semantic-transform",
  ".tadeon-nexus-tabletop-locator",
  ".tadeon-tabletop-reliability-strip",
  ".tadeon-director-enhancement-bar",
  ".tadeon-tabletop-precision-editor",
] as const;

const HEIGHT_VARIABLES: Array<[string, string]> = [
  [".tadeon-tabletop-progressive-dock", "--tadeon-tabletop-progressive-h"],
  [".tadeon-tactical-dock", "--tadeon-tabletop-tactical-h"],
  [".tadeon-tabletop-selection-actions", "--tadeon-tabletop-selection-h"],
  [".tadeon-tabletop-now", "--tadeon-tabletop-now-h"],
  [".tadeon-placeables", "--tadeon-tabletop-placeables-h"],
  [".tadeon-semantic-transform", "--tadeon-tabletop-semantic-h"],
  [".tadeon-nexus-tabletop-locator", "--tadeon-tabletop-locator-h"],
  [".tadeon-creative-dock", "--tadeon-tabletop-creative-h"],
];

function visible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function heightFor(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  return visible(element) ? Math.ceil(element.getBoundingClientRect().height) : 0;
}

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function edgeInsets(elements: HTMLElement[]) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 10;
  let top = 0;
  let right = 0;
  let bottom = 0;
  let left = 0;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    const isWide = rect.width > vw * 0.58;
    const isTall = rect.height > vh * 0.58;

    if (rect.top <= vh * 0.28 && !isTall) top = Math.max(top, rect.bottom + margin);
    if (rect.bottom >= vh * 0.72 && !isTall) bottom = Math.max(bottom, vh - rect.top + margin);
    if (rect.left <= vw * 0.22 && !isWide) left = Math.max(left, rect.right + margin);
    if (rect.right >= vw * 0.78 && !isWide) right = Math.max(right, vw - rect.left + margin);
  }

  return { top, right, bottom, left };
}

function openUtility() {
  const candidates: Array<[string, string]> = [
    [".tadeon-tabletop-now[data-open=\"true\"]", "now"],
    [".tadeon-placeables[data-open=\"true\"]", "placeables"],
    [".tadeon-creative-dock[data-open=\"true\"]", "creative"],
    [".tadeon-tabletop-precision-editor", "precision"],
    [".tadeon-tabletop-panel[data-mobile-open=\"true\"]", "inspector"],
  ];
  return candidates.find(([selector]) => visible(document.querySelector(selector)))?.[1] ?? "none";
}

export function TabletopFloatingLayoutBridge() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.location.pathname.startsWith("/tabletop")) return;

    const root = document.documentElement;
    let frame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const observed = new Set<Element>();

    const sync = () => {
      frame = 0;
      const studio = document.querySelector<HTMLElement>(".tadeon-tabletop-studio");
      if (!studio) return;

      for (const [selector, variable] of HEIGHT_VARIABLES) setPx(root, variable, heightFor(selector));

      const floating = FLOATING_SELECTORS
        .map((selector) => document.querySelector<HTMLElement>(selector))
        .filter(visible);
      const insets = edgeInsets(floating);
      setPx(root, "--tadeon-tabletop-safe-top", insets.top);
      setPx(root, "--tadeon-tabletop-safe-right", insets.right);
      setPx(root, "--tadeon-tabletop-safe-bottom", insets.bottom);
      setPx(root, "--tadeon-tabletop-safe-left", insets.left);
      root.dataset.tadeonTabletopUtility = openUtility();

      resizeObserver ??= new ResizeObserver(schedule);
      for (const element of floating) {
        if (observed.has(element)) continue;
        observed.add(element);
        resizeObserver.observe(element);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-open", "data-mobile-open", "data-state", "style"],
    });
    window.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      delete root.dataset.tadeonTabletopUtility;
      for (const [, variable] of HEIGHT_VARIABLES) root.style.removeProperty(variable);
      for (const variable of [
        "--tadeon-tabletop-safe-top",
        "--tadeon-tabletop-safe-right",
        "--tadeon-tabletop-safe-bottom",
        "--tadeon-tabletop-safe-left",
      ]) root.style.removeProperty(variable);
    };
  }, []);

  return null;
}
