import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState, type SVGProps } from "react";
import { createPortal } from "react-dom";
import { CloudOff, Users, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isApplicationAdministrator } from "@/lib/permissions";
import "@/styles/mobile-more-radial.css";
import "@/styles/mobile-viewport-final-180.css";

const MORE_TRIGGER_SELECTOR = ".tadeon-mobile-dock > button.tadeon-mobile-dock__item";
const MASTER_DOCK_ICON_SELECTOR = '.tadeon-mobile-dock__item[href="/master-panel"] > svg';
const SVG_NS = "http://www.w3.org/2000/svg";

function BackupDiagnosticsGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3Z" />
      <path d="M9 6h6M8 12h8M8 16h5" />
    </svg>
  );
}

const MASTER_MORE_ITEMS = [
  { to: "/offline", label: "Offline", icon: CloudOff, position: "is-left" },
  { to: "/manage-users", label: "Usuários", icon: Users, position: "is-top" },
  { to: "/nexus-tools", label: "Backup", icon: BackupDiagnosticsGlyph, position: "is-right" },
] as const;

type Anchor = { x: number; y: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function visibleViewport() {
  const viewport = window.visualViewport;
  return {
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

function anchorFor(trigger: HTMLButtonElement): Anchor {
  const rect = trigger.getBoundingClientRect();
  const viewport = visibleViewport();
  const half = viewport.width <= 380 ? 78 : 88;
  return {
    x: clamp(
      rect.left + rect.width / 2,
      viewport.left + half + 8,
      viewport.left + viewport.width - half - 8,
    ),
    y: clamp(
      rect.top - 76,
      viewport.top + half + 8,
      viewport.top + viewport.height - half - 84,
    ),
  };
}

function routeIsActive(path: string, target: string) {
  return path === target || path.startsWith(`${target}/`);
}

function svgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string>,
) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  return element;
}

function syncMasterDockGlyph() {
  const svg = document.querySelector<SVGSVGElement>(MASTER_DOCK_ICON_SELECTOR);
  if (!svg || svg.dataset.tadeonPanelGlyph === "true") return;

  svg.replaceChildren(
    svgElement("circle", {
      cx: "12",
      cy: "12",
      r: "8.25",
      "stroke-dasharray": "9 3.4 2.2 4.3",
      opacity: ".72",
    }),
    svgElement("path", { d: "M12 2.8v4.1M12 17.1v4.1M2.8 12h4.1M17.1 12h4.1" }),
    svgElement("path", { d: "m8.55 12 3.45-3.45L15.45 12 12 15.45 8.55 12Z" }),
    svgElement("path", {
      d: "M6.05 6.35 9.6 9.6M17.95 6.35 14.4 9.6M6.05 17.65l3.55-3.25M17.95 17.65l-3.55-3.25",
    }),
    svgElement("circle", { cx: "6.05", cy: "6.35", r: ".85" }),
    svgElement("circle", { cx: "17.95", cy: "6.35", r: ".85" }),
    svgElement("circle", { cx: "6.05", cy: "17.65", r: ".85" }),
    svgElement("circle", { cx: "17.95", cy: "17.65", r: ".85" }),
    svgElement("circle", { cx: "12", cy: "12", r: "1.15", fill: "currentColor", stroke: "none" }),
  );
  svg.setAttribute("viewBox", "1.4 1.4 21.2 21.2");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.55");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.dataset.tadeonPanelGlyph = "true";
}

export function MobileMoreRadialBridge() {
  const { role } = useAuth();
  const path = useRouterState({ select: (state) => state.location.pathname });
  const isMestre = isApplicationAdministrator({ appRole: role });
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMestre) return;

    const syncTrigger = () => {
      syncMasterDockGlyph();
      const trigger = document.querySelector<HTMLButtonElement>(MORE_TRIGGER_SELECTOR);
      if (!trigger) return;
      triggerRef.current = trigger;
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-controls", "tadeon-mobile-more-radial");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      trigger.dataset.radialActive = MASTER_MORE_ITEMS.some((item) => routeIsActive(path, item.to))
        ? "true"
        : "false";
    };

    const frame = window.requestAnimationFrame(syncTrigger);
    const onClickCapture = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target : null;
      const trigger = element?.closest<HTMLButtonElement>(MORE_TRIGGER_SELECTOR);
      if (!trigger) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      triggerRef.current = trigger;
      setAnchor(anchorFor(trigger));
      setOpen((value) => !value);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("click", onClickCapture, true);
      const trigger = triggerRef.current;
      if (trigger) {
        trigger.removeAttribute("aria-haspopup");
        trigger.setAttribute("aria-controls", "tadeon-mobile-navigation");
        trigger.setAttribute("aria-expanded", "false");
        delete trigger.dataset.radialActive;
      }
    };
  }, [isMestre, open, path]);

  useEffect(() => {
    setOpen(false);
  }, [path]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || triggerRef.current?.contains(target))) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    const reposition = () => {
      if (triggerRef.current) setAnchor(anchorFor(triggerRef.current));
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("orientationchange", reposition);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    const frame = window.requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>("a[role='menuitem']")?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("orientationchange", reposition);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };
  }, [open]);

  if (!isMestre || typeof document === "undefined" || !anchor) return null;

  return createPortal(
    <div
      ref={menuRef}
      id="tadeon-mobile-more-radial"
      className="tadeon-mobile-more-radial"
      data-state={open ? "open" : "closed"}
      style={{ left: anchor.x, top: anchor.y }}
      role="menu"
      aria-label="Outras áreas"
      aria-hidden={!open}
    >
      <span aria-hidden className="tadeon-mobile-more-radial__orbit" />
      {MASTER_MORE_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = routeIsActive(path, item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            aria-current={active ? "page" : undefined}
            className={`tadeon-mobile-more-radial__item ${item.position}${active ? " is-active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <div className="tadeon-mobile-more-radial__center">
        <button
          type="button"
          tabIndex={open ? 0 : -1}
          onClick={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
          aria-label="Fechar outras áreas"
        >
          <X aria-hidden="true" />
        </button>
        <strong>Mais</strong>
      </div>
    </div>,
    document.body,
  );
}
