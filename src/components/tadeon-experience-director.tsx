import { createFrameBatch } from "@/lib/frame-batch";
import { useEffect } from "react";
import "@/styles/tadeon-experience-director.css";
const INTERACTIVE = [
  "a",
  "button",
  "[role='button']",
  "[data-slot='dialog-trigger']",
  "[data-slot='popover-trigger']",
  "[data-slot='select-trigger']",
  "[data-slot='tabs-trigger']",
].join(",");

const SURFACES = [
  ".tadeon-surface",
  ".tadeon-state-panel",
  ".tadeon-auth-shell",
  ".tadeon-link-panel",
  ".tadeon-skill-modifier-panel",
].join(",");

const REVEAL = [
  ".tadeon-page > :not(.tadeon-continuity-hero)",
  ".tadeon-route-stage > *",
  ".tadeon-state-panel",
].join(",");

type Bindings = Map<HTMLElement, () => void>;
const ATMOSPHERE = ".tadeon-atmosphere, .tadeon-atmosphere-layer, [data-tadeon-atmosphere]";
const STATEFUL = ".tadeon-sheet-condition-chip, [aria-live='polite']";

function markElement(element: HTMLElement) {
  if (element.dataset.tadeonDirected === "true" || element.dataset.materialSurface) return;
  element.dataset.tadeonDirected = "true";
  element.style.setProperty("--tadeon-index", String(getChildIndex(element)));
}

function markMaterial(element: HTMLElement) {
  if (element.dataset.materialSurface) return;
  if (element.classList.contains("tadeon-state-panel")) {
    element.dataset.tadeonMaterial = "state";
  } else if (element.classList.contains("tadeon-skill-modifier-panel")) {
    element.dataset.tadeonMaterial = "record";
  } else if (element.classList.contains("tadeon-link-panel")) {
    element.dataset.tadeonMaterial = "fragment";
  } else if (element.classList.contains("tadeon-surface")) {
    element.dataset.tadeonMaterial = "archive";
  }
}

function markState(element: HTMLElement) {
  if (element.dataset.materialSurface) return;
  const text = (element.textContent ?? "").toLocaleLowerCase("pt-BR");
  if (element.classList.contains("tadeon-sheet-condition-chip")) {
    element.dataset.tadeonState = element.dataset.conditionSeverity ?? "normal";
  }
  if (text.includes("salvando")) element.dataset.tadeonState = "saving";
  else if (text.includes("falha ao salvar")) element.dataset.tadeonState = "error";
  else if (text.includes("offline")) element.dataset.tadeonState = "offline";
  else if (text.includes("alterações pendentes")) element.dataset.tadeonState = "pending";
  else if (text.includes("tudo salvo") || text.includes("salvo às"))
    element.dataset.tadeonState = "saved";
}

function getChildIndex(element: HTMLElement) {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Math.min(8, Math.max(0, Array.from(parent.children).indexOf(element)));
}

function ensurePointerSheen(element: HTMLElement, bindings: Bindings) {
  if (
    element.dataset.materialSurface ||
    bindings.has(element) ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const sheen = document.createElement("span");
  sheen.className = "tadeon-pointer-sheen";
  sheen.setAttribute("aria-hidden", "true");
  element.appendChild(sheen);
  let frame: number | null = null;
  let point = { x: 0, y: 0 };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || document.hidden) return;
    point = { x: event.clientX, y: event.clientY };
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (
        !element.isConnected ||
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        return;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      sheen.style.setProperty(
        "--tadeon-pointer-x",
        `${((point.x - rect.left) / rect.width) * 100}%`,
      );
      sheen.style.setProperty(
        "--tadeon-pointer-y",
        `${((point.y - rect.top) / rect.height) * 100}%`,
      );
      sheen.dataset.active = "true";
    });
  };
  const leave = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    sheen.dataset.active = "false";
  };
  element.addEventListener("pointermove", move, { passive: true });
  element.addEventListener("pointerleave", leave, { passive: true });
  bindings.set(element, () => {
    leave();
    element.removeEventListener("pointermove", move);
    element.removeEventListener("pointerleave", leave);
    sheen.remove();
  });
}

function installAtmosphericParallax(stage: HTMLElement, bindings: Bindings) {
  // Only the scene atmosphere consumes these coordinates. Ordinary pages do not.
  if (
    bindings.has(stage) ||
    !stage.querySelector(ATMOSPHERE) ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  let frame: number | null = null;
  let point: { x: number; y: number } | null = null;
  const render = () => {
    frame = null;
    if (
      !stage.isConnected ||
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let x = 0,
      y = 0;
    if (point) {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      x = Math.max(-1, Math.min(1, ((point.x - rect.left) / rect.width - 0.5) * 2));
      y = Math.max(-1, Math.min(1, ((point.y - rect.top) / rect.height - 0.5) * 2));
    }
    stage.style.setProperty("--tadeon-parallax-x", `${(x * 4).toFixed(2)}px`);
    stage.style.setProperty("--tadeon-parallax-y", `${(y * 3).toFixed(2)}px`);
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(render);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || document.hidden) return;
    point = { x: event.clientX, y: event.clientY };
    schedule();
  };
  const leave = () => {
    point = null;
    schedule();
  };
  stage.addEventListener("pointermove", move, { passive: true });
  stage.addEventListener("pointerleave", leave, { passive: true });
  bindings.set(stage, () => {
    if (frame !== null) cancelAnimationFrame(frame);
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerleave", leave);
    stage.style.removeProperty("--tadeon-parallax-x");
    stage.style.removeProperty("--tadeon-parallax-y");
  });
}

const CANDIDATES = [REVEAL, SURFACES, STATEFUL, INTERACTIVE].join(",");
function processNode(element: HTMLElement, bindings: Bindings) {
  if (element.matches(REVEAL) || element.matches(SURFACES)) {
    markElement(element);
    markMaterial(element);
    markState(element);
  }
  if (element.matches(SURFACES)) ensurePointerSheen(element, bindings);
  if (element.matches(STATEFUL)) markState(element);
  if (element.matches(INTERACTIVE)) markElement(element);
}
function processRoot(root: ParentNode, bindings: Bindings) {
  root
    .querySelectorAll<HTMLElement>(CANDIDATES)
    .forEach((element) => processNode(element, bindings));
}
function processElement(element: HTMLElement, bindings: Bindings) {
  if (!element.isConnected || element.classList.contains("tadeon-pointer-sheen")) return;
  processNode(element, bindings);
  processRoot(element, bindings);
  const stage =
    element.closest<HTMLElement>(".tadeon-route-stage") ??
    element.querySelector<HTMLElement>(".tadeon-route-stage");
  if (stage) installAtmosphericParallax(stage, bindings);
}

export function TadeonExperienceDirector() {
  useEffect(() => {
    const bindings: Bindings = new Map();
    let fullFrame: number | null = null;
    const batch = createFrameBatch<MutationRecord>(
      (mutations) => {
        const roots = new Set<HTMLElement>();
        const states = new Set<HTMLElement>();
        for (const mutation of mutations) {
          const target =
            mutation.target instanceof HTMLElement
              ? mutation.target
              : mutation.target.parentElement;
          const state = target?.closest<HTMLElement>(STATEFUL);
          if (state) states.add(state);
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) roots.add(node);
          });
        }
        // A parent and its added descendants may be reported in the same frame.
        // Visit that subtree once, preserving every independent root and live state.
        for (const root of roots) {
          let parent = root.parentElement;
          while (parent && !roots.has(parent)) parent = parent.parentElement;
          if (!parent) processElement(root, bindings);
        }
        states.forEach((state) => {
          if (state.isConnected) markState(state);
        });
        for (const [element, dispose] of bindings) {
          if (!element.isConnected) {
            dispose();
            bindings.delete(element);
          }
        }
      },
      (callback) => requestAnimationFrame(callback),
      (handle) => cancelAnimationFrame(handle),
    );
    const scheduleFull = () => {
      if (fullFrame !== null) cancelAnimationFrame(fullFrame);
      fullFrame = requestAnimationFrame(() => {
        fullFrame = null;
        const stage = document.querySelector<HTMLElement>(".tadeon-route-stage");
        if (stage) processElement(stage, bindings);
        else processRoot(document, bindings);
      });
    };
    scheduleFull();
    const observer = new MutationObserver((mutations) => batch.add(mutations));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    window.addEventListener("popstate", scheduleFull);
    return () => {
      observer.disconnect();
      batch.dispose();
      if (fullFrame !== null) cancelAnimationFrame(fullFrame);
      bindings.forEach((dispose) => dispose());
      bindings.clear();
      window.removeEventListener("popstate", scheduleFull);
    };
  }, []);
  return null;
}
