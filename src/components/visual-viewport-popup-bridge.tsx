import { useEffect } from "react";
import "@/styles/tablet-popup-viewport-237.css";

const CENTERED_POPUPS = [
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
] as const;

const ANCHORED_POPUPS = [
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="context-menu-content"]',
  '[data-slot="context-menu-sub-content"]',
  '[data-slot="hover-card-content"]',
  '[data-slot="tooltip-content"]',
] as const;

function setPx(root: HTMLElement, name: string, value: number) {
  root.style.setProperty(name, `${Math.max(0, Math.round(value))}px`);
}

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 1 && rect.height > 1;
}

function important(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, "important");
}

function viewportBox() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  const margin = Math.max(10, Math.min(16, width * 0.018));
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    margin,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function clampCenteredPopup(element: HTMLElement, keyboardOpen: boolean) {
  if (!isVisible(element)) return;
  const box = viewportBox();
  const availableWidth = Math.max(240, box.width - box.margin * 2);
  const availableHeight = Math.max(180, box.height - box.margin * 2);

  important(element, "box-sizing", "border-box");
  important(element, "min-width", "0");
  important(element, "max-width", `${Math.round(availableWidth)}px`);
  important(element, "max-height", `${Math.round(availableHeight)}px`);
  important(element, "right", "auto");
  important(element, "bottom", "auto");
  important(element, "margin", "0");
  important(element, "overflow-x", "hidden");
  important(element, "overflow-y", "auto");

  if (keyboardOpen) {
    important(element, "left", `${Math.round(box.centerX)}px`);
    important(element, "top", `${Math.round(box.top + box.margin)}px`);
    important(element, "transform", "translateX(-50%)");
    important(element, "transform-origin", "top center");
  } else {
    important(element, "left", `${Math.round(box.centerX)}px`);
    important(element, "top", `${Math.round(box.centerY)}px`);
    important(element, "transform", "translate(-50%, -50%)");
    important(element, "transform-origin", "center");
  }

  // Classes authored by feature dialogs can still force an oversized width.
  // Measure the final box and hard-cap width only when it actually overflows.
  const rect = element.getBoundingClientRect();
  if (rect.width > availableWidth + 1) important(element, "width", `${Math.round(availableWidth)}px`);

  // A final post-layout correction protects against browser rounding, zoom and
  // third-party transforms without changing the intended centered position.
  const corrected = element.getBoundingClientRect();
  let dx = 0;
  let dy = 0;
  const safeLeft = box.left + box.margin;
  const safeRight = box.right - box.margin;
  const safeTop = box.top + box.margin;
  const safeBottom = box.bottom - box.margin;
  if (corrected.left < safeLeft) dx += safeLeft - corrected.left;
  if (corrected.right > safeRight) dx -= corrected.right - safeRight;
  if (corrected.top < safeTop) dy += safeTop - corrected.top;
  if (corrected.bottom > safeBottom) dy -= corrected.bottom - safeBottom;

  important(element, "translate", `${Math.round(dx)}px ${Math.round(dy)}px`);
}

function clampAnchoredPopup(element: HTMLElement) {
  if (!isVisible(element)) return;
  const box = viewportBox();
  const availableWidth = Math.max(180, box.width - box.margin * 2);
  const availableHeight = Math.max(120, box.height - box.margin * 2);

  important(element, "box-sizing", "border-box");
  important(element, "max-width", `${Math.round(availableWidth)}px`);
  important(element, "max-height", `${Math.round(availableHeight)}px`);
  important(element, "overflow-y", "auto");

  // Always measure from the Radix-authored anchor position, not from our
  // previous correction, otherwise repeated visualViewport events can drift.
  important(element, "translate", "0px 0px");
  const rect = element.getBoundingClientRect();
  const safeLeft = box.left + box.margin;
  const safeRight = box.right - box.margin;
  const safeTop = box.top + box.margin;
  const safeBottom = box.bottom - box.margin;
  let dx = 0;
  let dy = 0;

  if (rect.left < safeLeft) dx = safeLeft - rect.left;
  else if (rect.right > safeRight) dx = safeRight - rect.right;
  if (rect.top < safeTop) dy = safeTop - rect.top;
  else if (rect.bottom > safeBottom) dy = safeBottom - rect.bottom;

  important(element, "translate", `${Math.round(dx)}px ${Math.round(dy)}px`);
}

function clampAllPopups(keyboardOpen: boolean) {
  for (const selector of CENTERED_POPUPS) {
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => clampCenteredPopup(element, keyboardOpen));
  }
  for (const selector of ANCHORED_POPUPS) {
    document.querySelectorAll<HTMLElement>(selector).forEach(clampAnchoredPopup);
  }
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
      const keyboardOpen = keyboard > 80;

      setPx(root, "--tadeon-vv-left", left);
      setPx(root, "--tadeon-vv-top", top);
      setPx(root, "--tadeon-vv-width", width);
      setPx(root, "--tadeon-vv-height", height);
      setPx(root, "--tadeon-vv-center-x", left + width / 2);
      setPx(root, "--tadeon-vv-center-y", top + height / 2);
      setPx(root, "--tadeon-vv-keyboard", keyboard);
      root.style.setProperty("--tadeon-vv-scale", String(scale));
      root.dataset.tadeonKeyboardOpen = keyboardOpen ? "true" : "false";
      clampAllPopups(keyboardOpen);
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };

    const mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "data-side", "data-align", "class"],
    });

    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.visualViewport?.addEventListener("resize", schedule, { passive: true });
    window.visualViewport?.addEventListener("scroll", schedule, { passive: true });
    document.addEventListener("focusin", schedule, true);
    document.addEventListener("focusout", schedule, true);
    schedule();

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.removeEventListener("scroll", schedule, true);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      document.removeEventListener("focusin", schedule, true);
      document.removeEventListener("focusout", schedule, true);
      delete root.dataset.tadeonKeyboardOpen;
    };
  }, []);

  return null;
}
