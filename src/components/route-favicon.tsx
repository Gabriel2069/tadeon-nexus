import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

const FAVICON_VERSION = "6";

type RouteIdentity = {
  favicon: string;
  themeColor: string;
};

function identityForPath(pathname: string): RouteIdentity {
  if (pathname.startsWith("/nexus-tools")) {
    return { favicon: "/favicons/backup.svg", themeColor: "#7a8187" };
  }
  if (pathname === "/nexus" || pathname.startsWith("/nexus/")) {
    return { favicon: "/favicons/nexus.svg", themeColor: "#4f6e5d" };
  }
  if (pathname.startsWith("/tabletop")) {
    return { favicon: "/favicons/tabletop.svg", themeColor: "#547b94" };
  }
  if (pathname.startsWith("/master-panel")) {
    return { favicon: "/favicons/master.svg", themeColor: "#74242d" };
  }
  if (pathname.startsWith("/manage-users")) {
    return { favicon: "/favicons/users.svg", themeColor: "#b7814d" };
  }
  if (pathname.startsWith("/offline")) {
    return { favicon: "/favicons/offline.svg", themeColor: "#716b7b" };
  }
  return { favicon: "/favicon.svg", themeColor: "#74242d" };
}

function ensureIconLink(rel: "icon" | "shortcut icon") {
  const selector = `link[rel="${rel}"]`;
  let link = document.head.querySelector<HTMLLinkElement>(selector);
  if (link) return link;

  link = document.createElement("link");
  link.rel = rel;
  document.head.appendChild(link);
  return link;
}

export function RouteFavicon() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const identity = identityForPath(pathname);
    const href = `${identity.favicon}?v=${FAVICON_VERSION}`;

    (["icon", "shortcut icon"] as const).forEach((rel) => {
      const link = ensureIconLink(rel);
      link.href = href;
      link.type = "image/svg+xml";
      if (rel === "icon") link.sizes = "any";
    });

    let theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!theme) {
      theme = document.createElement("meta");
      theme.name = "theme-color";
      document.head.appendChild(theme);
    }
    theme.content = identity.themeColor;
  }, [pathname]);

  return null;
}
