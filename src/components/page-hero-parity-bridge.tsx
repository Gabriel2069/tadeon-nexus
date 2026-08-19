import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  CloudOff,
  Lightbulb,
  MapPinned,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type HeroKind = "master" | "users" | "tools" | "offline";

type HeroConfig =
  | {
      mode: "hero";
      kind: HeroKind;
      icon: LucideIcon;
      selector: string;
    }
  | {
      mode: "tabletop";
      icon: LucideIcon;
      selector: string;
    };

function configForPath(pathname: string): HeroConfig | null {
  if (pathname.startsWith("/tabletop")) {
    return {
      mode: "tabletop",
      icon: MapPinned,
      selector: "#tadeon-main .tadeon-tabletop-studio__brand",
    };
  }
  if (pathname.startsWith("/master-panel")) {
    return {
      mode: "hero",
      kind: "master",
      icon: Lightbulb,
      selector: "#tadeon-main .tadeon-master-commandbar",
    };
  }
  if (pathname.startsWith("/manage-users")) {
    return {
      mode: "hero",
      kind: "users",
      icon: Users,
      selector: "#tadeon-main .tadeon-route-users > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/nexus-tools")) {
    return {
      mode: "hero",
      kind: "tools",
      icon: Wrench,
      selector: "#tadeon-main .tadeon-route-tools > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/offline")) {
    return {
      mode: "hero",
      kind: "offline",
      icon: CloudOff,
      selector: "#tadeon-main .tadeon-route-offline > .tadeon-page-hero",
    };
  }
  return null;
}

function ensureHost(container: HTMLElement, className: string) {
  let host = container.querySelector<HTMLElement>(`:scope > .${className}`);
  if (host) return host;
  host = document.createElement("span");
  host.className = className;
  host.setAttribute("aria-hidden", "true");
  container.prepend(host);
  return host;
}

function clearStaleHeroes(active?: HTMLElement | null) {
  document
    .querySelectorAll<HTMLElement>("[data-tadeon-page-hero]")
    .forEach((node) => {
      if (node !== active) delete node.dataset.tadeonPageHero;
    });
}

export function PageHeroParityBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [portal, setPortal] = useState<{
    host: HTMLElement;
    key: string;
    Icon: LucideIcon;
    iconClassName: string;
  } | null>(null);

  useEffect(() => {
    const config = configForPath(pathname);
    let frame: number | null = null;
    let observer: MutationObserver | null = null;

    clearStaleHeroes();

    if (!config) {
      setPortal(null);
      return;
    }

    const sync = () => {
      const container = document.querySelector<HTMLElement>(config.selector);
      if (!container) return;

      if (config.mode === "hero") {
        clearStaleHeroes(container);
        container.dataset.tadeonPageHero = config.kind;
        const host = ensureHost(container, "tadeon-page-hero-mark-host");
        const key = `hero:${config.kind}`;
        setPortal((current) =>
          current?.host === host && current.key === key
            ? current
            : {
                host,
                key,
                Icon: config.icon,
                iconClassName: "tadeon-page-hero-mark-icon",
              },
        );
        return;
      }

      clearStaleHeroes();
      const host = ensureHost(container, "tadeon-tabletop-brand-mark-host");
      const key = "tabletop:brand";
      setPortal((current) =>
        current?.host === host && current.key === key
          ? current
          : {
              host,
              key,
              Icon: config.icon,
              iconClassName: "tadeon-tabletop-brand-mark-icon",
            },
      );
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        sync();
      });
    };

    const main = document.getElementById("tadeon-main");
    if (main) {
      observer = new MutationObserver(schedule);
      observer.observe(main, { childList: true, subtree: true });
    }
    schedule();

    return () => {
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  if (!portal) return null;
  const { host, Icon, iconClassName } = portal;
  return createPortal(<Icon className={iconClassName} />, host);
}
