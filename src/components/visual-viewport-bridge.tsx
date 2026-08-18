import { useEffect } from "react";
import "@/styles/mobile-runtime-parity-180.css";

function visibleViewport() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return { left, top, width, height };
}

function syncVisualViewport() {
  const root = document.documentElement;
  const viewport = visibleViewport();
  const keyboardInset = Math.max(
    0,
    window.innerHeight - (viewport.top + viewport.height),
  );

  root.style.setProperty("--tadeon-vv-left", `${viewport.left}px`);
  root.style.setProperty("--tadeon-vv-top", `${viewport.top}px`);
  root.style.setProperty("--tadeon-vv-width", `${viewport.width}px`);
  root.style.setProperty("--tadeon-vv-height", `${viewport.height}px`);
  root.style.setProperty(
    "--tadeon-vv-center-x",
    `${viewport.left + viewport.width / 2}px`,
  );
  root.style.setProperty("--tadeon-keyboard-inset", `${keyboardInset}px`);
  root.dataset.tadeonKeyboard = keyboardInset > 120 ? "open" : "closed";
}

export function VisualViewportBridge() {
  useEffect(() => {
    syncVisualViewport();
    const viewport = window.visualViewport;
    const sync = () => syncVisualViewport();
    const keepFocusedControlVisible = (event: FocusEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (!target.matches("input, textarea, select, [contenteditable='true']")) return;
      window.setTimeout(() => {
        if (document.documentElement.dataset.tadeonKeyboard !== "open") return;
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }, 80);
    };

    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("focusin", keepFocusedControlVisible);

    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("focusin", keepFocusedControlVisible);
      const root = document.documentElement;
      root.style.removeProperty("--tadeon-vv-left");
      root.style.removeProperty("--tadeon-vv-top");
      root.style.removeProperty("--tadeon-vv-width");
      root.style.removeProperty("--tadeon-vv-height");
      root.style.removeProperty("--tadeon-vv-center-x");
      root.style.removeProperty("--tadeon-keyboard-inset");
      delete root.dataset.tadeonKeyboard;
    };
  }, []);

  return null;
}
