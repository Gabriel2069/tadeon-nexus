import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Bug,
  Focus,
  Copy,
  Grid2X2,
  Lock,
  LockOpen,
  Maximize2,
  MousePointer2,
  Redo2,
  RotateCw,
  Trash2,
  Undo2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import {
  cloneScene,
  EMPTY_TABLETOP_SCENE,
  type Point,
  type TabletopSnapshot,
} from "@/lib/tabletop/types";

interface ContextMenuState extends Point {
  entityId?: string;
}

const EMPTY_SNAPSHOT: TabletopSnapshot = {
  scene: cloneScene(EMPTY_TABLETOP_SCENE),
  selectedIds: [],
  canUndo: false,
  canRedo: false,
};

export function TabletopWorkspace() {
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TabletopEngine | null>(null);
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [diagnostics, setDiagnostics] = useState(false);
  const selected = useMemo(
    () =>
      snapshot.scene.entities.filter((entity) =>
        snapshot.selectedIds.includes(entity.id),
      ),
    [snapshot],
  );
  const primary = selected[0];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const engine = new TabletopEngine({
      onChange: (next) => {
        if (!cancelled) setSnapshot(next);
      },
      onAssetError: (message) => toast.error(message),
      onContextMenu: (position, entityId) =>
        setContextMenu({ ...position, entityId }),
    });
    engineRef.current = engine;
    void engine.init(host).catch((error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível abrir a Mesa Nexus.",
      );
    });
    return () => {
      cancelled = true;
      engineRef.current = null;
      void engine.destroy();
    };
  }, []);

  const updateNumber = (
    key: "x" | "y" | "width" | "height" | "rotation",
    value: string,
  ) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const normalized =
      key === "width" || key === "height" ? Math.max(8, parsed) : parsed;
    engineRef.current?.updateSelected({ [key]: normalized }, `Alterar ${key}`);
  };

  const closeContext = () => setContextMenu(null);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-[#080a0f] text-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-card/95 px-3 py-2 shadow-lg">
        <div className="mr-3">
          <p className="tadeon-eyebrow">Fundação local</p>
          <h1 className="font-cinzel text-lg font-semibold">Mesa Nexus</h1>
        </div>
        <ToolbarButton
          label="Adicionar token"
          onClick={() => engineRef.current?.addEntity("token")}
        >
          <UserRound className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Adicionar objeto"
          onClick={() => engineRef.current?.addEntity("object")}
        >
          <Box className="h-4 w-4" />
        </ToolbarButton>
        <span className="mx-1 h-7 w-px bg-border" />
        <ToolbarButton
          label="Desfazer"
          disabled={!snapshot.canUndo}
          onClick={() => engineRef.current?.undo()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Refazer"
          disabled={!snapshot.canRedo}
          onClick={() => engineRef.current?.redo()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Centralizar"
          onClick={() => engineRef.current?.center()}
        >
          <Focus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Ajustar à tela"
          onClick={() => engineRef.current?.fitToScreen()}
        >
          <Maximize2 className="h-4 w-4" />
        </ToolbarButton>

        <div className="ml-auto flex items-center gap-2">
          <Grid2X2 className="h-4 w-4 text-muted-foreground" />
          <select
            aria-label="Modo de grade"
            value={snapshot.scene.gridMode}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
              engineRef.current?.setGrid(
                event.target.value === "none" ? "none" : "square",
              )
            }
            className="h-9 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="square">Grade quadrada</option>
            <option value="none">Sem grade</option>
          </select>
          <Input
            aria-label="Tamanho da grade"
            type="number"
            min={8}
            value={snapshot.scene.gridSize}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              engineRef.current?.setGrid(
                snapshot.scene.gridMode,
                Number(event.target.value),
              )
            }
            className="h-9 w-20"
          />
          <Label
            htmlFor="tabletop-snap"
            className="text-xs text-muted-foreground"
          >
            Snap
          </Label>
          <Switch
            id="tabletop-snap"
            checked={snapshot.scene.snap}
            onCheckedChange={(checked: boolean) =>
              engineRef.current?.setSnap(checked)
            }
          />
          <ToolbarButton
            label="Diagnóstico"
            onClick={() => setDiagnostics((value) => !value)}
          >
            <Bug className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section
          className="relative min-h-[65vh] overflow-hidden"
          onClick={closeContext}
        >
          <div ref={hostRef} className="absolute inset-0" />
          {snapshot.scene.entities.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto max-w-sm rounded-2xl border border-primary/20 bg-card/90 p-6 text-center shadow-2xl backdrop-blur">
                <MousePointer2 className="mx-auto h-8 w-8 text-primary" />
                <h2 className="mt-3 font-cinzel text-xl">Cena vazia</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Adicione um token ou objeto. Esta fundação é local e não grava
                  cenas no banco.
                </p>
                <Button
                  className="mt-4 gap-2"
                  onClick={() => engineRef.current?.addEntity("token")}
                >
                  <UserRound className="h-4 w-4" />
                  Adicionar token
                </Button>
              </div>
            </div>
          )}
          {diagnostics && (
            <pre className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-border bg-black/80 p-3 text-[10px] text-emerald-300">
              {JSON.stringify(engineRef.current?.diagnostics() ?? {}, null, 2)}
            </pre>
          )}
        </section>

        <aside className="border-l border-border/70 bg-card/95 p-4">
          <p className="tadeon-eyebrow">Inspector</p>
          {!primary ? (
            <div className="mt-8 text-center text-sm text-muted-foreground">
              Selecione uma entidade no canvas. Shift permite seleção múltipla.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="font-cinzel text-lg font-semibold">
                  {primary.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selected.length} selecionada
                  {selected.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["x", "y", "width", "height", "rotation"] as const).map(
                  (key) => (
                    <div
                      key={key}
                      className={key === "rotation" ? "col-span-2" : ""}
                    >
                      <Label
                        htmlFor={`entity-${key}`}
                        className="text-[10px] uppercase"
                      >
                        {key === "rotation" ? "Rotação" : key}
                      </Label>
                      <Input
                        id={`entity-${key}`}
                        type="number"
                        value={Math.round(primary[key] * 100) / 100}
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>,
                        ) => updateNumber(key, event.target.value)}
                      />
                    </div>
                  ),
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => engineRef.current?.toggleSelectedLock()}
                >
                  {primary.locked ? (
                    <LockOpen className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {primary.locked ? "Desbloquear" : "Bloquear"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => engineRef.current?.duplicateSelected()}
                >
                  <Copy className="h-4 w-4" />
                  Duplicar
                </Button>
                <Button
                  variant="destructive"
                  className="col-span-2 gap-2"
                  disabled={primary.locked}
                  onClick={() => engineRef.current?.deleteSelected()}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir seleção
                </Button>
              </div>
              <div className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-[11px] text-muted-foreground">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <RotateCw className="h-3.5 w-3.5" /> Atalhos
                </p>
                <p className="mt-1">
                  Ctrl/Cmd+Z · Shift+Ctrl/Cmd+Z · Ctrl/Cmd+D · Del · setas
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {contextMenu && (
        <div
          role="menu"
          className="fixed z-50 w-44 rounded-lg border border-border bg-popover p-1 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            className="w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.duplicateSelected();
              closeContext();
            }}
          >
            Duplicar
          </button>
          <button
            className="w-full rounded px-3 py-2 text-left text-sm hover:bg-secondary"
            onClick={() => {
              engineRef.current?.toggleSelectedLock();
              closeContext();
            }}
          >
            Bloquear / desbloquear
          </button>
          <button
            className="w-full rounded px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            onClick={() => {
              engineRef.current?.deleteSelected();
              closeContext();
            }}
          >
            Excluir
          </button>
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  children,
  disabled,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
