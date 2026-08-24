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

function getChildIndex(element: HTMLElement) {
  const parent = element.parentElement;
  if (!parent) return 0;
  return Math.min(8, Array.from(parent.children).indexOf(element));
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
  });

  document.querySelectorAll<HTMLElement>(SURFACES).forEach((element) => {
    markElement(element);
    applyPointerMotion(element);
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
