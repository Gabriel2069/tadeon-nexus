import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function isTabletViewport() {
  const shortestScreenSide = Math.min(window.screen.width, window.screen.height);
  const iPadLike =
    /iPad/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const coarseTouch =
    navigator.maxTouchPoints > 0 && window.matchMedia("(pointer: coarse)").matches;

  // iPadOS pode expor UA de desktop e também entrar em Split View/Stage Manager
  // com viewport menor que 600px. A tela física + capacidade de toque é uma
  // assinatura mais estável do que a largura momentânea da visualViewport.
  return iPadLike || (shortestScreenSide >= 600 && coarseTouch);
}

export function VisualViewportPopupBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;

    const clear = () => {
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
    };

    const sync = () => {
      frame = 0;

      if (!isTabletViewport()) {
        clear();
        return;
      }

      root.dataset.tadeonTabletPopup = "true";

      const viewport = window.visualViewport;
      const layoutWidth = window.innerWidth;
      const layoutHeight = window.innerHeight;
      const rawLeft = viewport?.offsetLeft ?? 0;
      const rawTop = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? layoutWidth;
      const height = viewport?.height ?? layoutHeight;
      const scale = viewport?.scale ?? 1;
      const heightLoss = Math.max(0, layoutHeight - height);
      const keyboardThreshold = Math.max(120, layoutHeight * 0.18);
      const keyboardOpen = scale <= 1.05 && heightLoss > keyboardThreshold;
      const zoomed = scale > 1.05;

      // Safari/iPadOS 26 pode manter offsetTop residual depois de fechar o teclado.
      // Fora de teclado/pinch zoom, fixed:0 já representa corretamente a viewport
      // de layout e evita que o modal permaneça deslocado por esse valor obsoleto.
      const left = zoomed ? rawLeft : 0;
      const top = keyboardOpen || zoomed ? rawTop : 0;

      setPx(root, "--tadeon-vv-left", left);
      setPx(root, "--tadeon-vv-top", top);
      setPx(root, "--tadeon-vv-width", width);
      setPx(root, "--tadeon-vv-height", height);
      setPx(root, "--tadeon-vv-center-x", left + width / 2);
      setPx(root, "--tadeon-vv-center-y", top + height / 2);
      setPx(root, "--tadeon-vv-keyboard", heightLoss);
      root.style.setProperty("--tadeon-vv-scale", String(scale));
      root.dataset.tadeonKeyboardOpen = keyboardOpen ? "true" : "false";
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.addEventListener("pageshow", schedule, { passive: true });
    document.addEventListener("focusin", schedule, { passive: true });
    document.addEventListener("focusout", schedule, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("scrollend", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("scrollend", schedule);
      clear();
    };
  }, []);

  return null;
}
