import { createPortal } from "react-dom";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  CloudOff,
  Lightbulb,
  MapPinned,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackupSigil } from "@/components/section-symbols";
import "@/styles/hero-structure-final-215.css";

type HeroKind = "master" | "users" | "tools" | "offline";
type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

type HeroConfig = {
  kind: HeroKind;
  icon: HeroIcon;
  selector: string;
};

type PortalSpec = {
  host: HTMLElement;
  key: string;
  Icon: HeroIcon;
  iconClassName: string;
};

function heroConfigForPath(pathname: string): HeroConfig | null {
  if (pathname.startsWith("/master-panel")) {
    return {
      kind: "master",
      icon: Lightbulb,
      selector: "#tadeon-main .tadeon-master-commandbar",
    };
  }
  if (pathname.startsWith("/manage-users")) {
    return {
      kind: "users",
      icon: Users,
      selector: "#tadeon-main .tadeon-route-users > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/nexus-tools")) {
    return {
      kind: "tools",
      icon: BackupSigil,
      selector: "#tadeon-main .tadeon-route-tools > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/offline")) {
    return {
      kind: "offline",
      icon: CloudOff,
      selector: "#tadeon-main .tadeon-route-offline > .tadeon-page-hero",
    };
  }
  return null;
}

function ensureHost(container: HTMLElement, className: string, prepend = true) {
  let host = container.querySelector<HTMLElement>(`:scope > .${className}`);
  if (host) return host;
  host = document.createElement("span");
  host.className = className;
  host.setAttribute("aria-hidden", "true");
  if (prepend) container.prepend(host);
  else container.append(host);
  return host;
}

function clearStaleHeroes(active?: HTMLElement | null) {
  document
    .querySelectorAll<HTMLElement>("[data-tadeon-page-hero]")
    .forEach((node) => {
      if (node !== active) delete node.dataset.tadeonPageHero;
    });
}

function clearTabletopHosts() {
  document
    .querySelectorAll<HTMLElement>(
      ".tadeon-tabletop-focus-brand-host, .tadeon-tabletop-brand-mark-host",
    )
    .forEach((node) => node.remove());
}

export function PageHeroParityBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [portals, setPortals] = useState<PortalSpec[]>([]);

  useEffect(() => {
    let frame: number | null = null;
    let observer: MutationObserver | null = null;

    const sync = () => {
      if (pathname.startsWith("/tabletop")) {
        clearStaleHeroes();

        const next: PortalSpec[] = [];
        const studioBrand = document.querySelector<HTMLElement>(
          "#tadeon-main .tadeon-tabletop-studio__brand",
        );
        if (studioBrand) {
          const host = ensureHost(studioBrand, "tadeon-tabletop-brand-mark-host");
          next.push({
            host,
            key: "tabletop:studio",
            Icon: MapPinned,
            iconClassName: "tadeon-tabletop-brand-mark-icon",
          });
        }

        const focusIdentity = document.querySelector<HTMLElement>(
          ".tadeon-mobile-header__identity",
        );
        if (focusIdentity) {
          const host = ensureHost(focusIdentity, "tadeon-tabletop-focus-brand-host");
          next.push({
            host,
            key: "tabletop:focus",
            Icon: BrandMark,
            iconClassName: "tadeon-tabletop-focus-brand-icon",
          });
        }

        setPortals(next);
        return;
      }

      clearTabletopHosts();
      const config = heroConfigForPath(pathname);
      if (!config) {
        clearStaleHeroes();
        setPortals([]);
        return;
      }

      const container = document.querySelector<HTMLElement>(config.selector);
      if (!container) {
        setPortals([]);
        return;
      }

      clearStaleHeroes(container);
      container.dataset.tadeonPageHero = config.kind;
      const host = ensureHost(container, "tadeon-page-hero-mark-host");
      setPortals([
        {
          host,
          key: `hero:${config.kind}`,
          Icon: config.icon,
          iconClassName: "tadeon-page-hero-mark-icon",
        },
      ]);
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        sync();
      });
    };

    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <>
      {portals.map(({ host, key, Icon, iconClassName }) =>
        createPortal(<Icon className={iconClassName} />, host, key),
      )}
    </>
  );
}
