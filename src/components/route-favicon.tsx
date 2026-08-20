import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const FAVICON_VERSION = "1";

function faviconForPath(pathname: string) {
  if (pathname.startsWith("/nexus-tools")) return "/favicons/backup.svg";
  if (pathname === "/nexus" || pathname.startsWith("/nexus/")) return "/favicons/nexus.svg";
  if (pathname.startsWith("/tabletop")) return "/favicons/tabletop.svg";
  if (pathname.startsWith("/master-panel")) return "/favicons/master.svg";
  if (pathname.startsWith("/manage-users")) return "/favicons/users.svg";
  if (pathname.startsWith("/offline")) return "/favicons/offline.svg";
  return "/favicon.svg";
}

export function RouteFavicon() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const href = `${faviconForPath(pathname)}?v=${FAVICON_VERSION}`;
    const links = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]',
    );

    links.forEach((link) => {
      link.href = href;
      link.type = "image/svg+xml";
    });
  }, [pathname]);

  return null;
}
