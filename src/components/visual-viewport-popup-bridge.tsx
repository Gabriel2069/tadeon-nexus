import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

export function VisualViewportPopupBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      frame = 0;
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const scale = viewport?.scale ?? 1;
      const keyboard = Math.max(0, window.innerHeight - height - top);

      setPx(root, "--tadeon-vv-left", left);
      setPx(root, "--tadeon-vv-top", top);
      setPx(root, "--tadeon-vv-width", width);
      setPx(root, "--tadeon-vv-height", height);
      setPx(root, "--tadeon-vv-center-x", left + width / 2);
      setPx(root, "--tadeon-vv-center-y", top + height / 2);
      setPx(root, "--tadeon-vv-keyboard", keyboard);
      root.style.setProperty("--tadeon-vv-scale", String(scale));
      root.dataset.tadeonKeyboardOpen = keyboard > 80 ? "true" : "false";
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("focusin", schedule, true);
    document.addEventListener("focusout", schedule, true);
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule, true);
      document.removeEventListener("focusout", schedule, true);
      delete root.dataset.tadeonKeyboardOpen;
    };
  }, []);

  return null;
}
