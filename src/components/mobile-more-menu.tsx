import { UTILITY_AREAS } from "@/lib/utility-areas";
import { Link } from "@tanstack/react-router";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { CloudOff, MoreHorizontal, Users, X } from "lucide-react";
import { BackupSigil } from "@/components/section-symbols";
import "@/styles/mobile-more-radial.css";
import "@/styles/mobile-viewport.css";

const destinations = [
  { to: "/offline", label: UTILITY_AREAS.offline.label, icon: CloudOff },
  { to: "/manage-users", label: UTILITY_AREAS.users.label, icon: Users },
  { to: "/nexus-tools", label: UTILITY_AREAS.backup.label, icon: BackupSigil },
] as const;

/** The shell owns the trigger; Radix owns anchoring, keyboard and dismissal. */
export function MobileMoreMenu({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const navigatingRef = useRef(false);
  useEffect(() => {
    if (!open) return;
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (!desktop.matches) return;
      navigatingRef.current = true;
      setOpen(false);
      document.getElementById("tadeon-main")?.focus({ preventScroll: true });
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [open]);
  const active = destinations.some(({ to }) => path === to || path.startsWith(`${to}/`));
  return (
    <Menu.Root
      open={open}
      onOpenChange={(next) => {
        if (next) navigatingRef.current = false;
        setOpen(next);
      }}
    >
      <Menu.Trigger asChild>
        <button
          type="button"
          data-material-surface="navigation"
          className="tadeon-mobile-dock__item"
          data-more-active={active}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
          <span>Mais</span>
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          className="tadeon-mobile-more"
          aria-label="Outras áreas"
          aria-labelledby={undefined}
          side="top"
          align="end"
          sideOffset={14}
          collisionPadding={16}
          onCloseAutoFocus={(event) => {
            if (navigatingRef.current) {
              event.preventDefault();
              document.getElementById("tadeon-main")?.focus({ preventScroll: true });
            }
          }}
          loop
        >
          <Menu.Label className="tadeon-mobile-more__heading">Outras áreas</Menu.Label>
          {destinations.map(({ to, label, icon: Icon }) => (
            <Menu.Item key={to} asChild textValue={label}>
              <Link
                to={to}
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  // Router links prevent default; menu onSelect therefore cannot own navigation dismissal.
                  navigatingRef.current = true;
                  setOpen(false);
                }}
                aria-current={path === to || path.startsWith(`${to}/`) ? "page" : undefined}
                className="tadeon-mobile-more__item"
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </Menu.Item>
          ))}
          <div className="tadeon-mobile-more__center">
            <Menu.Item asChild textValue="Fechar outras áreas" onSelect={() => setOpen(false)}>
              <button type="button" aria-label="Fechar outras áreas">
                <X aria-hidden="true" />
              </button>
            </Menu.Item>
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
