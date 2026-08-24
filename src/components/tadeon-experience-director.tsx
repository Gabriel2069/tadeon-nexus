import { useEffect } from "react";
import "../styles/tadeon-header-bars-navigation-motion.css";

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
  ".tadeon-dashboard-hero",
  ".tadeon-sheet-card",
  ".tadeon-state-panel",
  ".tadeon-auth-shell",
  ".tadeon-link-panel",
  ".tadeon-skill-modifier-panel",
].join(",");

const REVEAL = [
  ".tadeon-page > *",
  ".tadeon-route-stage > *",
  ".tadeon-sheet-card",
  ".tadeon-dashboard-signal",
  ".tadeon-state-panel",
].join(",");

const STATEFUL = ".tadeon-sheet-condition-chip, [aria-live='polite']";

function markElement(element: HTMLElement) {
  if (element.dataset.tadeonDirected === "true") return;
  element.dataset.tadeonDirected = "true";
  element.style.setProperty("--tadeon-index", String(getChildIndex(element)));
}

function markMaterial(element: HTMLElement) {
  if (element.classList.contains("tadeon-dashboard-hero")) {
    element.dataset.tadeonMaterial = "chapter";
  } else if (element.classList.contains("tadeon-sheet-card")) {
    element.dataset.tadeonMaterial = "relic";
  } else if (element.classList.contains("tadeon-state-panel")) {
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
  const text = (element.textContent ?? "").toLocaleLowerCase("pt-BR");
  if (element.classList.contains("tadeon-sheet-condition-chip")) {
    element.dataset.tadeonState = element.dataset.conditionSeverity ?? "normal";
  }
  if (text.includes("salvando")) element.dataset.tadeonState = "saving";
  else if (text.includes("falha ao salvar")) element.dataset.tadeonState = "error";
  else if (text.includes("offline")) element.dataset.tadeonState = "offline";
  else if (text.includes("alterações pendentes")) element.dataset.tadeonState = "pending";
  else if (text.includes("tudo salvo") || text.includes("salvo às")) element.dataset.tadeonState = "saved";
}

function getChildIndex(element: HTMLElement) {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Math.min(8, Math.max(0, Array.from(parent.children).indexOf(element)));
}

function ensurePointerSheen(element: HTMLElement) {
  if (element.dataset.tadeonPointerBound === "true") return;

  element.dataset.tadeonPointerBound = "true";
  const sheen = document.createElement("span");
  sheen.className = "tadeon-pointer-sheen";
  sheen.setAttribute("aria-hidden", "true");
  element.appendChild(sheen);

  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    sheen.style.setProperty("--tadeon-pointer-x", `${x}%`);
    sheen.style.setProperty("--tadeon-pointer-y", `${y}%`);
    sheen.dataset.active = "true";
  };

  const leave = () => {
    sheen.dataset.active = "false";
  };

  element.addEventListener("pointermove", move, { passive: true });
  element.addEventListener("pointerleave", leave, { passive: true });
}

function installAtmosphericParallax(stage: HTMLElement) {
  if (stage.dataset.tadeonAtmosphereBound === "true") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;

  stage.dataset.tadeonAtmosphereBound = "true";
  let frame = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;

  const render = () => {
    frame = 0;
    const x = (pointerX - 0.5) * 2;
    const y = (pointerY - 0.5) * 2;
    stage.style.setProperty("--tadeon-parallax-x", `${(x * 4).toFixed(2)}px`);
    stage.style.setProperty("--tadeon-parallax-y", `${(y * 3).toFixed(2)}px`);
  };

  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    pointerY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  const leave = () => {
    pointerX = 0.5;
    pointerY = 0.5;
    if (!frame) frame = window.requestAnimationFrame(render);
  };

  stage.addEventListener("pointermove", move, { passive: true });
  stage.addEventListener("pointerleave", leave, { passive: true });
  render();
}

function ensureMasterNavigationStyle() {
  const id = "tadeon-master-navigation-style";
  if (document.getElementById(id)) return;

  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    .tadeon-master-navigation__scroller { border-color: rgb(116 36 45 / 18%) !important; background: linear-gradient(105deg, rgb(116 36 45 / 8%), transparent 42%), color-mix(in srgb, var(--card) 91%, transparent) !important; }
    .tadeon-master-navigation__rail { scrollbar-color: rgb(116 36 45 / 34%) transparent !important; }
    .tadeon-master-navigation__rail::-webkit-scrollbar-thumb { background: rgb(116 36 45 / 34%) !important; }
    .tadeon-master-navigation [data-slot="tabs-trigger"] { position: relative; border: 1px solid transparent; color: var(--muted-foreground); transition: transform 220ms cubic-bezier(.22,1,.36,1), color 180ms ease, background-color 220ms ease, border-color 220ms ease, box-shadow 260ms cubic-bezier(.22,1,.36,1); }
    .tadeon-master-navigation [data-slot="tabs-trigger"]:hover { transform: translateY(-1px); border-color: rgb(180 92 98 / 18%); color: #ede9c8; }
    .tadeon-master-navigation [data-slot="tabs-trigger"][data-state="active"] { color: #ede9c8 !important; background: linear-gradient(105deg, rgb(116 36 45 / 32%), rgb(116 36 45 / 12%)), rgb(116 36 45 / 22%) !important; border-color: rgb(180 92 98 / 42%) !important; box-shadow: inset 0 1px rgb(255 255 255 / 5%), 0 12px 28px -22px rgb(116 36 45 / 80%) !important; animation: tadeon-master-tab-arrive 360ms cubic-bezier(.22,1,.36,1) both; }
    .tadeon-master-navigation [data-slot="tabs-trigger"][data-state="active"]::before { content: ""; position: absolute; left: 7px; top: 50%; width: 2px; height: 15px; border-radius: 999px; background: #b45c62; box-shadow: 0 0 12px rgb(116 36 45 / 44%); transform: translateY(-50%) scaleY(.55); opacity: .72; animation: tadeon-master-tab-marker 340ms cubic-bezier(.22,1,.36,1) both; }
    .tadeon-master-navigation [data-slot="tabs-trigger"][data-state="active"] svg { color: #d9d7a4; animation: tadeon-master-tab-icon 420ms cubic-bezier(.22,1,.36,1) both; }
    .tadeon-master-navigation [data-slot="tabs-trigger"]:focus-visible { outline: 1px solid rgb(180 92 98 / 72%) !important; outline-offset: 1px; box-shadow: 0 0 0 3px rgb(116 36 45 / 18%) !important; }
    @keyframes tadeon-master-tab-arrive { from { opacity:.72; transform:translateY(1px) scale(.985); } 72% { opacity:1; transform:translateY(-1px) scale(1.012); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes tadeon-master-tab-marker { from { opacity:0; transform:translateY(-50%) scaleY(.2); } to { opacity:.72; transform:translateY(-50%) scaleY(1); } }
    @keyframes tadeon-master-tab-icon { from { opacity:.55; transform:translateY(2px) scale(.9) rotate(-4deg); } 70% { opacity:1; transform:translateY(-1px) scale(1.08) rotate(.6deg); } to { opacity:1; transform:translateY(0) scale(1) rotate(0); } }
    @media (prefers-reduced-motion: reduce) { .tadeon-master-navigation [data-slot="tabs-trigger"], .tadeon-master-navigation [data-slot="tabs-trigger"]::before, .tadeon-master-navigation [data-slot="tabs-trigger"] svg { animation:none !important; transition:none !important; } }
  `;
  document.head.appendChild(style);
}

function processRoot(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(REVEAL).forEach((element) => { markElement(element); markMaterial(element); markState(element); });
  root.querySelectorAll<HTMLElement>(SURFACES).forEach((element) => { markElement(element); markMaterial(element); markState(element); ensurePointerSheen(element); });
  root.querySelectorAll<HTMLElement>(STATEFUL).forEach(markState);
  root.querySelectorAll<HTMLElement>(INTERACTIVE).forEach(markElement);
}

function processElement(element: HTMLElement) {
  if (element.matches(REVEAL)) { markElement(element); markMaterial(element); markState(element); }
  if (element.matches(SURFACES)) { markElement(element); markMaterial(element); markState(element); ensurePointerSheen(element); }
  if (element.matches(STATEFUL)) markState(element);
  if (element.matches(INTERACTIVE)) markElement(element);
  processRoot(element);
}

function processStateFromNode(node: Node) {
  const element = node instanceof HTMLElement ? node : node.parentElement;
  if (!element) return;
  const stateful = element.closest<HTMLElement>(STATEFUL);
  if (stateful) markState(stateful);
}

function directRoute() {
  const stage = document.querySelector<HTMLElement>(".tadeon-route-stage");
  if (!stage) return false;
  stage.dataset.tadeonRouteState = "entering";
  window.requestAnimationFrame(() => { if (stage.isConnected) stage.dataset.tadeonRouteState = "settled"; });
  processElement(stage);
  processRoot(stage);
  installAtmosphericParallax(stage);
  return true;
}

export function TadeonExperienceDirector() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    ensureMasterNavigationStyle();
    let frame = 0;
    let observer: MutationObserver | null = null;
    const scheduleFull = () => { window.cancelAnimationFrame(frame); frame = window.requestAnimationFrame(() => { if (!directRoute()) processRoot(document); }); };
    const processMutations = (mutations: MutationRecord[]) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        for (const mutation of mutations) {
          if (mutation.type === "characterData") { processStateFromNode(mutation.target); continue; }
          mutation.addedNodes.forEach((node) => { if (node instanceof HTMLElement) processElement(node); else if (node.nodeType === Node.TEXT_NODE) processStateFromNode(node); });
        }
      });
    };
    scheduleFull();
    observer = new MutationObserver(processMutations);
    observer.observe(document.body, { subtree:true, childList:true, characterData:true });
    window.addEventListener("popstate", scheduleFull);
    return () => { window.cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener("popstate", scheduleFull); };
  }, []);
  return null;
}
