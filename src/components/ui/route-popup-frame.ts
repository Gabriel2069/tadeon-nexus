import * as React from "react";

import "@/styles/popup-geometry-256.css";

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
  "--tadeon-popup-frame-left"?: string;
  "--tadeon-popup-frame-width"?: string;
  "--tadeon-popup-viewport-top"?: string;
  "--tadeon-popup-viewport-height"?: string;
};

function activeRouteFrame(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const main = document.getElementById("tadeon-main");
  return main?.querySelector<HTMLElement>(ROUTE_FRAME_SELECTOR) ?? null;
}

export function useRoutePopupFrame() {
  const [boundary, setBoundary] = React.useState<HTMLElement | null>(null);
  const [style, setStyle] = React.useState<PopupFrameStyle>({});

  React.useLayoutEffect(() => {
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
      setStyle({
        "--tadeon-popup-frame-left": `${boundedWidth > 0 ? left : viewportLeft}px`,
        "--tadeon-popup-frame-width": `${boundedWidth > 0 ? boundedWidth : viewportWidth}px`,
        "--tadeon-popup-viewport-top": `${viewportTop}px`,
        "--tadeon-popup-viewport-height": `${viewportHeight}px`,
      });
    };

    const scheduleMeasure = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = 0;
        measure();
      });
    };

    measure();
    const observer = new ResizeObserver(scheduleMeasure);
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
  }, []);

  return { boundary, style };
}
