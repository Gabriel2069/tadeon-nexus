import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function isTabletViewport() {
  const width = window.visualViewport?.width ?? window.innerWidth;
  return width >= 600 && width <= 1180;
}

export function VisualViewportPopupBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      frame = 0;

      // O celular volta a usar integralmente o comportamento nativo/Radix que
      // já funcionava antes desta intervenção. A ponte só existe no tablet.
      if (!isTabletViewport()) {
        delete root.dataset.tadeonKeyboardOpen;
        root.style.removeProperty("--tadeon-vv-left");
        root.style.removeProperty("--tadeon-vv-top");
        root.style.removeProperty("--tadeon-vv-width");
        root.style.removeProperty("--tadeon-vv-height");
        root.style.removeProperty("--tadeon-vv-center-x");
        root.style.removeProperty("--tadeon-vv-center-y");
        root.style.removeProperty("--tadeon-vv-keyboard");
        root.style.removeProperty("--tadeon-vv-scale");
        return;
      }

      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const scale = viewport?.scale ?? 1;

      // No iPad, a redução da visualViewport é a fonte mais estável para o
      // teclado. Não reposicionamos elementos em scroll/focus/mutation: apenas
      // publicamos uma geometria única quando a viewport realmente muda.
      const keyboard = Math.max(0, window.innerHeight - height);
      const keyboardOpen = keyboard > 96;

      setPx(root, "--tadeon-vv-left", left);
      setPx(root, "--tadeon-vv-top", top);
      setPx(root, "--tadeon-vv-width", width);
      setPx(root, "--tadeon-vv-height", height);
      setPx(root, "--tadeon-vv-center-x", left + width / 2);
      setPx(root, "--tadeon-vv-center-y", top + height / 2);
      setPx(root, "--tadeon-vv-keyboard", keyboard);
      root.style.setProperty("--tadeon-vv-scale", String(scale));
      root.dataset.tadeonKeyboardOpen = keyboardOpen ? "true" : "false";
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    // Intencionalmente sem MutationObserver, scroll, focusin/focusout ou
    // correção pós-render. Esses eventos faziam o bridge disputar posição com
    // Radix/Safari e geravam o sobe-desce observado no iPad.
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      delete root.dataset.tadeonKeyboardOpen;
    };
  }, []);

  return null;
}
