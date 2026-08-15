import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CopyPlus,
  Crosshair,
  Eye,
  Focus,
  Hand,
  Layers3,
  Maximize2,
  Menu,
  MousePointer2,
  Redo2,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopSnapshot } from "@/lib/tabletop/types";

type InterfaceMode = "play" | "build" | "direct" | "advanced";

type CommandAction = {
  id: string;
  label: string;
  hint: string;
  keywords: string;
  masterOnly?: boolean;
  destructive?: boolean;
  run: () => void;
};

function typingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

function clickWorkspaceFlow(label: string) {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>(".tadeon-tabletop-command-spaces button"),
  );
  buttons.find((button) => button.textContent?.includes(label))?.click();
}

function focusCanvas() {
  document.querySelector<HTMLCanvasElement>('[aria-label="Canvas da Mesa Nexus"]')?.focus({
    preventScroll: true,
  });
}

export function TabletopProgressiveInterfaceBridge({
  role,
}: {
  role: "mestre" | "jogador";
}) {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [cleanPreview, setCleanPreview] = useState(false);
  const [mode, setMode] = useState<InterfaceMode>(() => {
    if (typeof window === "undefined" || role !== "mestre") return "play";
    const stored = window.localStorage.getItem("tadeon-tabletop-interface-mode");
    return stored === "build" || stored === "direct" || stored === "advanced" ? stored : "play";
  });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      const runtime = currentTabletopRuntime();
      setSnapshot(runtime?.snapshot() ?? null);
    };
    refresh();
    window.addEventListener("tadeon-tabletop-render", refresh);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", refresh);
    return () => {
      window.removeEventListener("tadeon-tabletop-render", refresh);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", refresh);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.tadeonTabletopInterface = role === "mestre" ? mode : "play";
    if (role === "mestre") window.localStorage.setItem("tadeon-tabletop-interface-mode", mode);
    return () => {
      delete html.dataset.tadeonTabletopInterface;
    };
  }, [mode, role]);

  useEffect(() => {
    const html = document.documentElement;
    if (cleanPreview) html.dataset.tadeonTabletopClean = "true";
    else delete html.dataset.tadeonTabletopClean;
    return () => {
      delete html.dataset.tadeonTabletopClean;
    };
  }, [cleanPreview]);

  useEffect(() => {
    if (!commandOpen) return;
    const frame = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [commandOpen]);

  const selected = useMemo(() => {
    if (!snapshot) return [];
    const ids = new Set(snapshot.selectedIds);
    return snapshot.scene.entities.filter((entity) => ids.has(entity.id));
  }, [snapshot]);

  const runEngine = (action: (engine: NonNullable<ReturnType<typeof currentTabletopRuntime>>["engine"]) => void) => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    action(runtime.engine);
    focusCanvas();
  };

  const setProgressiveMode = (next: InterfaceMode) => {
    setMode(next);
    if (next === "build") clickWorkspaceFlow("Montar");
    if (next === "direct") clickWorkspaceFlow("Dirigir");
  };

  const commands = useMemo<CommandAction[]>(
    () => [
      {
        id: "select",
        label: "Selecionar",
        hint: "V",
        keywords: "selecionar cursor mover token objeto",
        run: () => runEngine((engine) => engine.setToolMode("select")),
      },
      {
        id: "pan",
        label: "Mover câmera",
        hint: "H",
        keywords: "camera mao navegar pan",
        run: () => runEngine((engine) => engine.setToolMode("pan")),
      },
      {
        id: "measure",
        label: "Medir distância",
        hint: "R",
        keywords: "regua medir distancia movimento",
        run: () => runEngine((engine) => engine.setToolMode("measure")),
      },
      {
        id: "fit",
        label: "Enquadrar a cena",
        hint: "",
        keywords: "zoom enquadrar cena mapa tudo",
        run: () => runEngine((engine) => engine.fitToScreen()),
      },
      {
        id: "focus",
        label: "Focar seleção",
        hint: "",
        keywords: "foco selecao token objeto",
        run: () => runEngine((engine) => engine.focusSelection()),
      },
      {
        id: "undo",
        label: "Desfazer",
        hint: "⌘Z",
        keywords: "undo desfazer voltar",
        masterOnly: true,
        run: () => runEngine((engine) => engine.undo()),
      },
      {
        id: "redo",
        label: "Refazer",
        hint: "⇧⌘Z",
        keywords: "redo refazer",
        masterOnly: true,
        run: () => runEngine((engine) => engine.redo()),
      },
      {
        id: "duplicate",
        label: "Duplicar seleção",
        hint: "⌘D",
        keywords: "duplicar copiar clone",
        masterOnly: true,
        run: () => runEngine((engine) => engine.duplicateSelected()),
      },
      {
        id: "delete",
        label: "Excluir seleção",
        hint: "Del",
        keywords: "excluir apagar remover",
        masterOnly: true,
        destructive: true,
        run: () => runEngine((engine) => engine.deleteSelected()),
      },
      {
        id: "essential",
        label: "Interface essencial",
        hint: "",
        keywords: "simples limpa jogar essencial",
        masterOnly: true,
        run: () => setProgressiveMode("play"),
      },
      {
        id: "build",
        label: "Modo Montar",
        hint: "",
        keywords: "montar biblioteca asset mapa objeto token",
        masterOnly: true,
        run: () => setProgressiveMode("build"),
      },
      {
        id: "direct",
        label: "Modo Dirigir",
        hint: "",
        keywords: "dirigir mestre oculto cena jogadores",
        masterOnly: true,
        run: () => setProgressiveMode("direct"),
      },
      {
        id: "advanced",
        label: "Mostrar tudo",
        hint: "",
        keywords: "avancado completo todas ferramentas",
        masterOnly: true,
        run: () => setProgressiveMode("advanced"),
      },
      {
        id: "clean",
        label: cleanPreview ? "Sair da tela limpa" : "Tela limpa",
        hint: "",
        keywords: "preview apresentacao projetar limpa",
        run: () => setCleanPreview((current) => !current),
      },
      {
        id: "fullscreen",
        label: "Tela cheia",
        hint: "",
        keywords: "fullscreen tela cheia projetar",
        run: () => {
          if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
          else void document.exitFullscreen?.();
        },
      },
    ],
    [cleanPreview, role],
  );

  const visibleCommands = useMemo(() => {
    const query = commandSearch.trim().toLocaleLowerCase("pt-BR");
    return commands.filter((command) => {
      if (command.masterOnly && role !== "mestre") return false;
      if (!query) return true;
      return `${command.label} ${command.keywords}`.toLocaleLowerCase("pt-BR").includes(query);
    });
  }, [commandSearch, commands, role]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (typingTarget(event.target)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
        return;
      }
      if (event.key === "Escape" && commandOpen) {
        event.preventDefault();
        setCommandOpen(false);
        return;
      }
      if (role === "mestre" && modifier && event.key === ".") {
        event.preventDefault();
        setProgressiveMode(mode === "advanced" ? "play" : "advanced");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen, mode, role]);

  const selectionLabel =
    selected.length === 1 ? selected[0]?.label || "1 item" : `${selected.length} itens`;

  return (
    <>
      {!cleanPreview && (
        <div className="tadeon-tabletop-progressive-dock" aria-label="Controles rápidos da Mesa">
          <button
            type="button"
            className="tadeon-tabletop-progressive-dock__button"
            onClick={() => runEngine((engine) => engine.setToolMode("select"))}
            aria-label="Selecionar"
            title="Selecionar · V"
          >
            <MousePointer2 />
            <span>Selecionar</span>
          </button>
          <button
            type="button"
            className="tadeon-tabletop-progressive-dock__button"
            onClick={() => runEngine((engine) => engine.setToolMode("pan"))}
            aria-label="Mover câmera"
            title="Mover câmera · H"
          >
            <Hand />
            <span>Mover</span>
          </button>
          <button
            type="button"
            className="tadeon-tabletop-progressive-dock__button"
            onClick={() => runEngine((engine) => engine.setToolMode("measure"))}
            aria-label="Medir"
            title="Medir · R"
          >
            <Ruler />
            <span>Medir</span>
          </button>

          {role === "mestre" && (
            <div className="tadeon-tabletop-progressive-dock__modes" aria-label="Modos de trabalho">
              <button
                type="button"
                aria-pressed={mode === "play"}
                onClick={() => setProgressiveMode("play")}
                title="Interface essencial"
              >
                <Sparkles />
                <span>Jogar</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "build"}
                onClick={() => setProgressiveMode("build")}
                title="Ferramentas de montagem"
              >
                <Layers3 />
                <span>Montar</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "direct"}
                onClick={() => setProgressiveMode("direct")}
                title="Ferramentas do mestre"
              >
                <Eye />
                <span>Dirigir</span>
              </button>
              <button
                type="button"
                aria-pressed={mode === "advanced"}
                onClick={() => setProgressiveMode("advanced")}
                title="Mostrar todas as ferramentas"
              >
                <Menu />
                <span>Mais</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className="tadeon-tabletop-progressive-dock__command"
            onClick={() => setCommandOpen(true)}
            aria-label="Abrir comandos"
            title="Comandos · Ctrl/Cmd + K"
          >
            <Command />
            <span>Comandos</span>
            <kbd>⌘K</kbd>
          </button>
        </div>
      )}

      {!cleanPreview && selected.length > 0 && (
        <div className="tadeon-tabletop-selection-actions" aria-label="Ações da seleção">
          <div className="tadeon-tabletop-selection-actions__identity">
            <Crosshair />
            <span>{selectionLabel}</span>
          </div>
          <button type="button" onClick={() => runEngine((engine) => engine.focusSelection())} title="Focar seleção">
            <Focus />
          </button>
          {role === "mestre" && (
            <>
              <button type="button" onClick={() => runEngine((engine) => engine.duplicateSelected())} title="Duplicar seleção">
                <CopyPlus />
              </button>
              <button
                type="button"
                className="is-danger"
                onClick={() => runEngine((engine) => engine.deleteSelected())}
                title="Excluir seleção"
              >
                <Trash2 />
              </button>
            </>
          )}
        </div>
      )}

      {cleanPreview && (
        <button
          type="button"
          className="tadeon-tabletop-clean-exit"
          onClick={() => setCleanPreview(false)}
        >
          <X />
          Sair da tela limpa
        </button>
      )}

      {commandOpen && (
        <div className="tadeon-tabletop-command-layer" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setCommandOpen(false);
        }}>
          <section className="tadeon-tabletop-command-palette" role="dialog" aria-modal="true" aria-label="Comandos da Mesa">
            <header>
              <Search />
              <input
                ref={searchRef}
                value={commandSearch}
                onChange={(event) => setCommandSearch(event.target.value)}
                placeholder="Buscar ação, ferramenta ou modo…"
                aria-label="Buscar comando"
              />
              <button type="button" onClick={() => setCommandOpen(false)} aria-label="Fechar comandos">
                <X />
              </button>
            </header>
            <div className="tadeon-tabletop-command-palette__list">
              {visibleCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  className={command.destructive ? "is-danger" : undefined}
                  onClick={() => {
                    command.run();
                    setCommandOpen(false);
                    setCommandSearch("");
                  }}
                >
                  <span>{command.label}</span>
                  {command.hint && <kbd>{command.hint}</kbd>}
                </button>
              ))}
              {visibleCommands.length === 0 && (
                <p>Nenhum comando corresponde à busca.</p>
              )}
            </div>
            <footer>
              <span><Undo2 /> Desfazer</span>
              <span><Redo2 /> Refazer</span>
              <span><Maximize2 /> Enquadrar</span>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
