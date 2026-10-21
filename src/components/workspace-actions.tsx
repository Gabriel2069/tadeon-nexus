import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

/** Explicit route actions replace header discovery, portals and duplicate RPC controls. */
export function WorkspaceActions({
  workspace,
  nodeId,
  menuItem = false,
  compact = false,
}: {
  workspace: "/nexus" | "/master-panel" | "/tabletop";
  nodeId?: string;
  menuItem?: boolean;
  compact?: boolean;
}) {
  const { user, role } = useAuth();
  const identity = `${user?.id ?? ""}:${role ?? ""}`;
  const activeIdentity = useRef(identity);
  activeIdentity.current = identity;
  const mounted = useRef(true);
  const pending = useRef(new Set<string>());
  const [savingIdentity, setSavingIdentity] = useState<string | null>(null);
  const saving = savingIdentity === identity;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const dedicated =
    params.get("popout") === "1" ||
    params.get("standalone") === "1" ||
    params.get("embed") === "1" ||
    params.get("view") === "director";
  const saveSession = async () => {
    if (pending.current.has(identity) || !user?.id || role !== "mestre") return;
    pending.current.add(identity);
    setSavingIdentity(identity);
    const startedBy = identity;
    const current = () => mounted.current && activeIdentity.current === startedBy;
    try {
      const { data, error } = await (
        supabase as unknown as {
          rpc(
            name: "save_session_sheet_changes",
          ): PromiseLike<{ data: number | null; error: unknown }>;
        }
      ).rpc("save_session_sheet_changes");
      if (!current()) return;
      if (error) throw error;
      const count = typeof data === "number" ? data : Number(data ?? 0);
      toast.success(
        count > 0
          ? `${count} ficha(s) com mudanças registradas.`
          : "Sessão salva sem novas mudanças nas fichas.",
      );
    } catch {
      if (current()) toast.error("Não foi possível registrar as mudanças desta sessão.");
    } finally {
      pending.current.delete(startedBy);
      if (current()) setSavingIdentity(null);
    }
  };
  if (dedicated) return null;
  const label =
    workspace === "/nexus"
      ? "O Nexus"
      : workspace === "/tabletop"
        ? "Mesa Nexus"
        : "Painel do Mestre";
  const openWorkspace = () => {
    const next = new URLSearchParams(window.location.search);
    next.set("popout", "1");
    if (workspace === "/tabletop") next.delete("view");
    if (workspace === "/nexus") {
      if (nodeId) next.set("node", nodeId);
      else next.delete("node");
    }
    const popup = window.open(
      `${workspace}?${next.toString()}`,
      `tadeon-workspace-${workspace.slice(1)}`,
      `popup=yes,width=${workspace === "/tabletop" ? 1500 : 1180},height=960,resizable=yes,scrollbars=yes,noopener=yes`,
    );
    if (popup) popup.opener = null;
  };
  if (menuItem)
    return (
      <DropdownMenuItem onSelect={openWorkspace}>
        <ExternalLink className="h-4 w-4" />
        Nova janela
      </DropdownMenuItem>
    );
  return (
    <>
      {workspace === "/master-panel" && role === "mestre" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => void saveSession()}
          disabled={saving}
          title="Registrar as mudanças das fichas neste ponto da sessão"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar sessão
        </Button>
      )}
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        title={`Abrir ${label} em nova janela`}
        aria-label={`Abrir ${label} em nova janela`}
        onClick={openWorkspace}
      >
        <ExternalLink className="h-4 w-4" />
        <span className={compact ? "sr-only" : undefined}>Nova janela</span>
      </Button>
    </>
  );
}
