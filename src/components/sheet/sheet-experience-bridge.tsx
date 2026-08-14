import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Gamepad2, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const SHEET_PATH = /^\/sheet\/([^/]+)$/;

function queryFlag(name: string) {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function queryMode() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("mode");
}

function findToolbarAnchor() {
  return document.querySelector<HTMLElement>(".tadeon-sheet-power-button") ??
    document.querySelector<HTMLElement>(".tadeon-sheet-save-button");
}

function ensurePortalHost(anchor: HTMLElement, id: string) {
  let host = document.getElementById(id);
  if (host) return host;
  host = document.createElement("span");
  host.id = id;
  host.className = "tadeon-sheet-experience-host";
  anchor.insertAdjacentElement("afterend", host);
  return host;
}

function openPopout(url: string, name: string) {
  window.open(
    url,
    name,
    "popup=yes,width=1180,height=860,resizable=yes,scrollbars=yes",
  );
}

export function SheetExperienceBridge() {
  const { user } = useAuth();
  const match = typeof window === "undefined" ? null : window.location.pathname.match(SHEET_PATH);
  const sheetId = match?.[1] ?? null;
  const embedded = queryFlag("embed");
  const [mode, setMode] = useState<"edit" | "game">(() => {
    if (!sheetId || typeof window === "undefined") return "edit";
    if (queryMode() === "game" || embedded) return "game";
    return window.sessionStorage.getItem(`tadeon-sheet-mode:${sheetId}`) === "game"
      ? "game"
      : "edit";
  });
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const storageKey = useMemo(
    () => (sheetId ? `tadeon-sheet-mode:${sheetId}` : ""),
    [sheetId],
  );

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

  if (!sheetId || embedded || !portalHost) return null;

  return createPortal(
    <>
      <Button
        size="sm"
        variant={mode === "game" ? "default" : "outline"}
        className="tadeon-sheet-game-button gap-1.5"
        onClick={() => setMode((current) => (current === "game" ? "edit" : "game"))}
        title={mode === "game" ? "Voltar à edição completa" : "Ativar versão de jogo"}
      >
        {mode === "game" ? <Pencil className="h-4 w-4" /> : <Gamepad2 className="h-4 w-4" />}
        <span>{mode === "game" ? "Editar" : "Jogo"}</span>
      </Button>
      <span className="tadeon-sheet-presence" title={`${onlineCount} pessoa(s) com esta ficha aberta`}>
        <Users aria-hidden="true" />
        {onlineCount}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="tadeon-sheet-popout-button"
        onClick={() => openPopout(`/sheet/${sheetId}?mode=${mode === "game" ? "game" : "edit"}&popout=1`, `tadeon-sheet-${sheetId}`)}
        title="Abrir ficha em janela separada"
        aria-label="Abrir ficha em janela separada"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </>,
    portalHost,
  );
}

export function WorkspacePopoutBridge() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const path = typeof window === "undefined" ? "" : window.location.pathname;
  const eligible = path === "/master-panel" || path === "/nexus";

  useEffect(() => {
    if (!eligible) return;
    const attach = () => {
      const anchor = document.querySelector<HTMLElement>("main h1, main h2, [data-page-title]");
      if (!anchor) return;
      let node = document.getElementById("tadeon-workspace-popout");
      if (!node) {
        node = document.createElement("span");
        node.id = "tadeon-workspace-popout";
        node.className = "tadeon-workspace-popout-host";
        anchor.insertAdjacentElement("afterend", node);
      }
      setHost(node);
    };
    attach();
    const observer = new MutationObserver(attach);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [eligible]);

  if (!eligible || !host) return null;
  return createPortal(
    <Button
      size="sm"
      variant="ghost"
      className="gap-1.5"
      onClick={() => openPopout(`${window.location.pathname}${window.location.search}`, `tadeon-workspace-${path.slice(1)}`)}
      title="Abrir este painel em janela separada"
    >
      <ExternalLink className="h-4 w-4" />
      <span className="hidden lg:inline">Nova janela</span>
    </Button>,
    host,
  );
}
