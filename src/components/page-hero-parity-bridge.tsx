import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CloudOff, MapPinned, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackupSigil } from "@/components/section-symbols";

type HeroKind = "users" | "tools" | "offline";
type IconKind = HeroKind | "tabletop" | "brand";

type HeroConfig = {
  kind: HeroKind;
  selector: string;
};

type PortalSpec = {
  host: HTMLElement;
  key: string;
  icon: IconKind;
  iconClassName: string;
};

function heroConfigForPath(pathname: string): HeroConfig | null {
  if (pathname.startsWith("/manage-users")) {
    return {
      kind: "users",
      selector: "#tadeon-main .tadeon-route-users > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/nexus-tools")) {
    return {
      kind: "tools",
      selector: "#tadeon-main .tadeon-route-tools > .tadeon-page-hero",
    };
  }
  if (pathname.startsWith("/offline")) {
    return {
      kind: "offline",
      selector: "#tadeon-main .tadeon-route-offline > .tadeon-page-hero",
    };
  }
  return null;
}

function renderIcon(icon: IconKind, className: string) {
  if (icon === "users") return <Users className={className} />;
  if (icon === "tools") return <BackupSigil className={className} />;
  if (icon === "offline") return <CloudOff className={className} />;
  if (icon === "tabletop") return <MapPinned className={className} />;
  return <BrandMark className={className} />;
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
  document.querySelectorAll<HTMLElement>("[data-tadeon-page-hero]").forEach((node) => {
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

function samePortals(current: PortalSpec[], next: PortalSpec[]) {
  return (
    current.length === next.length &&
    current.every((item, index) => {
      const candidate = next[index];
      return (
        candidate &&
        item.host === candidate.host &&
        item.key === candidate.key &&
        item.icon === candidate.icon &&
        item.iconClassName === candidate.iconClassName
      );
    })
  );
}

export function PageHeroParityBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [portals, setPortals] = useState<PortalSpec[]>([]);

  useEffect(() => {
    let frame: number | null = null;
    const commitPortals = (next: PortalSpec[]) => {
      setPortals((current) => (samePortals(current, next) ? current : next));
    };

    const sync = () => {
      if (pathname.startsWith("/tabletop")) {
        clearStaleHeroes();
        const next: PortalSpec[] = [];

        const studioBrand = document.querySelector<HTMLElement>(
          "#tadeon-main .tadeon-tabletop-studio__brand",
        );
        if (studioBrand) {
          next.push({
            host: ensureHost(studioBrand, "tadeon-tabletop-brand-mark-host"),
            key: "tabletop:studio",
            icon: "tabletop",
            iconClassName: "tadeon-tabletop-brand-mark-icon",
          });
        }

        const mobileFocusIdentity = document.querySelector<HTMLElement>(
          ".tadeon-mobile-header__identity",
        );
        if (mobileFocusIdentity) {
          next.push({
            host: ensureHost(mobileFocusIdentity, "tadeon-tabletop-focus-brand-host"),
            key: "tabletop:focus:mobile",
            icon: "brand",
            iconClassName: "tadeon-tabletop-focus-brand-icon",
          });
        }

        // Keep the desktop mark inside the authored identity block. It spans the
        // eyebrow and title rows instead of becoming a sibling that shifts actions.
        const desktopFocusIdentity = document.querySelector<HTMLElement>(
          ".tadeon-desktop-toolbar > .min-w-0",
        );
        if (desktopFocusIdentity) {
          next.push({
            host: ensureHost(desktopFocusIdentity, "tadeon-tabletop-focus-brand-host"),
            key: "tabletop:focus:desktop",
            icon: "brand",
            iconClassName: "tadeon-tabletop-focus-brand-icon",
          });
        }

        commitPortals(next);
        return;
      }

      clearTabletopHosts();
      const config = heroConfigForPath(pathname);
      if (!config) {
        clearStaleHeroes();
        commitPortals([]);
        return;
      }

      const container = document.querySelector<HTMLElement>(config.selector);
      if (!container) {
        commitPortals([]);
        return;
      }

      clearStaleHeroes(container);
      container.dataset.tadeonPageHero = config.kind;
      commitPortals([
        {
          host: ensureHost(container, "tadeon-page-hero-mark-host"),
          key: `hero:${config.kind}`,
          icon: config.kind,
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

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      observer.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return <>{portals.map(({ host, key, icon, iconClassName }) => createPortal(renderIcon(icon, iconClassName), host, key))}</>;
}
