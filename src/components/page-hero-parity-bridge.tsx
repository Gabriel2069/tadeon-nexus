import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  ArchiveRestore,
  BookKey,
  ShieldCheck,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

type HeroKind = "master" | "users" | "tools" | "offline";

interface HeroConfig {
  kind: HeroKind;
  icon: LucideIcon;
  selector: string;
}

function configForPath(pathname: string): HeroConfig | null {
  if (pathname.startsWith("/master-panel")) {
    return {
      kind: "master",
      icon: BookKey,
      selector: "#tadeon-main .tadeon-master-commandbar",
    };
  }
  if (pathname.startsWith("/manage-users")) {
    return {
      kind: "users",
      icon: ShieldCheck,
      selector: "#tadeon-main .tadeon-route-users > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/nexus-tools")) {
    return {
      kind: "tools",
      icon: ArchiveRestore,
      selector: "#tadeon-main .tadeon-route-tools > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/offline")) {
    return {
      kind: "offline",
      icon: WifiOff,
      selector: "#tadeon-main .tadeon-route-offline > .tadeon-page-hero",
    };
  }
  return null;
}

function ensureHeroHost(header: HTMLElement) {
  let host = header.querySelector<HTMLElement>(":scope > .tadeon-page-hero-mark-host");
  if (host) return host;
  host = document.createElement("span");
  host.className = "tadeon-page-hero-mark-host";
  host.setAttribute("aria-hidden", "true");
  header.prepend(host);
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
    kind: HeroKind;
    Icon: LucideIcon;
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
      const header = document.querySelector<HTMLElement>(config.selector);
      if (!header) return;
      clearStaleHeroes(header);
      header.dataset.tadeonPageHero = config.kind;
      const host = ensureHeroHost(header);
      setPortal((current) =>
        current?.host === host && current.kind === config.kind
          ? current
          : { host, kind: config.kind, Icon: config.icon },
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
  const { host, Icon } = portal;
  return createPortal(<Icon className="tadeon-page-hero-mark-icon" />, host);
}
