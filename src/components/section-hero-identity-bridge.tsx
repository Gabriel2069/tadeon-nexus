import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  CloudOff,
  Home,
  Lightbulb,
  MapPinned,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type HeroIdentity = {
  id: "dashboard" | "tabletop" | "master" | "users" | "tools" | "offline";
  selector: string;
  icon: LucideIcon;
  rgb: string;
  secondaryRgb: string;
};

const HERO_IDENTITIES: HeroIdentity[] = [
  {
    id: "dashboard",
    selector: ".tadeon-dashboard-hero",
    icon: Home,
    rgb: "217 215 164",
    secondaryRgb: "183 129 77",
  },
  {
    id: "tabletop",
    selector: ".tadeon-tabletop-studio__header",
    icon: MapPinned,
    rgb: "84 123 148",
    secondaryRgb: "79 110 93",
  },
  {
    id: "master",
    selector: ".tadeon-master-commandbar",
    icon: Lightbulb,
    rgb: "116 36 45",
    secondaryRgb: "217 215 164",
  },
  {
    id: "users",
    selector: ".tadeon-route-users > .tadeon-page-hero",
    icon: Users,
    rgb: "183 129 77",
    secondaryRgb: "217 215 164",
  },
  {
    id: "tools",
    selector: ".tadeon-route-tools > .tadeon-page-hero",
    icon: Wrench,
    rgb: "122 129 135",
    secondaryRgb: "84 123 148",
  },
  {
    id: "offline",
    selector: ".tadeon-route-offline > .tadeon-page-hero",
    icon: CloudOff,
    rgb: "113 107 123",
    secondaryRgb: "79 110 93",
  },
];

function identityForPath(pathname: string) {
  if (pathname === "/") return HERO_IDENTITIES[0];
  if (pathname.startsWith("/tabletop")) return HERO_IDENTITIES[1];
  if (pathname.startsWith("/master-panel")) return HERO_IDENTITIES[2];
  if (pathname.startsWith("/manage-users")) return HERO_IDENTITIES[3];
  if (pathname.startsWith("/nexus-tools")) return HERO_IDENTITIES[4];
  if (pathname.startsWith("/offline")) return HERO_IDENTITIES[5];
  // O Nexus already owns the approved native identity mark and orbital art.
  return null;
}

function ensureHost(hero: HTMLElement) {
  let host = hero.querySelector<HTMLElement>(":scope > .tadeon-section-hero-identity");
  if (host) return host;
  host = document.createElement("span");
  host.className = "tadeon-section-hero-identity";
  host.setAttribute("aria-hidden", "true");
  hero.prepend(host);
  return host;
}

function clearStaleIdentity(active?: HTMLElement | null) {
  document.querySelectorAll<HTMLElement>("[data-tadeon-hero-identity]").forEach((node) => {
    if (node === active) return;
    delete node.dataset.tadeonHeroIdentity;
    node.style.removeProperty("--tadeon-hero-identity-rgb");
    node.style.removeProperty("--tadeon-hero-secondary-rgb");
    node.querySelector(":scope > .tadeon-section-hero-identity")?.remove();
  });
}

export function SectionHeroIdentityBridge() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [portal, setPortal] = useState<{ host: HTMLElement; Icon: LucideIcon } | null>(null);

  useEffect(() => {
    const identity = identityForPath(pathname);
    let frame: number | null = null;
    let observer: MutationObserver | null = null;

    clearStaleIdentity();
    if (!identity) {
      setPortal(null);
      return;
    }

    const sync = () => {
      const hero = document.querySelector<HTMLElement>(identity.selector);
      if (!hero) return;
      clearStaleIdentity(hero);
      hero.dataset.tadeonHeroIdentity = identity.id;
      hero.style.setProperty("--tadeon-hero-identity-rgb", identity.rgb);
      hero.style.setProperty("--tadeon-hero-secondary-rgb", identity.secondaryRgb);
      const host = ensureHost(hero);
      setPortal((current) =>
        current?.host === host && current.Icon === identity.icon
          ? current
          : { host, Icon: identity.icon },
      );
    };

    const schedule = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        sync();
      });
    };

    schedule();
    const main = document.getElementById("tadeon-main");
    if (main) {
      observer = new MutationObserver(schedule);
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  if (!portal) return null;
  return createPortal(
    <portal.Icon className="tadeon-section-hero-identity__icon" />,
    portal.host,
  );
}
