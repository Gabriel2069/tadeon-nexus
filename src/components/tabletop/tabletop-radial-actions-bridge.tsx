import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Focus,
  Lock,
  LockOpen,
  MoreHorizontal,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-radial-actions.css";

function selectedEntity(snapshot: TabletopSnapshot | null) {
  if (!snapshot || snapshot.selectedIds.length !== 1) return null;
  return snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null;
}

function entityCenter(entity: TabletopEntity) {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

function safeAnchor(entity: TabletopEntity) {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const point = runtime.worldToClient(entityCenter(entity));
  const host = runtime.host.getBoundingClientRect();
  return {
    x: Math.max(host.left + 92, Math.min(host.right - 92, point.x)),
    y: Math.max(host.top + 92, Math.min(host.bottom - 92, point.y)),
  };
}

type NexusCaptureAction =
  | "register-nexus"
  | "capture-note"
  | "capture-clue"
  | "capture-event";

export function TabletopRadialActionsBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const selected = useMemo(() => selectedEntity(snapshot), [snapshot]);

  useEffect(() => {
    let frame = 0;
    let attempts = 0;
    const bootstrap = () => {
      const runtime = currentTabletopRuntime();
      if (runtime) {
        setSnapshot(runtime.snapshot());
        return;
      }
      if (attempts++ < 90) frame = window.requestAnimationFrame(bootstrap);
    };
    bootstrap();
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    const onDestroyed = () => {
      setSnapshot(null);
      setOpen(false);
      setMemoryOpen(false);
    };
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  useEffect(() => {
    setMemoryOpen(false);
    if (!selected) {
      setOpen(false);
      setAnchor(null);
      return;
    }
    setAnchor(safeAnchor(selected));
  }, [selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!selected || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input,textarea,select,[contenteditable='true']")) return;
      if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        setAnchor(safeAnchor(selected));
        setOpen((value) => {
          if (value) setMemoryOpen(false);
          return !value;
        });
      }
      if (event.key === "Escape") {
        if (memoryOpen) setMemoryOpen(false);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [memoryOpen, selected]);

  if (
    !selected ||
    !anchor ||
    typeof window === "undefined" ||
    window.location.pathname !== "/tabletop" ||
    new URLSearchParams(window.location.search).get("view") === "director"
  ) return null;

  const engine = currentTabletopRuntime()?.engine;
  const close = () => {
    setMemoryOpen(false);
    setOpen(false);
  };
  const run = (operation: () => void) => {
    operation();
    close();
  };
  const capture = (action: NexusCaptureAction) => {
    if (action === "register-nexus" && selected.linkedKnowledgeNodeId) {
      window.open(
        `/nexus?node=${encodeURIComponent(selected.linkedKnowledgeNodeId)}`,
        `tadeon-nexus-${selected.linkedKnowledgeNodeId}`,
        "popup=yes,width=1320,height=900,resizable=yes,scrollbars=yes",
      );
      close();
      return;
    }
    window.dispatchEvent(
      new CustomEvent("tadeon-tabletop-capture-nexus", {
        detail: { entityId: selected.id, action },
      }),
    );
    close();
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          className="tadeon-radial-trigger"
          style={{ left: anchor.x, top: anchor.y }}
          onClick={() => {
            setAnchor(safeAnchor(selected));
            setMemoryOpen(false);
            setOpen(true);
          }}
          title="Ações rápidas (Q)"
          aria-label={`Abrir ações rápidas de ${selected.label}`}
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
      )}
      {open && (
        <div
          className="tadeon-radial-actions"
          style={{ left: anchor.x, top: anchor.y }}
          role="menu"
          aria-label={`Ações rápidas de ${selected.label}`}
        >
          <div
            className={`tadeon-radial-actions__center${memoryOpen ? " is-memory" : ""}`}
          >
            {memoryOpen ? (
              <>
                <button
                  type="button"
                  title={selected.linkedKnowledgeNodeId ? "Abrir página vinculada" : "Registrar como página"}
                  aria-label={selected.linkedKnowledgeNodeId ? "Abrir página vinculada" : "Registrar como página"}
                  onClick={() => capture("register-nexus")}
                >
                  <BookOpen aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Capturar nota"
                  aria-label="Capturar nota no Nexus"
                  onClick={() => capture("capture-note")}
                >
                  <FileText aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Capturar pista"
                  aria-label="Capturar pista no Nexus"
                  onClick={() => capture("capture-clue")}
                >
                  <Search aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Capturar evento"
                  aria-label="Capturar evento no Nexus"
                  onClick={() => capture("capture-event")}
                >
                  <Clock3 aria-hidden="true" />
                </button>
                <strong>Memória</strong>
              </>
            ) : (
              <>
                <button type="button" onClick={close} aria-label="Fechar ações rápidas">
                  <X aria-hidden="true" />
                </button>
                <strong>{selected.label}</strong>
              </>
            )}
          </div>
          <button
            type="button"
            className="is-north"
            role="menuitem"
            onClick={() => run(() => engine?.focusSelection())}
            title="Enquadrar"
          >
            <Focus aria-hidden="true" /><span>Foco</span>
          </button>
          <button
            type="button"
            className="is-north-east"
            role="menuitem"
            onClick={() => run(() => engine?.duplicateSelected())}
            title="Duplicar"
          >
            <Copy aria-hidden="true" /><span>Duplicar</span>
          </button>
          <button
            type="button"
            className="is-south-east"
            role="menuitem"
            onClick={() => run(() => engine?.updateSelected({ locked: !selected.locked }, selected.locked ? "Desbloquear entidade" : "Bloquear entidade"))}
            title={selected.locked ? "Desbloquear" : "Bloquear"}
          >
            {selected.locked ? <LockOpen aria-hidden="true" /> : <Lock aria-hidden="true" />}
            <span>{selected.locked ? "Soltar" : "Travar"}</span>
          </button>
          <button
            type="button"
            className="is-south"
            role="menuitem"
            onClick={() => run(() => engine?.updateSelected({ hidden: !selected.hidden }, selected.hidden ? "Mostrar entidade" : "Ocultar entidade"))}
            title={selected.hidden ? "Mostrar" : "Ocultar"}
          >
            {selected.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
            <span>{selected.hidden ? "Mostrar" : "Ocultar"}</span>
          </button>
          <button
            type="button"
            className="is-south-west"
            role="menuitem"
            onClick={() => setMemoryOpen((value) => !value)}
            title="Memória do Nexus"
            aria-expanded={memoryOpen}
          >
            <BookOpen aria-hidden="true" />
            <span>Memória</span>
          </button>
          <button
            type="button"
            className="is-north-west is-danger"
            role="menuitem"
            onClick={() => run(() => engine?.deleteSelected())}
            title="Excluir"
          >
            <Trash2 aria-hidden="true" /><span>Excluir</span>
          </button>
        </div>
      )}
    </>
  );
}
