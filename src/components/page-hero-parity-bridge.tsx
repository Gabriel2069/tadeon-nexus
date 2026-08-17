import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
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
}

function configForPath(pathname: string): HeroConfig | null {
  if (pathname.startsWith("/master-panel")) return { kind: "master", icon: BookKey };
  if (pathname.startsWith("/manage-users")) return { kind: "users", icon: ShieldCheck };
  if (pathname.startsWith("/nexus-tools")) return { kind: "tools", icon: ArchiveRestore };
  if (pathname.startsWith("/offline")) return { kind: "offline", icon: WifiOff };
  return null;
}

function findInternalHeader() {
  return document.querySelector<HTMLElement>("#tadeon-main .tadeon-page-header");
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

export function PageHeroParityBridge() {
  const [portal, setPortal] = useState<{
    host: HTMLElement;
    kind: HeroKind;
    Icon: LucideIcon;
  } | null>(null);

  useEffect(() => {
    let frame: number | null = null;

    const sync = () => {
      const config = configForPath(window.location.pathname);
      const header = findInternalHeader();

      document
        .querySelectorAll<HTMLElement>(".tadeon-page-header[data-tadeon-page-hero]")
        .forEach((node) => {
          if (node !== header) delete node.dataset.tadeonPageHero;
        });

      if (!config || !header) {
        setPortal(null);
        return;
      }

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

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", schedule);
    schedule();

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", schedule);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  if (!portal) return null;
  const { host, Icon } = portal;
  return createPortal(<Icon className="tadeon-page-hero-mark-icon" />, host);
}
