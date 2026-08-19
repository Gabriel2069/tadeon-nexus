import { createPortal } from "react-dom";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useRouterState } from "@tanstack/react-router";
import { CloudOff, MapPinned, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackupSigil } from "@/components/section-symbols";

type HeroKind = "users" | "tools" | "offline";
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

function samePortals(current: PortalSpec[], next: PortalSpec[]) {
  return (
    current.length === next.length &&
    current.every((item, index) => {
      const candidate = next[index];
      return (
        candidate &&
        item.host === candidate.host &&
        item.key === candidate.key &&
        item.Icon === candidate.Icon &&
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
    let observer: MutationObserver | null = null;

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
          const host = ensureHost(studioBrand, "tadeon-tabletop-brand-mark-host");
          next.push({
            host,
            key: "tabletop:studio",
            Icon: MapPinned,
            iconClassName: "tadeon-tabletop-brand-mark-icon",
          });
        }

        const mobileFocusIdentity = document.querySelector<HTMLElement>(
          ".tadeon-mobile-header__identity",
        );
        if (mobileFocusIdentity) {
          const host = ensureHost(
            mobileFocusIdentity,
            "tadeon-tabletop-focus-brand-host",
          );
          next.push({
            host,
            key: "tabletop:focus:mobile",
            Icon: BrandMark,
            iconClassName: "tadeon-tabletop-focus-brand-icon",
          });
        }

        // Keep the desktop mark inside the authored identity block instead of
        // inserting another sibling into the toolbar. This preserves the shell's
        // action alignment and centers the Tadeon mark against the two text rows.
        const desktopFocusIdentity = document.querySelector<HTMLElement>(
          ".tadeon-desktop-toolbar > .min-w-0",
        );
        if (desktopFocusIdentity) {
          const host = ensureHost(
            desktopFocusIdentity,
            "tadeon-tabletop-focus-brand-host",
          );
          next.push({
            host,
            key: "tabletop:focus:desktop",
            Icon: BrandMark,
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
      const host = ensureHost(container, "tadeon-page-hero-mark-host");
      commitPortals([
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
