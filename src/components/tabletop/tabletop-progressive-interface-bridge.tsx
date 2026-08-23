import { useEffect, useMemo, useRef, useState } from "react";
import {
  Command,
  CopyPlus,
  Crosshair,
  Eye,
  EyeOff,
  Focus,
  Hand,
  Layers3,
  Lock,
  Maximize2,
  Menu,
  MousePointer2,
  Redo2,
  Ruler,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Unlock,
  X,
} from "lucide-react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
import { TabletopStagePortal } from "@/components/tabletop/tabletop-stage-portal";

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

function openCreativeDock() {
  const dock = document.querySelector<HTMLElement>(".tadeon-creative-dock");
  if (dock?.dataset.open === "true") return;
  dock?.querySelector<HTMLButtonElement>(".tadeon-creative-dock__handle")?.click();
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

  useEffect(() => {
    const html = document.documentElement;
    const stage = document.querySelector<HTMLElement>(".tadeon-tabletop-stage");
    if (!stage) return;

    const syncStageGeometry = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      html.style.setProperty("--tadeon-tabletop-stage-left", `${Math.max(0, rect.left)}px`);
      html.style.setProperty(
        "--tadeon-tabletop-stage-right",
        `${Math.max(0, window.innerWidth - rect.right)}px`,
      );
      html.style.setProperty("--tadeon-tabletop-stage-center", `${rect.left + rect.width / 2}px`);
      html.style.setProperty("--tadeon-tabletop-stage-width", `${rect.width}px`);
    };

    const observer = new ResizeObserver(syncStageGeometry);
    observer.observe(stage);
    const workbench = stage.closest<HTMLElement>(".tadeon-tabletop-workbench");
    if (workbench) observer.observe(workbench);
    window.addEventListener("resize", syncStageGeometry);
    window.addEventListener("scroll", syncStageGeometry, true);
    const frame = window.requestAnimationFrame(syncStageGeometry);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", syncStageGeometry);
      window.removeEventListener("scroll", syncStageGeometry, true);
      html.style.removeProperty("--tadeon-tabletop-stage-left");
      html.style.removeProperty("--tadeon-tabletop-stage-right");
      html.style.removeProperty("--tadeon-tabletop-stage-center");
      html.style.removeProperty("--tadeon-tabletop-stage-width");
    };
  }, []);

  const selected = useMemo(() => {
    if (!snapshot) return [];
    const ids = new Set(snapshot.selectedIds);
    return snapshot.scene.entities.filter((entity) => ids.has(entity.id));
  }, [snapshot]);

  const runEngine = (
    action: (engine: NonNullable<ReturnType<typeof currentTabletopRuntime>>["engine"]) => void,
  ) => {
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

  const anyVisible = selected.some((entity) => !entity.hidden);
  const anyUnlocked = selected.some((entity) => !entity.locked);

  const commands: CommandAction[] = [
    {
      id: "select",
      label: "Selecionar e manipular",
      hint: "V",
      keywords: "selecionar cursor mover token objeto manipular",
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
      id: "draw",
      label: "Desenhar na cena",
      hint: "D",
      keywords: "desenhar traço linha anotacao",
      masterOnly: true,
      run: () => runEngine((engine) => engine.setToolMode("draw")),
    },
    {
      id: "structure",
      label: "Construir parede, porta ou janela",
      hint: "B",
      keywords: "estrutura parede porta janela arquitetura construir",
      masterOnly: true,
      run: () => runEngine((engine) => engine.setToolMode("structure")),
    },
    {
      id: "light",
      label: "Adicionar luz",
      hint: "L",
      keywords: "luz iluminacao lampada ambiente",
      masterOnly: true,
      run: () => runEngine((engine) => engine.setToolMode("light")),
    },
    {
      id: "fog-reveal",
      label: "Revelar névoa",
      hint: "F",
      keywords: "fog nevoa revelar visibilidade jogadores",
      masterOnly: true,
      run: () => runEngine((engine) => engine.setToolMode("fog_reveal")),
    },
    {
      id: "fog-hide",
      label: "Ocultar com névoa",
      hint: "",
      keywords: "fog nevoa ocultar esconder visibilidade",
      masterOnly: true,
      run: () => runEngine((engine) => engine.setToolMode("fog_hide")),
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
      id: "reset-rotation",
      label: "Zerar rotação da seleção",
      hint: "",
      keywords: "rotacao alinhar zerar objeto token",
      masterOnly: true,
      run: () => runEngine((engine) => engine.resetSelectedTransform()),
    },
    {
      id: "visibility",
      label: anyVisible ? "Ocultar seleção dos jogadores" : "Revelar seleção aos jogadores",
      hint: "",
      keywords: "ocultar revelar jogadores segredo visibilidade",
      masterOnly: true,
      run: () =>
        runEngine((engine) =>
          engine.updateSelected(
            { hidden: anyVisible },
            anyVisible ? "Ocultar seleção" : "Revelar seleção",
          ),
        ),
    },
    {
      id: "lock",
      label: anyUnlocked ? "Travar seleção" : "Destravar seleção",
      hint: "",
      keywords: "travar destravar bloquear proteger lock",
      masterOnly: true,
      run: () =>
        runEngine((engine) =>
          engine.updateSelected(
            { locked: anyUnlocked },
            anyUnlocked ? "Travar seleção" : "Destravar seleção",
          ),
        ),
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
      label: cleanPreview ? "Sair da tela limpa" : "Tela limpa / preview",
      hint: "",
      keywords: "preview apresentacao projetar limpa camera",
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
  ];

  const query = commandSearch.trim().toLocaleLowerCase("pt-BR");
  const visibleCommands = commands.filter((command) => {
    if (command.masterOnly && role !== "mestre") return false;
    if (!query) return true;
    return `${command.label} ${command.keywords}`.toLocaleLowerCase("pt-BR").includes(query);
  });

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
      <TabletopStagePortal>
      {!cleanPreview && (
        <div className="tadeon-tabletop-progressive-dock" aria-label="Controles rápidos da Mesa">
          <button
            type="button"
            className="tadeon-tabletop-progressive-dock__button"
            onClick={() => runEngine((engine) => engine.setToolMode("select"))}
            aria-label="Selecionar"
            title="Selecionar e manipular · V"
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
                onClick={() => {
                  setProgressiveMode("build");
                  window.requestAnimationFrame(openCreativeDock);
                }}
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
          <button
            type="button"
            onClick={() => runEngine((engine) => engine.focusSelection())}
            title="Focar seleção"
          >
            <Focus />
          </button>
          {role === "mestre" && (
            <>
              <button
                type="button"
                onClick={() =>
                  runEngine((engine) =>
                    engine.updateSelected(
                      { hidden: anyVisible },
                      anyVisible ? "Ocultar seleção" : "Revelar seleção",
                    ),
                  )
                }
                title={anyVisible ? "Ocultar dos jogadores" : "Revelar aos jogadores"}
              >
                {anyVisible ? <EyeOff /> : <Eye />}
              </button>
              <button
                type="button"
                onClick={() =>
                  runEngine((engine) =>
                    engine.updateSelected(
                      { locked: anyUnlocked },
                      anyUnlocked ? "Travar seleção" : "Destravar seleção",
                    ),
                  )
                }
                title={anyUnlocked ? "Travar seleção" : "Destravar seleção"}
              >
                {anyUnlocked ? <Lock /> : <Unlock />}
              </button>
              <button
                type="button"
                onClick={() => runEngine((engine) => engine.duplicateSelected())}
                title="Duplicar seleção"
              >
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

      </TabletopStagePortal>

      {commandOpen && (
        <div
          className="tadeon-tabletop-command-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCommandOpen(false);
          }}
        >
          <section
            className="tadeon-tabletop-command-palette"
            role="dialog"
            aria-modal="true"
            aria-label="Comandos da Mesa"
          >
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
              {visibleCommands.length === 0 && <p>Nenhum comando corresponde à busca.</p>}
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
