import { useEffect } from "react";

function normalized(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function counterHost(label: HTMLElement) {
  let current = label.parentElement;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (current.querySelectorAll("button").length >= 2) return current;
    current = current.parentElement;
  }
  return label.parentElement;
}

function annotateCounters(root: ParentNode) {
  root.querySelectorAll<HTMLElement>("span, strong, small, p, label").forEach((element) => {
    const key = normalized(element.textContent);
    if (key !== "morrendo" && key !== "colapsando") return;
    const host = counterHost(element);
    if (!host) return;
    host.dataset.tadeonConditionKind = key;
    const ratio = host.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
    if (!ratio) return;
    const current = Number(ratio[1]);
    const max = Math.max(1, Number(ratio[2]));
    host.style.setProperty("--condition-progress", String(Math.max(0, Math.min(1, current / max))));
  });
}

function annotateConditionCards(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".tadeon-condition-card").forEach((card) => {
    const style = card.getAttribute("style") ?? "";
    const rgb = style.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgb) card.style.setProperty("--condition-rgb", `${rgb[1]} ${rgb[2]} ${rgb[3]}`);
    if (style.includes("box-shadow")) card.dataset.tadeonConditionActive = "true";
    else delete card.dataset.tadeonConditionActive;
  });
}

function annotate() {
  const page = document.querySelector<HTMLElement>(".tadeon-sheet-page");
  if (!page) return;
  annotateCounters(page);
  annotateConditionCards(page);
}

export function UserRepair152Bridge() {
  useEffect(() => {
    let frame: number | null = null;
    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        annotate();
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-state"],
    });
    schedule();

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
