import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ExternalLink,
  Gamepad2,
  GripVertical,
  History,
  Link2,
  Loader2,
  Pencil,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import "@/styles/sheet-individual-fit-final.css";

const SHEET_PATH = /^\/sheet\/([^/]+)$/;
const NEXUS_DRAG_MIME = "application/x-tadeon-nexus-node";

interface RpcResult<T> {
  data: T | null;
  error: { message?: string } | null;
}

interface RpcClient {
  rpc(name: string, args?: Record<string, unknown>): PromiseLike<RpcResult<unknown>>;
}

interface SheetHistoryEntry {
  id: string;
  saved_at: string;
  sheet_name: string;
  changes: Record<string, { before?: unknown; after?: unknown }>;
}

interface SheetNexusLink {
  id: string;
  knowledge_node_id: string;
  label: string;
  relation_type: string;
  created_at: string;
}

const HISTORY_LABELS: Record<string, string> = {
  session_baseline: "Início do acompanhamento",
  name: "Nome",
  occupation: "Ocupação",
  age: "Idade",
  brand: "Marca",
  origin: "Origem",
  motivation: "Motivação",
  exposure: "Exposição",
  equilibrium: "Equilíbrio",
  drift: "Deriva",
  attributes: "Atributos",
  stats: "Pontos",
  condition: "Condição",
  conditions: "Condições",
  dying: "Morrendo",
  going_insane: "Colapso",
  skills: "Perícias",
  weapons: "Armas",
  inventory: "Inventário",
  inventory_capacity: "Capacidade",
  abilities: "Habilidades",
  plots: "Tramas",
  fragments: "Fragmentos",
  stat_upgrades: "Aprimoramentos",
  purchased_skills: "Habilidades adquiridas",
  description: "História",
  identity_data: "Identidade",
  fragments_items: "Fragmentos vinculados",
  defense_items: "Proteções",
  weapon_proficiency: "Proficiência",
  weapon_proficiency_family: "Família de proficiência",
};

function rpcClient() {
  return supabase as unknown as RpcClient;
}

function queryFlag(name: string) {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function queryMode() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("mode");
}

function withDedicatedPopout(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  params.set("popout", "1");
  return `${pathname}?${params.toString()}`;
}

function findToolbarAnchor() {
  return (
    document.querySelector<HTMLElement>(".tadeon-sheet-power-button") ??
    document.querySelector<HTMLElement>(".tadeon-sheet-save-button")
  );
}

function ensurePortalHost(anchor: HTMLElement, id: string, className = "tadeon-sheet-experience-host") {
  let host = document.getElementById(id);
  if (host) return host;
  host = document.createElement("span");
  host.id = id;
  host.className = className;
  anchor.insertAdjacentElement("afterend", host);
  return host;
}

function openPopout(url: string, name: string) {
  const popup = window.open(
    url,
    name,
    "popup=yes,width=1180,height=860,resizable=yes,scrollbars=yes,noopener=yes",
  );
  if (popup) popup.opener = null;
}

function compactValue(value: unknown) {
  if (value === null || value === undefined) return "~";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return `${value.length} registro(s)`;
  if (typeof value === "object") return `${Object.keys(value as Record<string, unknown>).length} campo(s)`;
  return String(value);
}

export function SheetExperienceBridge() {
  const { user } = useAuth();
  const match = typeof window === "undefined" ? null : window.location.pathname.match(SHEET_PATH);
  const sheetId = match?.[1] ?? null;
  const embedded = queryFlag("embed");
  const popout = queryFlag("popout");
  const [mode, setMode] = useState<"edit" | "game">(() => {
    if (!sheetId || typeof window === "undefined") return "game";
    if (embedded || queryMode() === "game") return "game";
    if (queryMode() === "edit") return "edit";
    const stored = window.sessionStorage.getItem(`tadeon-sheet-mode:${sheetId}`);
    return stored === "edit" ? "edit" : "game";
  });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<SheetHistoryEntry[]>([]);
  const [nexusLinks, setNexusLinks] = useState<SheetNexusLink[]>([]);
  const storageKey = useMemo(() => (sheetId ? `tadeon-sheet-mode:${sheetId}` : ""), [sheetId]);

  const loadNexusLinks = useCallback(async () => {
    if (!sheetId) return;
    const result = await rpcClient().rpc("get_sheet_knowledge_links", { p_sheet_id: sheetId });
    if (!result.error && Array.isArray(result.data)) {
      setNexusLinks(result.data as SheetNexusLink[]);
    }
  }, [sheetId]);

  const loadHistory = useCallback(async () => {
    if (!sheetId) return;
    setHistoryLoading(true);
    const result = await rpcClient().rpc("get_sheet_session_changes", {
      p_sheet_id: sheetId,
      p_limit: 16,
    });
    setHistoryLoading(false);
    if (result.error) {
      toast.error("Não foi possível carregar as mudanças de sessão.");
      return;
    }
    setHistory(Array.isArray(result.data) ? (result.data as SheetHistoryEntry[]) : []);
  }, [sheetId]);

  useEffect(() => {
    if (!sheetId) return;
    const root = document.documentElement;
    root.dataset.tadeonSheetMode = mode;
    if (embedded) root.dataset.tadeonSheetEmbed = "tabletop";
    else delete root.dataset.tadeonSheetEmbed;
    window.sessionStorage.setItem(storageKey, mode);
    return () => {
      delete root.dataset.tadeonSheetMode;
      delete root.dataset.tadeonSheetEmbed;
    };
  }, [embedded, mode, sheetId, storageKey]);

  useEffect(() => {
    if (!sheetId || embedded) return;
    const attach = () => {
      const anchor = findToolbarAnchor();
      if (!anchor) return;
      setPortalHost(ensurePortalHost(anchor, "tadeon-sheet-experience-actions"));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [embedded, sheetId]);

  useEffect(() => {
    if (!sheetId || !user?.id) return;
    const channel = supabase.channel(`sheet-presence:${sheetId}`, {
      config: { presence: { key: user.id } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({
          user_id: user.id,
          email: user.email ?? "",
          opened_at: new Date().toISOString(),
        });
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sheetId, user?.email, user?.id]);

  useEffect(() => {
    if (!sheetId) return;
    void loadNexusLinks();
  }, [loadNexusLinks, sheetId]);

  useEffect(() => {
    if (!sheetId) return;
    const glossary: Record<string, string> = {
      "sec-info": "Identidade, origem, ocupação e marcas que situam a personagem no mundo.",
      "sec-attr": "Atributos medem potenciais fundamentais e sustentam testes e derivados.",
      "sec-pontos": "Recursos atuais e máximos da personagem, além da proteção em jogo.",
      equilibrio: "Equilíbrio acompanha o estado interno e suas pressões atuais.",
      exposicao: "Exposição registra o contato acumulado com forças e fenômenos relevantes.",
      condicoes: "Condições registram estados ativos que alteram a situação da personagem.",
      "sec-pericias": "Perícias expressam competências treinadas e seus graus atuais.",
      "sec-armas": "Armas e proficiências disponíveis no momento.",
      "sec-inv": "Inventário reúne objetos carregados, recipientes e recursos materiais.",
      "sec-hab": "Habilidades já adquiridas e disponíveis para consulta.",
      "tramas-fragmentos": "Fragmentos e manifestações vinculados à personagem.",
      "sec-notas": "Notas de campo e registros livres da personagem.",
    };
    const apply = () => {
      Object.entries(glossary).forEach(([id, text]) => {
        const node = document.getElementById(id);
        if (!node) return;
        node.setAttribute("data-tadeon-context-help", text);
        if (!node.getAttribute("title")) node.setAttribute("title", text);
      });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [sheetId]);

  useEffect(() => {
    if (!sheetId) return;
    const dragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(NEXUS_DRAG_MIME)) return;
      event.preventDefault();
      document.documentElement.dataset.tadeonNexusDrop = "ready";
    };
    const dragLeave = () => delete document.documentElement.dataset.tadeonNexusDrop;
    const drop = (event: DragEvent) => {
      const raw = event.dataTransfer?.getData(NEXUS_DRAG_MIME);
      delete document.documentElement.dataset.tadeonNexusDrop;
      if (!raw) return;
      event.preventDefault();
      let payload: { id?: string; label?: string } = {};
      try {
        payload = JSON.parse(raw) as { id?: string; label?: string };
      } catch {
        return;
      }
      if (!payload.id) return;
      void (async () => {
        const result = await rpcClient().rpc("link_sheet_knowledge", {
          p_sheet_id: sheetId,
          p_node_id: payload.id,
          p_label: payload.label ?? "Página do Nexus",
        });
        if (result.error) {
          toast.error("Não foi possível ligar esta página do Nexus à ficha.");
          return;
        }
        toast.success("Página do Nexus ligada à ficha.");
        await loadNexusLinks();
      })();
    };
    document.addEventListener("dragover", dragOver);
    document.addEventListener("dragleave", dragLeave);
    document.addEventListener("drop", drop);
    return () => {
      document.removeEventListener("dragover", dragOver);
      document.removeEventListener("dragleave", dragLeave);
      document.removeEventListener("drop", drop);
      delete document.documentElement.dataset.tadeonNexusDrop;
    };
  }, [loadNexusLinks, sheetId]);

  if (!sheetId || embedded || !portalHost) return null;

  return (
    <>
      {createPortal(
        <>
          <Button
            size="sm"
            variant={mode === "game" ? "default" : "outline"}
            className="tadeon-sheet-game-button gap-1.5"
            data-state={mode === "game" ? "active" : "inactive"}
            aria-pressed={mode === "game"}
            onClick={() => setMode((current) => (current === "game" ? "edit" : "game"))}
            title={mode === "game" ? "Voltar à edição completa" : "Ativar versão de jogo"}
          >
            {mode === "game" ? <Pencil className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
            <span>{mode === "game" ? "Editar" : "Jogo"}</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setHistoryOpen(true);
              void loadHistory();
            }}
            title="Ver mudanças registradas ao salvar sessões"
            aria-label="Ver mudanças de sessão"
          >
            <History className="h-4 w-4" />
          </Button>
          <span className="tadeon-sheet-presence" title={`${onlineCount} pessoa(s) com esta ficha aberta`}>
            <Users aria-hidden="true" />
            {onlineCount}
          </span>
          {!popout && (
            <Button
              size="icon"
              variant="ghost"
              className="tadeon-sheet-popout-button"
              onClick={() =>
                openPopout(
                  `/sheet/${sheetId}?mode=${mode === "game" ? "game" : "edit"}&popout=1`,
                  `tadeon-sheet-${sheetId}`,
                )
              }
              title="Abrir ficha em janela dedicada"
              aria-label="Abrir ficha em janela dedicada"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {nexusLinks.length > 0 && (
            <span className="tadeon-sheet-nexus-links" title="Páginas do Nexus ligadas à ficha">
              <Link2 aria-hidden="true" /> {nexusLinks.length}
            </span>
          )}
        </>,
        portalHost,
      )}

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[88dvh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cinzel">Mudanças por sessão</DialogTitle>
            <DialogDescription>
              Só aparecem alterações capturadas quando o mestre usa Salvar sessão. Este histórico é informativo e não restaura versões antigas.
            </DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando mudanças...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma mudança de sessão registrada ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <article key={entry.id} className="rounded-xl border border-border/70 bg-card/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-sm">{entry.sheet_name || "Ficha"}</strong>
                    <time className="text-xs text-muted-foreground">
                      {new Date(entry.saved_at).toLocaleString("pt-BR")}
                    </time>
                  </div>
                  <div className="grid gap-2">
                    {Object.entries(entry.changes ?? {}).map(([key, change]) => (
                      <div key={key} className="tadeon-sheet-diff-row">
                        <span>{HISTORY_LABELS[key] ?? key}</span>
                        <small>{compactValue(change.before)}</small>
                        <strong>{compactValue(change.after)}</strong>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WorkspacePopoutBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [sessionSaving, setSessionSaving] = useState(false);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const eligible = (path === "/master-panel" || path === "/nexus") && !queryFlag("popout");

  useEffect(() => {
    if (!eligible) return;
    const attach = () => {
      const anchor = document.querySelector<HTMLElement>("main h1, main h2, [data-page-title]");
      if (!anchor) return;
      setHost(ensurePortalHost(anchor, "tadeon-workspace-popout", "tadeon-workspace-popout-host"));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [eligible]);

  const saveSession = async () => {
    if (sessionSaving) return;
    setSessionSaving(true);
    const result = await rpcClient().rpc("save_session_sheet_changes");
    setSessionSaving(false);
    if (result.error) {
      toast.error("Não foi possível registrar as mudanças desta sessão.");
      return;
    }
    const count = typeof result.data === "number" ? result.data : Number(result.data ?? 0);
    toast.success(count > 0 ? `${count} ficha(s) com mudanças registradas.` : "Sessão salva sem novas mudanças nas fichas.");
  };

  if (!eligible || !host) return null;
  return createPortal(
    <>
      {path === "/master-panel" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => void saveSession()}
          disabled={sessionSaving}
          title="Registrar o Diff das fichas neste ponto da sessão"
        >
          {sessionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Salvar sessão</span>
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        className="gap-1.5"
        onClick={() =>
          openPopout(
            withDedicatedPopout(window.location.pathname, window.location.search),
            `tadeon-workspace-${path.slice(1)}`,
          )
        }
        title="Abrir este painel em janela dedicada"
      >
        <ExternalLink className="h-4 w-4" />
        <span className="hidden lg:inline">Nova janela</span>
      </Button>
    </>,
    host,
  );
}

export function NexusSheetDragBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const nodeId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("node");

  useEffect(() => {
    if (path !== "/nexus" || !nodeId) return;
    const attach = () => {
      const anchor = document.querySelector<HTMLElement>("main h1, main h2, [data-page-title]");
      if (!anchor) return;
      setHost(ensurePortalHost(anchor, "tadeon-nexus-sheet-drag", "tadeon-nexus-sheet-drag-host"));
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [nodeId, path]);

  if (path !== "/nexus" || !nodeId || !host) return null;
  const label = document.querySelector<HTMLElement>("main h1, main h2")?.textContent?.trim() || "Página do Nexus";

  return createPortal(
    <button
      type="button"
      draggable
      className="tadeon-nexus-drag-chip"
      title="Arraste para uma ficha aberta para criar um vínculo persistente"
      onDragStart={(event) => {
        const payload = JSON.stringify({ id: nodeId, label });
        event.dataTransfer.setData(NEXUS_DRAG_MIME, payload);
        event.dataTransfer.setData("text/plain", `${label} ~ /nexus?node=${nodeId}`);
        event.dataTransfer.effectAllowed = "link";
      }}
    >
      <GripVertical aria-hidden="true" />
      Arrastar para ficha
    </button>,
    host,
  );
}
