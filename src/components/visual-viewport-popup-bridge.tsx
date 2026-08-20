import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

const MODAL_SELECTOR =
  '[data-slot="dialog-content"], [data-slot="alert-dialog-content"]';

const EDITABLE_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="range"]):not([readonly])',
  'textarea:not([readonly])',
  '[contenteditable="true"]',
].join(", ");

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function activeEditableInModal() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  if (!active.matches(EDITABLE_SELECTOR)) return null;
  if (!active.closest(MODAL_SELECTOR)) return null;
  return active;
}

function scrollContainerFor(field: HTMLElement, modal: HTMLElement) {
  let node = field.parentElement;

  while (node && node !== modal) {
    const style = window.getComputedStyle(node);
    const overflow = `${style.overflowY} ${style.overflow}`;
    const canScroll = /(auto|scroll)/.test(overflow) && node.scrollHeight > node.clientHeight + 1;
    if (canScroll) return node;
    node = node.parentElement;
  }

  return modal;
}

function keepFocusedFieldVisible() {
  const field = activeEditableInModal();
  const modal = field?.closest<HTMLElement>(MODAL_SELECTOR);
  if (!field || !modal) return;

  const scroller = scrollContainerFor(field, modal);
  const scrollerRect = scroller.getBoundingClientRect();
  const fieldRect = field.getBoundingClientRect();
  const topGuard = Math.min(56, Math.max(16, scrollerRect.height * 0.08));
  const bottomGuard = Math.min(80, Math.max(24, scrollerRect.height * 0.12));
  const visibleTop = scrollerRect.top + topGuard;
  const visibleBottom = scrollerRect.bottom - bottomGuard;

  let delta = 0;
  if (fieldRect.bottom > visibleBottom) delta = fieldRect.bottom - visibleBottom;
  else if (fieldRect.top < visibleTop) delta = fieldRect.top - visibleTop;

  if (Math.abs(delta) > 1) {
    scroller.scrollBy({ top: delta, behavior: "auto" });
  }
}

export function VisualViewportPopupBridge() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.documentElement;
    let frame = 0;
    const settleTimers: number[] = [];

    const clearTimers = () => {
      while (settleTimers.length) {
        const timer = settleTimers.pop();
        if (timer !== undefined) window.clearTimeout(timer);
      }
    };

    const clear = () => {
      delete root.dataset.tadeonKeyboardOpen;
      delete root.dataset.tadeonPopupViewport;
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
      root.dataset.tadeonPopupViewport = "true";

      const viewport = window.visualViewport;
      const layoutWidth = document.documentElement.clientWidth || window.innerWidth;
      const layoutHeight = window.innerHeight;
      const rawLeft = viewport?.offsetLeft ?? 0;
      const rawTop = viewport?.offsetTop ?? 0;
      const width = Math.max(1, viewport?.width ?? layoutWidth);
      const height = Math.max(1, viewport?.height ?? layoutHeight);
      const scale = viewport?.scale ?? 1;
      const heightLoss = Math.max(0, layoutHeight - height);
      const focusedEditable = activeEditableInModal() !== null;
      const keyboardThreshold = Math.max(80, layoutHeight * 0.1);
      const keyboardOpen = focusedEditable && scale <= 1.05 && heightLoss > keyboardThreshold;
      const zoomed = scale > 1.05;

      // Em iOS o visualViewport pode manter offsets residuais após o teclado.
      // Só seguimos esses offsets quando há teclado ativo ou pinch-zoom real.
      const left = keyboardOpen || zoomed ? rawLeft : 0;
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

      keepFocusedFieldVisible();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    const settleAfterFocusChange = () => {
      clearTimers();
      schedule();

      // WebKit pode publicar a nova visualViewport apenas no fim da animação
      // do teclado. Reamostramos por uma janela curta, sem MutationObserver.
      for (const delay of [80, 180, 320, 520, 800]) {
        settleTimers.push(
          window.setTimeout(() => {
            schedule();
            window.requestAnimationFrame(keepFocusedFieldVisible);
          }, delay),
        );
      }
    };

    root.dataset.tadeonPopupViewport = "true";
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", settleAfterFocusChange, { passive: true });
    window.addEventListener("pageshow", schedule, { passive: true });
    document.addEventListener("focusin", settleAfterFocusChange, { passive: true });
    document.addEventListener("focusout", settleAfterFocusChange, { passive: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    window.visualViewport?.addEventListener("scrollend", schedule, { passive: true });
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      clearTimers();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", settleAfterFocusChange);
      window.removeEventListener("pageshow", schedule);
      document.removeEventListener("focusin", settleAfterFocusChange);
      document.removeEventListener("focusout", settleAfterFocusChange);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      window.visualViewport?.removeEventListener("scrollend", schedule);
      clear();
    };
  }, []);

  return null;
}
