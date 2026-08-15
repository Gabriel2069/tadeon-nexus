import { useEffect, useMemo, useState } from "react";
import {
  Command,
  ExternalLink,
  Eye,
  HeartPulse,
  MonitorPlay,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import "@/styles/tabletop-director-enhancement.css";

interface DirectorCommand {
  id: string;
  label: string;
  button: HTMLButtonElement;
  category: "visão" | "sessão" | "diagnóstico" | "comando";
}

function normalizedText(node: HTMLElement) {
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function commandCategory(label: string): DirectorCommand["category"] {
  const value = label.toLowerCase();
  if (/visão|jogador|projeç|blackout|escurec|revel|ocult/.test(value)) return "visão";
  if (/diagn|latên|conex|status|ping|sincron|saúde/.test(value)) return "diagnóstico";
  if (/sessão|iniciar|encerrar|recarreg|focar|puxar|particip/.test(value)) return "sessão";
  return "comando";
}

function discoverDirectorCommands() {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button"))
    .filter((button) => {
      if (button.disabled) return false;
      if (button.closest(".tadeon-director-command-palette")) return false;
      const label = normalizedText(button);
      if (label.length < 2 || label.length > 46) return false;
      const style = window.getComputedStyle(button);
      return style.display !== "none" && style.visibility !== "hidden";
    })
    .map((button, index) => {
      const label = normalizedText(button) || button.getAttribute("aria-label") || `Comando ${index + 1}`;
      return {
        id: `${index}:${label}`,
        label,
        button,
        category: commandCategory(label),
      } satisfies DirectorCommand;
    })
    .filter((command, index, commands) =>
      commands.findIndex((candidate) => candidate.label === command.label) === index,
    )
    .slice(0, 60);
}

function findCommand(pattern: RegExp) {
  return discoverDirectorCommands().find((command) => pattern.test(command.label.toLowerCase()));
}

function clickCommand(pattern: RegExp) {
  const command = findCommand(pattern);
  command?.button.click();
  return Boolean(command);
}

function currentSessionId() {
  return new URLSearchParams(window.location.search).get("session") ?? "";
}

function openDedicatedDirector() {
  const session = currentSessionId();
  const query = new URLSearchParams({ view: "director", popout: "1" });
  if (session) query.set("session", session);
  window.open(
    `/tabletop?${query.toString()}`,
    session ? `tadeon-director-${session}` : "tadeon-director",
    "popup=yes,width=1380,height=900,resizable=yes,scrollbars=yes",
  );
}

export function TabletopDirectorEnhancementBridge() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<DirectorCommand[]>([]);

  useEffect(() => {
    let frame = 0;
    const refresh = () => {
      frame = 0;
      const next = discoverDirectorCommands();
      setCommands((current) => {
        const before = current.map((item) => `${item.id}:${item.disabled}`).join("|");
        const after = next.map((item) => `${item.id}:${item.disabled}`).join("|");
        return before === after ? current : next;
      });
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(refresh);
    };
    refresh();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-selected", "aria-pressed"],
    });
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.toLowerCase() === "d") clickCommand(/diagn/);
      if (event.key.toLowerCase() === "v") clickCommand(/visão.*jogador|jogador.*visão|player view/);
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return commands.filter((command) => !value || command.label.toLowerCase().includes(value) || command.category.includes(value)).slice(0, 24);
  }, [commands, query]);
  const hasPlayerView = useMemo(
    () => commands.some((command) => /visão.*jogador|jogador.*visão|player view/.test(command.label.toLowerCase())),
    [commands],
  );
  const hasDiagnostics = useMemo(
    () => commands.some((command) => /diagn/.test(command.label.toLowerCase())),
    [commands],
  );

  return (
    <>
      <div className="tadeon-director-enhancement-bar">
        <span data-healthy={commands.length > 0} title="Central construída sobre os comandos canônicos já disponíveis no Painel do Mestre">
          <ShieldCheck aria-hidden="true" />
          {commands.length > 0 ? "Direção pronta" : "Aguardando painel"}
        </span>
        <button type="button" onClick={() => setOpen(true)} title="Central de comandos ~ ⌘/Ctrl+K">
          <Command aria-hidden="true" /> Comandos
        </button>
        <button
          type="button"
          disabled={!hasPlayerView}
          onClick={() => clickCommand(/visão.*jogador|jogador.*visão|player view/)}
          title="Usar o comando canônico de visão do jogador"
        >
          <MonitorPlay aria-hidden="true" /> Visão jogador
        </button>
        <button
          type="button"
          disabled={!hasDiagnostics}
          onClick={() => clickCommand(/diagn/)}
          title="Abrir os diagnósticos do Painel do Mestre"
        >
          <HeartPulse aria-hidden="true" /> Diagnóstico
        </button>
        <button type="button" onClick={openDedicatedDirector} title="Separar o Painel do Mestre em uma janela dedicada">
          <ExternalLink aria-hidden="true" /> Separar
        </button>
      </div>

      {open && (
        <div className="tadeon-director-command-palette" role="dialog" aria-modal="true" aria-label="Central de comandos do mestre">
          <button className="tadeon-director-command-palette__backdrop" type="button" aria-label="Fechar central" onClick={() => setOpen(false)} />
          <section>
            <header>
              <span><Command aria-hidden="true" /></span>
              <div>
                <small>Central do mestre</small>
                <strong>Comandos da sessão</strong>
              </div>
              <Button size="icon" variant="ghost" aria-label="Fechar central" onClick={() => setOpen(false)}><X aria-hidden="true" /></Button>
            </header>
            <label className="tadeon-director-command-palette__search">
              <Search aria-hidden="true" />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar visão, foco, participante, diagnóstico..." />
              <kbd>⌘K</kbd>
            </label>
            <div className="tadeon-director-command-palette__commands">
              {filtered.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  data-category={command.category}
                  onClick={() => {
                    command.button.click();
                    setOpen(false);
                  }}
                >
                  <span>
                    {command.category === "visão" ? <Eye aria-hidden="true" /> : command.category === "diagnóstico" ? <HeartPulse aria-hidden="true" /> : <Command aria-hidden="true" />}
                  </span>
                  <span>
                    <strong>{command.label}</strong>
                    <small>{command.category}</small>
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="tadeon-director-command-palette__empty">Nenhum comando do painel corresponde à busca.</div>
              )}
            </div>
            <footer>
              <span><kbd>D</kbd> diagnóstico</span>
              <span><kbd>V</kbd> visão jogador</span>
              <span>Os comandos continuam passando pelo painel original, permissões e realtime existentes.</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
