import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import {
  SectionSymbol,
  type AppSectionSymbol,
} from "@/components/section-symbols";
import "@/styles/head-parity-final-214.css";
import "@/styles/head-tab-parity-217.css";
import "@/styles/menu-color-source-219.css";
import "@/styles/head-background-signatures-221.css";
import "@/styles/head-rich-signatures-223.css";
import "@/styles/head-system-audit-224.css";
import "@/styles/head-background-coverage-225.css";
import "@/styles/offline-meta-row-226.css";
import "@/styles/head-final-polish-227.css";
import "@/styles/tab-accent-propagation-228.css";
import "@/styles/secondary-tab-accent-propagation-230.css";
import "@/styles/subtle-motion-pass-231.css";

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

function focusIconForPath(pathname: string): IconKind {
  return "brand";
}

function renderIcon(icon: IconKind, className: string) {
  if (icon === "brand") return <BrandMark className={className} />;
  return <SectionSymbol section={icon} className={className} />;
}

function ensureHost(container: HTMLElement, className: string) {
  const matches = Array.from(
    container.querySelectorAll<HTMLElement>(`:scope > .${className}`),
  );
  const [host, ...duplicates] = matches;
  duplicates.forEach((node) => node.remove());
  if (host) return host;
  const created = document.createElement("span");
  created.className = className;
  created.setAttribute("aria-hidden", "true");
  container.prepend(created);
  return created;
}

function lockDesktopFocusGeometry(container: HTMLElement) {
  container.style.setProperty("display", "grid", "important");
  container.style.setProperty(
    "grid-template-columns",
    "2.45rem minmax(0, 1fr)",
    "important",
  );
  container.style.setProperty("grid-template-rows", "auto auto", "important");
  container.style.setProperty("column-gap", ".85rem", "important");
  container.style.setProperty("row-gap", ".08rem", "important");
  container.style.setProperty("align-items", "center", "important");
  container.style.setProperty("padding", "0", "important");
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
      const focusIcon = focusIconForPath(pathname);

      const mobileFocusIdentity = document.querySelector<HTMLElement>(
        ".tadeon-mobile-header__identity",
      );
      if (mobileFocusIdentity) {
        next.push({
          host: ensureHost(mobileFocusIdentity, "tadeon-focus-section-mark-host"),
          key: "focus:mobile",
          icon: focusIcon,
          iconClassName: "tadeon-focus-section-mark-icon",
        });
      }

      const desktopFocusIdentity = document.querySelector<HTMLElement>(
        ".tadeon-desktop-toolbar > .min-w-0",
      );
      if (desktopFocusIdentity) {
        lockDesktopFocusGeometry(desktopFocusIdentity);
        next.push({
          host: ensureHost(desktopFocusIdentity, "tadeon-focus-section-mark-host"),
          key: "focus:desktop",
          icon: focusIcon,
          iconClassName: "tadeon-focus-section-mark-icon",
        });
      }

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
