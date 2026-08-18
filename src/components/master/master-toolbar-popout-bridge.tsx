import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import "@/styles/ui-coherence-192.css";

function queryFlag(name: string) {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function dedicatedUrl() {
  const params = new URLSearchParams(window.location.search);
  params.set("popout", "1");
  return `${window.location.pathname}?${params.toString()}`;
}

function openWorkspacePopout(path: string) {
  const popup = window.open(
    dedicatedUrl(),
    `tadeon-workspace-${path.slice(1) || "workspace"}`,
    "popup=yes,width=1180,height=860,resizable=yes,scrollbars=yes,noopener=yes",
  );
  if (popup) popup.opener = null;
}

export function MasterToolbarPopoutBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const eligible = (path === "/master-panel" || path === "/nexus") && !queryFlag("popout");

  useEffect(() => {
    if (!eligible) return;

    const attach = () => {
      const actions = document.querySelector<HTMLElement>(
        ".tadeon-desktop-toolbar > div:last-child",
      );
      if (!actions) return;

      let portalHost = document.getElementById("tadeon-master-toolbar-popout");
      if (!portalHost) {
        portalHost = document.createElement("span");
        portalHost.id = "tadeon-master-toolbar-popout";
        portalHost.className = "tadeon-master-toolbar-popout-host hidden lg:inline-flex";
        actions.insertBefore(portalHost, actions.firstChild);
      }
      setHost(portalHost);
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById("tadeon-master-toolbar-popout")?.remove();
    };
  }, [eligible]);

  if (!eligible || !host) return null;

  const workspaceLabel = path === "/nexus" ? "O Nexus" : "Painel do Mestre";

  return createPortal(
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="gap-1.5"
      onClick={() => openWorkspacePopout(path)}
      title="Abrir este painel em janela dedicada"
      aria-label={`Abrir ${workspaceLabel} em nova janela`}
    >
      <ExternalLink className="h-4 w-4" />
      <span>Nova janela</span>
    </Button>,
    host,
  );
}
