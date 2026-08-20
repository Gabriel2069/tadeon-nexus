import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function isTabletViewport() {
  const width = window.visualViewport?.width ?? window.innerWidth;
  const shortestScreenSide = Math.min(window.screen.width, window.screen.height);
  const touchCapable =
    navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;

  // Não usa apenas a largura atual: iPhones em landscape continuam com o lado
  // curto de tela abaixo de 600px, enquanto iPads grandes chegam a 1194/1366px
  // na orientação horizontal. Assim preservamos o mobile já validado.
  return width >= 600 && width <= 1440 && shortestScreenSide >= 600 && touchCapable;
}

export function VisualViewportPopupBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;

    const sync = () => {
      frame = 0;

      if (!isTabletViewport()) {
        delete root.dataset.tadeonKeyboardOpen;
        delete root.dataset.tadeonTabletPopup;
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

      root.dataset.tadeonTabletPopup = "true";
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth;
      const height = viewport?.height ?? window.innerHeight;
      const scale = viewport?.scale ?? 1;
      const keyboard = Math.max(0, window.innerHeight - height - top);
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

    // Sem MutationObserver/focus correction: Radix continua dono do anchor. O
    // scroll da visualViewport só atualiza offsetLeft/Top do iPad em zoom/teclado.
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      delete root.dataset.tadeonKeyboardOpen;
      delete root.dataset.tadeonTabletPopup;
    };
  }, []);

  return null;
}
