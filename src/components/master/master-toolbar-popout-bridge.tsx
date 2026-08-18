import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import "@/styles/ui-coherence-192.css";

interface RpcResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<unknown>>;
}

function rpcClient() {
  return supabase as unknown as RpcClient;
}

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

function MasterSessionSavePortal() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [saving, setSaving] = useState(false);
  const eligible =
    typeof window !== "undefined" &&
    window.location.pathname === "/master-panel" &&
    !queryFlag("popout");

  useEffect(() => {
    if (!eligible) return;

    const attach = () => {
      const metrics = Array.from(
        document.querySelectorAll<HTMLElement>(".grid.grid-cols-3.gap-2"),
      ).find((element) => {
        const text = element.textContent ?? "";
        return text.includes("Pistas") && text.includes("Dobras") && text.includes("Iniciativa");
      });

      if (!metrics) return;

      let portalHost = document.getElementById("tadeon-master-session-save");
      if (!portalHost) {
        portalHost = document.createElement("span");
        portalHost.id = "tadeon-master-session-save";
        portalHost.className = "tadeon-master-session-save-host";
      }
      if (portalHost.parentElement !== metrics || metrics.firstElementChild !== portalHost) {
        metrics.prepend(portalHost);
      }
      setHost((current) => (current === portalHost ? current : portalHost));
    };

    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      document.getElementById("tadeon-master-session-save")?.remove();
    };
  }, [eligible]);

  const saveSession = async () => {
    if (saving) return;
    setSaving(true);
    const result = await rpcClient().rpc("save_session_sheet_changes");
    setSaving(false);
    if (result.error) {
      toast.error("Não foi possível registrar as mudanças desta sessão.");
      return;
    }
    const count = typeof result.data === "number" ? result.data : Number(result.data ?? 0);
    toast.success(
      count > 0
        ? `${count} ficha(s) com mudanças registradas.`
        : "Sessão salva sem novas mudanças nas fichas.",
    );
  };

  if (!eligible || !host) return null;

  return createPortal(
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      onClick={() => void saveSession()}
      disabled={saving}
      title="Registrar o Diff das fichas neste ponto da sessão"
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      <span>Salvar sessão</span>
    </Button>,
    host,
  );
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

  const workspaceLabel = path === "/nexus" ? "O Nexus" : "Painel do Mestre";

  return (
    <>
      <MasterSessionSavePortal />
      {eligible && host
        ? createPortal(
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
          )
        : null}
    </>
  );
}
