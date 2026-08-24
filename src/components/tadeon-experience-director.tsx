import { useEffect } from "react";

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

function applyPointerMotion(element: HTMLElement) {
  if (element.dataset.tadeonPointerBound === "true") return;
  element.dataset.tadeonPointerBound = "true";

  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    element.style.setProperty("--tadeon-pointer-x", `${x}%`);
    element.style.setProperty("--tadeon-pointer-y", `${y}%`);
  };

  element.addEventListener("pointermove", move, { passive: true });
  element.addEventListener(
    "pointerleave",
    () => {
      element.style.removeProperty("--tadeon-pointer-x");
      element.style.removeProperty("--tadeon-pointer-y");
    },
    { passive: true },
  );
}

function directRoute() {
  const stage = document.querySelector<HTMLElement>(".tadeon-route-stage");
  if (!stage) return;

  stage.dataset.tadeonRouteState = "entering";
  window.requestAnimationFrame(() => {
    stage.dataset.tadeonRouteState = "settled";
  });

  document.querySelectorAll<HTMLElement>(REVEAL).forEach((element) => {
    markElement(element);
    markMaterial(element);
    markState(element);
  });

  document.querySelectorAll<HTMLElement>(SURFACES).forEach((element) => {
    markElement(element);
    markMaterial(element);
    markState(element);
    applyPointerMotion(element);
  });

  document.querySelectorAll<HTMLElement>(".tadeon-sheet-condition-chip, [aria-live='polite']").forEach((element) => {
    markState(element);
  });

  document.querySelectorAll<HTMLElement>(INTERACTIVE).forEach((element) => {
    markElement(element);
  });
}

export function TadeonExperienceDirector() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let frame = 0;
    const run = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(directRoute);
    };

    run();

    const observer = new MutationObserver(run);
    observer.observe(document.body, { subtree: true, childList: true });

    const onPopState = run;
    window.addEventListener("popstate", onPopState);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  return null;
}
