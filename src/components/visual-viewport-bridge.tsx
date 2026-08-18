import { useEffect } from "react";
import "@/styles/mobile-viewport-final-180.css";

function visibleViewport() {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

export function VisualViewportBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const viewport = visibleViewport();
        const keyboardInset = Math.max(
          0,
          window.innerHeight - viewport.height - viewport.top,
        );
        const keyboardOpen = keyboardInset > Math.max(96, window.innerHeight * 0.12);

        root.style.setProperty("--tadeon-vv-top", `${viewport.top}px`);
        root.style.setProperty("--tadeon-vv-left", `${viewport.left}px`);
        root.style.setProperty("--tadeon-vv-width", `${viewport.width}px`);
        root.style.setProperty("--tadeon-vv-height", `${viewport.height}px`);
        root.style.setProperty(
          "--tadeon-vv-center-x",
          `${viewport.left + viewport.width / 2}px`,
        );
        root.style.setProperty("--tadeon-keyboard-inset", `${keyboardInset}px`);
        root.dataset.tadeonKeyboardOpen = keyboardOpen ? "true" : "false";
      });
    };

    const keepFocusedControlVisible = (event: FocusEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (!target.matches("input, textarea, select, [contenteditable='true']")) return;
      window.setTimeout(() => {
        if (root.dataset.tadeonKeyboardOpen !== "true") return;
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }, 80);
    };

    const viewport = window.visualViewport;
    sync();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("focusin", keepFocusedControlVisible);

    return () => {
      window.cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("focusin", keepFocusedControlVisible);
      delete root.dataset.tadeonKeyboardOpen;
      for (const property of [
        "--tadeon-vv-top",
        "--tadeon-vv-left",
        "--tadeon-vv-width",
        "--tadeon-vv-height",
        "--tadeon-vv-center-x",
        "--tadeon-keyboard-inset",
      ]) {
        root.style.removeProperty(property);
      }
    };
  }, []);

  return null;
}
