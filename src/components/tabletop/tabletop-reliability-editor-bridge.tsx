import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CloudDownload,
  Copy,
  Droplets,
  Loader2,
  RotateCw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { structureChannels, type TabletopStructureType } from "@/lib/tabletop/tabletop-spatial";
import { tabletopRegionsAtPoint } from "@/lib/tabletop/tabletop-regions";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { Point, TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-reliability-editor.css";

type AutosaveState = "idle" | "pending" | "saving" | "saved" | "paused";

interface WallSoundRow {
  id: string;
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  wall_type: string;
  blocks_vision?: boolean;
  blocks_movement?: boolean;
  properties?: unknown;
}

interface AudioSourceConfig {
  url: string;
  enabled: boolean;
  loop: boolean;
  volume: number;
  radius: number;
}

interface VisualSample {
  color: number;
  properties: Record<string, unknown>;
}

const VISUAL_PROPERTY_KEYS = [
  "render_mode",
  "billboard_anchor",
  "billboard_scale",
  "shadow",
  "aura_color",
  "aura_intensity",
  "icons",
] as const;

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numeric(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function center(entity: TabletopEntity): Point {
  return { x: entity.x + entity.width / 2, y: entity.y + entity.height / 2 };
}

function segmentIntersection(a: Point, b: Point, c: Point, d: Point) {
  const denominator = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (Math.abs(denominator) < 1e-8) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denominator;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function audioConfig(entity: TabletopEntity, gridSize: number): AudioSourceConfig | null {
  const properties = objectValue(entity.properties);
  const url = typeof properties.audio_url === "string" ? properties.audio_url.trim() : "";
  if (!url) return null;
  return {
    url,
    enabled: properties.audio_enabled !== false,
    loop: properties.audio_loop !== false,
    volume: clamp(numeric(properties.audio_volume, 0.72), 0, 1),
    radius: clamp(numeric(properties.audio_radius, gridSize * 8), gridSize, gridSize * 80),
  };
}

function soundTransmissionBetween(
  source: Point,
  listener: Point,
  walls: WallSoundRow[],
) {
  let transmission = 1;
  for (const wall of walls) {
    const start = { x: numeric(wall.x1, 0), y: numeric(wall.y1, 0) };
    const end = { x: numeric(wall.x2, 0), y: numeric(wall.y2, 0) };
    if (!segmentIntersection(source, listener, start, end)) continue;
    const type = wall.wall_type as TabletopStructureType;
    const channels = structureChannels(type, objectValue(wall.properties));
    transmission *= channels.soundTransmission;
    if (transmission < 0.015) return 0;
  }
  return clamp(transmission, 0, 1);
}

function safeAssetUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

function selectedEntity(snapshot: TabletopSnapshot | null) {
  if (!snapshot || snapshot.selectedIds.length !== 1) return null;
  return snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null;
}

function normalizeButtonText(button: HTMLButtonElement) {
  return button.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function findSaveButtons() {
  const all = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  return {
    scene: all.find((button) => normalizeButtonText(button) === "Salvar") ?? null,
    visibility:
      all.find((button) => normalizeButtonText(button) === "Salvar ambiente") ?? null,
  };
}

function useThrottledAutosave(enabled: boolean) {
  const [state, setState] = useState<AutosaveState>(enabled ? "idle" : "paused");
  const timers = useRef<Record<"scene" | "visibility", number | null>>({
    scene: null,
    visibility: null,
  });
  const lastAttempt = useRef<Record<"scene" | "visibility", number>>({
    scene: 0,
    visibility: 0,
  });

  const clearTimer = useCallback((kind: "scene" | "visibility") => {
    const timer = timers.current[kind];
    if (timer !== null) window.clearTimeout(timer);
    timers.current[kind] = null;
  }, []);

  const clickIfReady = useCallback((kind: "scene" | "visibility", immediate = false) => {
    if (!enabled) return;
    const button = findSaveButtons()[kind];
    if (!button || button.disabled) return;
    const now = Date.now();
    if (!immediate && now - lastAttempt.current[kind] < 4500) return;
    clearTimer(kind);
    lastAttempt.current[kind] = now;
    setState("saving");
    button.click();
    window.setTimeout(() => setState("saved"), 900);
    window.setTimeout(() => setState("idle"), 2500);
  }, [clearTimer, enabled]);

  useEffect(() => {
    if (!enabled) {
      setState("paused");
      clearTimer("scene");
      clearTimer("visibility");
      return;
    }
    setState("idle");
    const inspect = () => {
      const buttons = findSaveButtons();
      (["scene", "visibility"] as const).forEach((kind) => {
        const button = buttons[kind];
        if (!button || button.disabled) {
          clearTimer(kind);
          return;
        }
        if (timers.current[kind] !== null) return;
        setState("pending");
        timers.current[kind] = window.setTimeout(
          () => clickIfReady(kind),
          kind === "scene" ? 1900 : 2300,
        );
      });
    };
    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "aria-disabled"],
    });
    const interval = window.setInterval(inspect, 1400);
    const visibilityChange = () => {
      if (document.visibilityState !== "hidden") return;
      clickIfReady("scene", true);
      clickIfReady("visibility", true);
    };
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visibilityChange);
      clearTimer("scene");
      clearTimer("visibility");
    };
  }, [clearTimer, clickIfReady, enabled]);

  return state;
}

function useScenePreloader(snapshot: TabletopSnapshot | null) {
  const [warmed, setWarmed] = useState(0);
  const warmedUrls = useRef(new Set<string>());

  useEffect(() => {
    if (!snapshot) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;
    const activeLevelId = snapshot.scene.levels?.find((level) => level.visible)?.id;
    const prioritized = [
      snapshot.scene.backgroundAssetUrl,
      ...snapshot.scene.entities
        .filter((entity) => !entity.hidden && (!activeLevelId || entity.levelId === activeLevelId))
        .map((entity) => entity.assetUrl),
      ...snapshot.scene.entities.map((entity) => entity.assetUrl),
    ]
      .map(safeAssetUrl)
      .filter((value): value is string => Boolean(value));
    const queue = [...new Set(prioritized)].filter((url) => !warmedUrls.current.has(url)).slice(0, 18);
    if (!queue.length) return;
    let cancelled = false;
    const warm = async () => {
      for (const url of queue) {
        if (cancelled) break;
        warmedUrls.current.add(url);
        const pathname = new URL(url).pathname.toLowerCase();
        if (/\.(mp4|webm|mov|m4v)$/.test(pathname)) {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.muted = true;
          video.src = url;
          video.load();
        } else {
          const image = new Image();
          image.decoding = "async";
          image.src = url;
          try {
            await image.decode();
          } catch {
            // TextureManager will surface the real asset error when/if used.
          }
        }
        if (!cancelled) setWarmed(warmedUrls.current.size);
        await new Promise((resolve) => window.setTimeout(resolve, 18));
      }
    };
    const schedule = () => void warm();
    const idle = window.requestIdleCallback?.(schedule, { timeout: 900 });
    const fallback = idle === undefined ? window.setTimeout(schedule, 180) : null;
    return () => {
      cancelled = true;
      if (idle !== undefined) window.cancelIdleCallback?.(idle);
      if (fallback !== null) window.clearTimeout(fallback);
    };
  }, [snapshot]);

  return warmed;
}

function useSpatialAudio(snapshot: TabletopSnapshot | null, muted: boolean) {
  const audio = useRef(new Map<string, HTMLAudioElement>());
  const [walls, setWalls] = useState<WallSoundRow[]>([]);
  const unlocked = useRef(false);

  useEffect(() => {
    if (!snapshot?.scene.id) return;
    let active = true;
    void supabase
      .from("tabletop_walls")
      .select("id,x1,y1,x2,y2,wall_type,blocks_vision,blocks_movement,properties")
      .eq("scene_id", snapshot.scene.id)
      .then(({ data }) => {
        if (active) setWalls((data ?? []) as unknown as WallSoundRow[]);
      });
    return () => {
      active = false;
    };
  }, [snapshot?.scene.id]);

  useEffect(() => {
    const unlock = () => {
      unlocked.current = true;
      window.removeEventListener("pointerdown", unlock, true);
    };
    window.addEventListener("pointerdown", unlock, true);
    return () => window.removeEventListener("pointerdown", unlock, true);
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const sources = snapshot.scene.entities
      .map((entity) => ({ entity, config: audioConfig(entity, snapshot.scene.gridSize) }))
      .filter((entry): entry is { entity: TabletopEntity; config: AudioSourceConfig } => Boolean(entry.config));
    const live = new Set(sources.map(({ entity }) => entity.id));
    for (const [id, element] of audio.current) {
      if (live.has(id)) continue;
      element.pause();
      element.src = "";
      audio.current.delete(id);
    }
    const selected = selectedEntity(snapshot);
    const rect = runtime.host.getBoundingClientRect();
    const listener = selected
      ? center(selected)
      : runtime.clientToWorld({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

    for (const { entity, config } of sources) {
      let element = audio.current.get(entity.id);
      if (!element || element.src !== new URL(config.url, window.location.href).href) {
        element?.pause();
        element = new Audio(config.url);
        element.preload = "auto";
        element.crossOrigin = "anonymous";
        audio.current.set(entity.id, element);
      }
      element.loop = config.loop;
      const source = center(entity);
      const distance = Math.hypot(source.x - listener.x, source.y - listener.y);
      const distanceGain = Math.pow(clamp(1 - distance / config.radius, 0, 1), 1.35);
      const wallGain = soundTransmissionBetween(source, listener, walls);
      const sourceRegions = tabletopRegionsAtPoint(snapshot.scene, source);
      const listenerRegions = tabletopRegionsAtPoint(snapshot.scene, listener);
      const regionAbsorption = clamp(
        [...sourceRegions, ...listenerRegions].reduce(
          (sum, entry) => sum + entry.behavior.soundAbsorption,
          0,
        ) / Math.max(1, sourceRegions.length + listenerRegions.length),
        0,
        0.92,
      );
      const volume = muted || !config.enabled
        ? 0
        : clamp(config.volume * distanceGain * wallGain * (1 - regionAbsorption), 0, 1);
      element.volume = volume;
      if (volume > 0.002 && unlocked.current && element.paused) {
        void element.play().catch(() => undefined);
      } else if (volume <= 0.002 && !element.paused) {
        element.pause();
      }
    }
  }, [muted, snapshot, walls]);

  useEffect(
    () => () => {
      for (const element of audio.current.values()) {
        element.pause();
        element.src = "";
      }
      audio.current.clear();
    },
    [],
  );
}

function colorNumber(value: string, fallback: number) {
  const normalized = value.replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized, 16) : fallback;
}

function colorHex(value: number) {
  return `#${value.toString(16).padStart(6, "0").slice(-6)}`;
}

function copyVisualSample(entity: TabletopEntity): VisualSample {
  const source = objectValue(entity.properties);
  const properties = Object.fromEntries(
    VISUAL_PROPERTY_KEYS.flatMap((key) => (key in source ? [[key, source[key]]] : [])),
  );
  return { color: entity.color, properties };
}

export function TabletopReliabilityEditorBridge() {
  const { role } = useAuth();
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [sample, setSample] = useState<VisualSample | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const sync = useCallback(() => {
    const runtime = currentTabletopRuntime();
    if (runtime) setSnapshot(runtime.snapshot());
  }, []);

  useEffect(() => {
    sync();
    const onRender = (event: Event) => {
      const detail = (event as CustomEvent<TabletopSnapshot>).detail;
      setSnapshot(detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    };
    window.addEventListener("tadeon-tabletop-render", onRender);
    const timer = window.setInterval(sync, 800);
    return () => {
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.clearInterval(timer);
    };
  }, [sync]);

  const autosave = useThrottledAutosave(role === "mestre");
  const warmed = useScenePreloader(snapshot);
  useSpatialAudio(snapshot, audioMuted);
  const entity = selectedEntity(snapshot);
  const properties = objectValue(entity?.properties);
  const audioSource = entity && snapshot ? audioConfig(entity, snapshot.scene.gridSize) : null;

  const updateEntity = (patch: Partial<TabletopEntity>) => {
    currentTabletopRuntime()?.engine.updateSelected(patch);
  };
  const updateProperties = (patch: Record<string, unknown>) => {
    currentTabletopRuntime()?.engine.updateSelectedProperties(patch);
  };

  if (!snapshot) return null;

  return (
    <>
      <div className="tadeon-tabletop-reliability-strip" aria-label="Estado de confiabilidade da Mesa">
        {role === "mestre" && (
          <span data-state={autosave} title="Autosave desacelera gravações e usa os mesmos salvamentos manuais da Mesa">
            {autosave === "saving" ? <Loader2 className="animate-spin" aria-hidden="true" /> : autosave === "saved" ? <Check aria-hidden="true" /> : <CloudDownload aria-hidden="true" />}
            {autosave === "pending" ? "Autosave pendente" : autosave === "saving" ? "Salvando" : autosave === "saved" ? "Salvo" : "Autosave"}
          </span>
        )}
        <span title="Assets visíveis preparados gradualmente sem bloquear a Mesa">
          <CloudDownload aria-hidden="true" /> {warmed} prontos
        </span>
        <button
          type="button"
          aria-pressed={audioMuted}
          onClick={() => setAudioMuted((value) => !value)}
          title={audioMuted ? "Reativar áudio espacial" : "Silenciar áudio espacial"}
        >
          {audioMuted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
          Áudio
        </button>
        {role === "mestre" && (
          <button
            type="button"
            aria-pressed={editorOpen}
            onClick={() => setEditorOpen((value) => !value)}
            title="Transformação precisa, conta-gotas visual e áudio do placeable"
          >
            <SlidersHorizontal aria-hidden="true" /> Editor
          </button>
        )}
      </div>

      {role === "mestre" && editorOpen && (
        <aside className="tadeon-tabletop-precision-editor">
          <header>
            <span><SlidersHorizontal aria-hidden="true" /></span>
            <div>
              <small>Editor preciso</small>
              <strong>{entity?.label ?? "Selecione um placeable"}</strong>
            </div>
            <Button size="icon" variant="ghost" aria-label="Fechar editor preciso" onClick={() => setEditorOpen(false)}>
              <X aria-hidden="true" />
            </Button>
          </header>

          {!entity ? (
            <div className="tadeon-tabletop-precision-editor__empty">
              Selecione exatamente um objeto, token, região ou elemento da cena.
            </div>
          ) : (
            <>
              <section>
                <div className="tadeon-tabletop-precision-editor__section-title">
                  <RotateCw aria-hidden="true" /> Transformar
                </div>
                <div className="tadeon-tabletop-precision-editor__grid">
                  <label><span>X</span><Input type="number" value={Math.round(entity.x)} onChange={(event) => updateEntity({ x: numeric(event.target.value, entity.x) })} /></label>
                  <label><span>Y</span><Input type="number" value={Math.round(entity.y)} onChange={(event) => updateEntity({ y: numeric(event.target.value, entity.y) })} /></label>
                  <label><span>Larg.</span><Input type="number" min={8} value={Math.round(entity.width)} onChange={(event) => updateEntity({ width: Math.max(8, numeric(event.target.value, entity.width)) })} /></label>
                  <label><span>Alt.</span><Input type="number" min={8} value={Math.round(entity.height)} onChange={(event) => updateEntity({ height: Math.max(8, numeric(event.target.value, entity.height)) })} /></label>
                  <label><span>Rotação</span><Input type="number" value={Math.round(entity.rotation)} onChange={(event) => updateEntity({ rotation: numeric(event.target.value, entity.rotation) })} /></label>
                  <label><span>Elevação</span><Input type="number" value={Math.round(entity.elevation ?? 0)} onChange={(event) => updateEntity({ elevation: numeric(event.target.value, entity.elevation ?? 0) })} /></label>
                </div>
                <div className="tadeon-tabletop-precision-editor__quick">
                  <button type="button" onClick={() => updateEntity({ rotation: entity.rotation - 15 })}>-15°</button>
                  <button type="button" onClick={() => updateEntity({ rotation: entity.rotation + 15 })}>+15°</button>
                  <button type="button" onClick={() => updateEntity({ rotation: entity.rotation + 90 })}>+90°</button>
                </div>
              </section>

              <section>
                <div className="tadeon-tabletop-precision-editor__section-title">
                  <Droplets aria-hidden="true" /> Conta-gotas visual
                </div>
                <div className="tadeon-tabletop-precision-editor__color">
                  <input
                    type="color"
                    value={colorHex(entity.color)}
                    onChange={(event) => updateEntity({ color: colorNumber(event.target.value, entity.color) })}
                    aria-label="Cor do placeable"
                  />
                  <Button size="sm" variant="outline" onClick={() => setSample(copyVisualSample(entity))}>
                    <WandSparkles aria-hidden="true" /> Capturar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!sample}
                    onClick={() => {
                      if (!sample) return;
                      updateEntity({ color: sample.color });
                      updateProperties(sample.properties);
                    }}
                  >
                    <Copy aria-hidden="true" /> Aplicar
                  </Button>
                </div>
                <p>O conta-gotas copia material visual, aura e billboard. Vínculos, dono, ficha e conteúdo nunca são copiados.</p>
              </section>

              <section>
                <div className="tadeon-tabletop-precision-editor__section-title">
                  <Volume2 aria-hidden="true" /> Fonte de áudio
                </div>
                <label className="tadeon-tabletop-precision-editor__wide">
                  <span>URL de áudio</span>
                  <Input
                    value={typeof properties.audio_url === "string" ? properties.audio_url : ""}
                    placeholder="https://.../ambiente.ogg"
                    onChange={(event) => updateProperties({ audio_url: event.target.value })}
                  />
                </label>
                <div className="tadeon-tabletop-precision-editor__grid">
                  <label>
                    <span>Volume %</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={Math.round((audioSource?.volume ?? 0.72) * 100)}
                      onChange={(event) => updateProperties({ audio_volume: clamp(numeric(event.target.value, 72) / 100, 0, 1) })}
                    />
                  </label>
                  <label>
                    <span>Raio</span>
                    <Input
                      type="number"
                      min={snapshot.scene.gridSize}
                      value={Math.round(audioSource?.radius ?? snapshot.scene.gridSize * 8)}
                      onChange={(event) => updateProperties({ audio_radius: Math.max(snapshot.scene.gridSize, numeric(event.target.value, snapshot.scene.gridSize * 8)) })}
                    />
                  </label>
                </div>
                <div className="tadeon-tabletop-precision-editor__switches">
                  <label><span>Ativa</span><Switch checked={properties.audio_enabled !== false} onCheckedChange={(value) => updateProperties({ audio_enabled: value })} /></label>
                  <label><span>Loop</span><Switch checked={properties.audio_loop !== false} onCheckedChange={(value) => updateProperties({ audio_loop: value })} /></label>
                </div>
                <p>O volume cai com distância, regiões absorventes e o canal de som das paredes atravessadas.</p>
              </section>
            </>
          )}
        </aside>
      )}
    </>
  );
}
