import * as React from "react";

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
  "--tadeon-popup-frame-center"?: string;
  "--tadeon-popup-frame-width"?: string;
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

    const measure = () => {
      const rect = frame.getBoundingClientRect();
      if (rect.width <= 0) return;
      setStyle({
        "--tadeon-popup-frame-left": `${Math.max(0, rect.left)}px`,
        "--tadeon-popup-frame-center": `${Math.max(0, rect.left) + rect.width / 2}px`,
        "--tadeon-popup-frame-width": `${Math.min(window.innerWidth, rect.width)}px`,
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  return { boundary, style };
}
