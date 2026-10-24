import * as React from "react";
import { useMaterialToneStyle } from "@/lib/use-material-light";

import "@/styles/route-popup-frame.css";
const ROUTE_FRAME_SELECTOR = [
  ".tadeon-route-nexus",
  ".tadeon-route-dashboard",
  ".tadeon-route-master",
  ".tadeon-route-users",
  ".tadeon-route-offline",
  ".tadeon-route-tools",
  ".tadeon-page",
  ".tadeon-master-workspace",
].join(",");

type PopupFrameStyle = React.CSSProperties & {
  "--material-rgb"?: string;
  "--tadeon-popup-frame-left"?: string;
  "--tadeon-popup-frame-width"?: string;
  "--tadeon-popup-viewport-top"?: string;
  "--tadeon-popup-viewport-height"?: string;
};

function activeRouteFrame(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (document.fullscreenElement instanceof HTMLElement) return document.fullscreenElement;
  const main = document.getElementById("tadeon-main");
  return main?.querySelector<HTMLElement>(ROUTE_FRAME_SELECTOR) ?? null;
}

const subscribeFullscreen = (notify: () => void) => {
  document.addEventListener("fullscreenchange", notify);
  return () => document.removeEventListener("fullscreenchange", notify);
};
const fullscreenContainer = () =>
  document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : undefined;
const noFullscreen = () => undefined;

/** Browser fullscreen displays only its subtree, including any popup portals. */
export function usePopupPortalContainer() {
  return React.useSyncExternalStore(subscribeFullscreen, fullscreenContainer, noFullscreen);
}

export function useRoutePopupFrame(forwardedRef?: React.Ref<HTMLDivElement>) {
  // Radix keeps Content components rendered while their portal DOM is absent.
  // Subscribe only during actual presence, including the finite exit animation.
  const [content, setContent] = React.useState<HTMLDivElement | null>(null);
  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setContent(node);
      const release = typeof forwardedRef === "function" ? forwardedRef(node) : undefined;
      if (forwardedRef && typeof forwardedRef !== "function") forwardedRef.current = node;
      return () => {
        setContent(null);
        if (typeof release === "function") release();
        else if (typeof forwardedRef === "function") forwardedRef(null);
        else if (forwardedRef) forwardedRef.current = null;
      };
    },
    [forwardedRef],
  );
  const portalContainer = usePopupPortalContainer();
  const materialStyle = useMaterialToneStyle();
  const [boundary, setBoundary] = React.useState<HTMLElement | null>(null);
  const [style, setStyle] = React.useState<PopupFrameStyle>({});

  React.useLayoutEffect(() => {
    if (!content) return;
    const frame = activeRouteFrame();
    if (!frame) return;
    setBoundary(frame);

    let animationFrame = 0;

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0) return;
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const left = Math.max(viewportLeft, rect.left);
      const right = Math.min(viewportLeft + viewportWidth, rect.right);
      const boundedWidth = Math.max(0, right - left);
      const nextStyle: PopupFrameStyle = {
        "--tadeon-popup-frame-left": `${boundedWidth > 0 ? left : viewportLeft}px`,
        "--tadeon-popup-frame-width": `${boundedWidth > 0 ? boundedWidth : viewportWidth}px`,
        "--tadeon-popup-viewport-top": `${viewportTop}px`,
        "--tadeon-popup-viewport-height": `${viewportHeight}px`,
      };
      setStyle((current) =>
        Object.keys(nextStyle).every(
          (key) =>
            current[key as keyof PopupFrameStyle] === nextStyle[key as keyof PopupFrameStyle],
        )
          ? current
          : nextStyle,
      );
    };

    const scheduleMeasure = (event?: Event) => {
      // Scrolling a list or input inside the route does not move its frame.
      if (event?.type === "scroll" && event.target instanceof Node && frame.contains(event.target))
        return;
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        measure();
      });
    };

    measure();
    const observer = new ResizeObserver(() => scheduleMeasure());
    observer.observe(frame);
    window.addEventListener("resize", scheduleMeasure);
    window.addEventListener("scroll", scheduleMeasure, true);
    window.visualViewport?.addEventListener("resize", scheduleMeasure);
    window.visualViewport?.addEventListener("scroll", scheduleMeasure);
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      window.removeEventListener("scroll", scheduleMeasure, true);
      window.visualViewport?.removeEventListener("resize", scheduleMeasure);
      window.visualViewport?.removeEventListener("scroll", scheduleMeasure);
    };
  }, [content, portalContainer]);

  return { contentRef, boundary, portalContainer, style: { ...materialStyle, ...style } };
}
