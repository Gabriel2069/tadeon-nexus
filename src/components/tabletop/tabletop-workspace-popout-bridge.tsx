import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

function isDedicatedTabletop() {
  if (typeof window === "undefined") return true;
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("popout") === "1" ||
    params.get("standalone") === "1" ||
    params.get("view") === "director"
  );
}

function openDedicatedTabletop() {
  const params = new URLSearchParams(window.location.search);
  params.set("popout", "1");
  params.delete("view");
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ""}`;
  const popup = window.open(
    url,
    "tadeon-tabletop-workspace",
    "popup=yes,width=1500,height=960,resizable=yes,scrollbars=yes,noopener=yes",
  );
  if (popup) popup.opener = null;
}

function ensureHost(anchor: HTMLElement) {
  const existing = document.getElementById("tadeon-tabletop-popout-host");
  if (existing) return existing;
  const host = document.createElement("span");
  host.id = "tadeon-tabletop-popout-host";
  host.className = "tadeon-tabletop-popout-host";
  anchor.append(host);
  return host;
}

export function TabletopWorkspacePopoutBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const eligible =
    typeof window !== "undefined" &&
    window.location.pathname === "/tabletop" &&
    !isDedicatedTabletop();

  useEffect(() => {
    if (!eligible) return;

    const attach = () => {
      const anchor =
        document.querySelector<HTMLElement>(".tadeon-tabletop-toolbar") ??
        document.querySelector<HTMLElement>(".tadeon-tabletop-reliability-strip") ??
        document.querySelector<HTMLElement>(".tadeon-tabletop-studio__header");
      if (anchor) setHost(ensureHost(anchor));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [eligible]);

  if (!eligible || !host) return null;

  return createPortal(
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="tadeon-tabletop-popout-button"
      onClick={openDedicatedTabletop}
      title="Abrir Mesa em janela independente"
      aria-label="Abrir Mesa em janela independente"
    >
      <ExternalLink className="h-4 w-4" />
    </Button>,
    host,
  );
}
