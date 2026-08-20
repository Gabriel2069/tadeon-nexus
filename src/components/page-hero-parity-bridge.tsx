import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import {
  SectionSymbol,
  type AppSectionSymbol,
} from "@/components/section-symbols";
import "@/styles/head-parity-final-214.css";
import "@/styles/head-parity-lock-215.css";

type HeroKind = Extract<AppSectionSymbol, "users" | "tools" | "offline">;
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
  if (icon === "brand") return <BrandMark className={className} />;
  return <SectionSymbol section={icon} className={className} />;
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

function clearLegacyFocusHosts() {
  document
    .querySelectorAll<HTMLElement>(".tadeon-tabletop-focus-brand-host")
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
      clearLegacyFocusHosts();
      const next: PortalSpec[] = [];

      /* Área em foco: SEMPRE BrandMark do Tadeon. A rota muda apenas a cor. */
      const mobileFocusIdentity = document.querySelector<HTMLElement>(
        ".tadeon-mobile-header__identity",
      );
      if (mobileFocusIdentity) {
        next.push({
          host: ensureHost(mobileFocusIdentity, "tadeon-focus-section-mark-host"),
          key: "focus:mobile",
          icon: "brand",
          iconClassName: "tadeon-focus-section-mark-icon",
        });
      }

      const desktopFocusIdentity = document.querySelector<HTMLElement>(
        ".tadeon-desktop-toolbar > .min-w-0",
      );
      if (desktopFocusIdentity) {
        next.push({
          host: ensureHost(desktopFocusIdentity, "tadeon-focus-section-mark-host"),
          key: "focus:desktop",
          icon: "brand",
          iconClassName: "tadeon-focus-section-mark-icon",
        });
      }

      /* Mesa interna: mantém somente o MapPinned azul no estúdio. */
      if (pathname.startsWith("/tabletop")) {
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
      }

      const config = heroConfigForPath(pathname);
      if (!config) {
        clearStaleHeroes();
      } else {
        const container = document.querySelector<HTMLElement>(config.selector);
        if (container) {
          clearStaleHeroes(container);
          container.dataset.tadeonPageHero = config.kind;
          next.push({
            host: ensureHost(container, "tadeon-page-hero-mark-host"),
            key: `hero:${config.kind}`,
            icon: config.kind,
            iconClassName: "tadeon-page-hero-mark-icon",
          });
        }
      }

      commitPortals(next);
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

  return (
    <>
      {portals.map(({ host, key, icon, iconClassName }) =>
        createPortal(renderIcon(icon, iconClassName), host, key),
      )}
    </>
  );
}
