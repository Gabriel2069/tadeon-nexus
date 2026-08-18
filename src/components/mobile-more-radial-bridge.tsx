import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CloudOff, Users, Wrench, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isApplicationAdministrator } from "@/lib/permissions";
import "@/styles/mobile-more-radial.css";

const MORE_TRIGGER_SELECTOR = ".tadeon-mobile-dock > button.tadeon-mobile-dock__item";

const MASTER_MORE_ITEMS = [
  { to: "/offline", label: "Offline", icon: CloudOff, position: "is-left" },
  { to: "/manage-users", label: "Usuários", icon: Users, position: "is-top" },
  { to: "/nexus-tools", label: "Backup", icon: Wrench, position: "is-right" },
] as const;

type Anchor = { x: number; y: number };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function visibleViewport() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft ?? 0;
  const top = viewport?.offsetTop ?? 0;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  return { left, top, width, height };
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
      viewport.top + viewport.height - half - 12,
    ),
  };
}

function routeIsActive(path: string, target: string) {
  return path === target || path.startsWith(`${target}/`);
}

function syncVisualViewport() {
  const root = document.documentElement;
  const viewport = visibleViewport();
  const keyboardInset = Math.max(
    0,
    window.innerHeight - (viewport.top + viewport.height),
  );

  root.style.setProperty("--tadeon-vv-left", `${viewport.left}px`);
  root.style.setProperty("--tadeon-vv-top", `${viewport.top}px`);
  root.style.setProperty("--tadeon-vv-width", `${viewport.width}px`);
  root.style.setProperty("--tadeon-vv-height", `${viewport.height}px`);
  root.style.setProperty(
    "--tadeon-vv-center-x",
    `${viewport.left + viewport.width / 2}px`,
  );
  root.style.setProperty("--tadeon-keyboard-inset", `${keyboardInset}px`);
  root.dataset.tadeonKeyboard = keyboardInset > 120 ? "open" : "closed";
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
    syncVisualViewport();
    const viewport = window.visualViewport;
    const sync = () => syncVisualViewport();
    const keepFocusedControlVisible = (event: FocusEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (!target.matches("input, textarea, select, [contenteditable='true']")) return;
      window.setTimeout(() => {
        if (document.documentElement.dataset.tadeonKeyboard !== "open") return;
        target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }, 80);
    };

    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("focusin", keepFocusedControlVisible);

    return () => {
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("focusin", keepFocusedControlVisible);
      const root = document.documentElement;
      root.style.removeProperty("--tadeon-vv-left");
      root.style.removeProperty("--tadeon-vv-top");
      root.style.removeProperty("--tadeon-vv-width");
      root.style.removeProperty("--tadeon-vv-height");
      root.style.removeProperty("--tadeon-vv-center-x");
      root.style.removeProperty("--tadeon-keyboard-inset");
      delete root.dataset.tadeonKeyboard;
    };
  }, []);

  useEffect(() => {
    if (!isMestre) return;

    const syncTrigger = () => {
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
      syncVisualViewport();
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
