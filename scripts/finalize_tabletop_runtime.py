from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, got {count}")
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str, flags=0) -> str:
    result, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, got {count}")
    return result


# 1) Player tactical bridge: event-driven runtime and explicit tactical state.
path = "src/components/tabletop/tabletop-player-interaction-bridge.tsx"
text = read(path)
text = regex_once(
    text,
    r'''  const syncSnapshot = useCallback\(\(\) => \{.*?\n  \}, \[syncSnapshot\]\);''',
    '''  useEffect(() => {
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
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);''',
    "player snapshot polling",
    flags=re.S,
)
text = replace_once(
    text,
    '''  const origin = entity ? centerOf(entity) : null;''',
    '''  useEffect(() => {
    const text = activePower
      ? [activePower.name, activePower.source.effect, activePower.source.damage]
          .filter(Boolean)
          .join(" ")
      : "";
    window.dispatchEvent(
      new CustomEvent("tadeon-tabletop-tactical-state", {
        detail: { mode, text },
      }),
    );
  }, [activePower, mode]);

  const origin = entity ? centerOf(entity) : null;''',
    "tactical state event",
)
text = replace_once(
    text,
    '''            <button type="button" onClick={() => setMovementPoints(origin ? [origin] : [])}>Limpar rota</button>''',
    '''            <button type="button" onClick={() => setMovementPoints(origin ? [origin] : [])}>Limpar rota</button>
            {Boolean((entity as (typeof entity & { controllable?: boolean }) | null)?.controllable) && movementPoints.length >= 2 && (
              <button
                type="button"
                className="tadeon-tactical-dock__confirm"
                onClick={() => {
                  if (!entity) return;
                  window.dispatchEvent(
                    new CustomEvent("tadeon-tabletop-move-request", {
                      detail: { entityId: entity.id, points: movementPoints },
                    }),
                  );
                  setMode("idle");
                  setCursorWorld(null);
                }}
              >
                Mover
              </button>
            )}''',
    "movement confirmation",
)
# useCallback remains used elsewhere in this component.
write(path, text)

# 2) Reliability bridge: remove DOM-click autosave and timer snapshot polling.
path = "src/components/tabletop/tabletop-reliability-editor-bridge.tsx"
text = read(path)
text = regex_once(
    text,
    r'''function normalizeButtonText\(button: HTMLButtonElement\) \{.*?\n\}\n\nfunction useScenePreloader''',
    '''function useThrottledAutosave(enabled: boolean) {
  const [state, setState] = useState<AutosaveState>(enabled ? "idle" : "paused");

  useEffect(() => {
    if (!enabled) {
      setState("paused");
      return;
    }
    setState("idle");
    const onState = (event: Event) => {
      const next = (event as CustomEvent<{ state?: AutosaveState }>).detail?.state;
      if (next === "idle" || next === "pending" || next === "saving" || next === "saved" || next === "paused") {
        setState(next);
      }
    };
    window.addEventListener("tadeon-tabletop-autosave-state", onState);
    return () => window.removeEventListener("tadeon-tabletop-autosave-state", onState);
  }, [enabled]);

  return state;
}

function useScenePreloader''',
    "autosave polling removal",
    flags=re.S,
)
text = regex_once(
    text,
    r'''  const sync = useCallback\(\(\) => \{.*?\n  \}, \[sync\]\);''',
    '''  useEffect(() => {
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
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);''',
    "reliability snapshot polling",
    flags=re.S,
)
# callback still used by other helpers? After removal useCallback is no longer used in this file.
text = text.replace("import { useCallback, useEffect, useMemo, useRef, useState } from \"react\";", "import { useEffect, useMemo, useRef, useState } from \"react\";")
write(path, text)

# 3) Creative dock: no idle polling.
path = "src/components/tabletop/tabletop-creative-dock-bridge.tsx"
text = read(path)
text = regex_once(
    text,
    r'''  const sync = useCallback\(\(\) => \{.*?\n  \}, \[sync\]\);''',
    '''  useEffect(() => {
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
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);''',
    "creative dock snapshot polling",
    flags=re.S,
)
text = text.replace("import { useCallback, useEffect, useMemo, useState } from \"react\";", "import { useEffect, useMemo, useState } from \"react\";")
write(path, text)

# 4) Director command bridge: mutation-driven only; no perpetual 2.2s rescans.
path = "src/components/tabletop/tabletop-director-enhancement-bridge.tsx"
text = read(path)
text = replace_once(
    text,
    '''    const timer = window.setInterval(refresh, 2200);
    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };''',
    '''    return () => {
      observer.disconnect();
    };''',
    "director polling removal",
)
write(path, text)

# 5) Workspace: native autosave, all grid modes, remote movement baseline.
path = "src/components/tabletop/tabletop-workspace.tsx"
text = read(path)
text = replace_once(
    text,
    '''  const saveCurrent = async (overrides: TabletopSaveOverrides = {}) => {''',
    '''  const saveCurrent = async (
    overrides: TabletopSaveOverrides = {},
    options: { silent?: boolean } = {},
  ) => {''',
    "saveCurrent options",
)
text = replace_once(
    text,
    '''      toast.success(overrides.status === "archived" ? "Cena arquivada." : "Cena salva.");''',
    '''      if (!options.silent)
        toast.success(overrides.status === "archived" ? "Cena arquivada." : "Cena salva.");''',
    "saveCurrent success toast",
)
text = replace_once(
    text,
    '''      toast.error(errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const createScene''',
    '''      if (!options.silent) toast.error(errorMessage(error));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const saveVisibilityCurrent = useCallback(
    async (silent = false) => {
      const stored = persistedSceneRef.current;
      if (!stored || !editable || !lightingEnabled || !visibilityAvailable) return true;
      try {
        const saved = await tabletopVisibilityService.save(stored.id, visibilityRef.current);
        installVisibility(saved.visibility, saved.sceneVersion);
        if (!silent) toast.success("Ambiente, arquitetura, luzes e névoa salvos.");
        return true;
      } catch {
        if (!silent) toast.error("Não foi possível salvar o ambiente desta cena.");
        return false;
      }
    },
    [editable, installVisibility, lightingEnabled, visibilityAvailable],
  );

  useEffect(() => {
    if (!editable || conflict || saving || (!dirty && !visibilityDirty)) return;
    const dispatch = (state: "pending" | "saving" | "saved" | "idle" | "paused") =>
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-autosave-state", { detail: { state } }));
    dispatch("pending");
    const timer = window.setTimeout(() => {
      void (async () => {
        if (conflict || saving) return;
        dispatch("saving");
        let ok = true;
        if (dirty) ok = Boolean(await saveCurrent({}, { silent: true }));
        if (ok && visibilityDirty) ok = await saveVisibilityCurrent(true);
        dispatch(ok ? "saved" : "paused");
        if (ok) window.setTimeout(() => dispatch("idle"), 1600);
      })();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [conflict, dirty, editable, saveVisibilityCurrent, saving, visibilityDirty]);

  const createScene''',
    "native autosave insertion",
)
text = replace_once(
    text,
    '''              onChange={(event) =>
                engineRef.current?.setGrid(event.target.value === "none" ? "none" : "square")
              }
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs min-[480px]:max-w-36 sm:h-9 sm:flex-none"
            >
              <option value="square">Grade quadrada</option>
              <option value="none">Sem grade</option>''',
    '''              onChange={(event) =>
                engineRef.current?.setGrid(event.target.value as typeof snapshot.scene.gridMode)
              }
              className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs min-[480px]:max-w-44 sm:h-9 sm:flex-none"
            >
              <option value="square">Grade quadrada</option>
              <option value="hex_pointy">Hexagonal vertical</option>
              <option value="hex_flat">Hexagonal horizontal</option>
              <option value="isometric">Isométrica</option>
              <option value="none">Sem grade</option>''',
    "grid selector",
)
text = replace_once(
    text,
    '''          getCurrentCamera={() =>
            engineReadyRef.current
              ? engineRef.current?.directorCamera(activeLevelIdRef.current)
              : null
          }
        />''',
    '''          getCurrentCamera={() =>
            engineReadyRef.current
              ? engineRef.current?.directorCamera(activeLevelIdRef.current)
              : null
          }
          onRemoteEntityMove={({ entityId, x, y, version }) => {
            const stored = persistedSceneRef.current;
            if (stored) {
              const nextStored = {
                ...stored,
                entities: stored.entities.map((entity) =>
                  entity.id === entityId ? { ...entity, x, y, version } : entity,
                ),
              };
              persistedSceneRef.current = nextStored;
              setPersistedScene(nextStored);
            }
            engineRef.current?.applyRemoteEntityPatch(entityId, { x, y });
          }}
        />''',
    "master remote move hook",
)
write(path, text)

# 6) Engine: remote truth patch without undo command.
path = "src/lib/tabletop/tabletop-engine.ts"
text = read(path)
text = replace_once(
    text,
    '''  updateSelected(patch: Partial<TabletopEntity>, label = "Editar entidade") {''',
    '''  applyRemoteEntityPatch(id: string, patch: Partial<TabletopEntity>) {
    if (!this.scenes.scene.entities.some((entity) => entity.id === id)) return;
    this.scenes.setEntities(
      this.scenes.scene.entities.map((entity) =>
        entity.id === id
          ? this.clampEntity({ ...entity, ...patch, id: entity.id })
          : entity,
      ),
    );
    this.render();
  }

  updateSelected(patch: Partial<TabletopEntity>, label = "Editar entidade") {''',
    "remote entity patch",
)
write(path, text)

print("Tabletop runtime stability patch applied.")
