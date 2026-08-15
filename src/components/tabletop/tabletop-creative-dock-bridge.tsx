import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Box,
  ChevronDown,
  Copy,
  Droplets,
  Eye,
  LibraryBig,
  MapPinned,
  Mountain,
  Search,
  Sparkles,
  TreePine,
  Waves,
  Wind,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  tabletopRegionBehavior,
  type TabletopRegionBehavior,
  type TabletopSurfaceType,
} from "@/lib/tabletop/tabletop-regions";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { Point, TabletopEntity, TabletopEntitySeed, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-creative-dock.css";

const PLACEABLE_MIME = "application/x-tadeon-placeable-preset";

type DockMode = "library" | "regions";

interface PlaceablePreset {
  label: string;
  type: TabletopEntity["type"];
  width: number;
  height: number;
  color: number;
  assetId?: string | null;
  assetUrl?: string;
  properties?: unknown;
}

const REGION_PRESETS: Array<{
  id: TabletopSurfaceType;
  label: string;
  icon: typeof Mountain;
  tint: string;
  patch: Partial<TabletopRegionBehavior>;
}> = [
  { id: "difficult", label: "Difícil", icon: Mountain, tint: "#b18b58", patch: { movementMultiplier: 1.5 } },
  { id: "water", label: "Água", icon: Waves, tint: "#4d9fc7", patch: { movementMultiplier: 1.75, lightMultiplier: 0.84, soundAbsorption: 0.16 } },
  { id: "mud", label: "Lama", icon: Droplets, tint: "#755a3f", patch: { movementMultiplier: 1.6, lightMultiplier: 0.92, soundAbsorption: 0.12 } },
  { id: "ice", label: "Gelo", icon: Sparkles, tint: "#bde8f2", patch: { movementMultiplier: 1.2, lightMultiplier: 1.08 } },
  { id: "foliage", label: "Vegetação", icon: TreePine, tint: "#4f8a62", patch: { movementMultiplier: 1.4, lightMultiplier: 0.7, soundAbsorption: 0.32, concealment: 0.25 } },
  { id: "smoke", label: "Fumaça", icon: Wind, tint: "#7d818a", patch: { lightMultiplier: 0.48, soundAbsorption: 0.08, concealment: 0.55 } },
  { id: "hazard", label: "Perigo", icon: MapPinned, tint: "#c0584e", patch: { movementMultiplier: 1.25, lightMultiplier: 0.9 } },
  { id: "custom", label: "Custom", icon: Box, tint: "#8f6bb8", patch: {} },
];

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function safeVisualProperties(entity: TabletopEntity) {
  const source = objectValue(entity.properties);
  const allowed = [
    "mime_type",
    "render_mode",
    "billboard_anchor",
    "billboard_scale",
    "shadow",
    "playback_speed",
    "playback_loop",
    "playback_muted",
    "playback_paused",
    "visual_conditions",
    "icons",
    "aura_color",
    "aura_intensity",
  ];
  return Object.fromEntries(allowed.flatMap((key) => (key in source ? [[key, source[key]]] : [])));
}

function presetFromEntity(entity: TabletopEntity): PlaceablePreset {
  return {
    label: entity.label,
    type: entity.type,
    width: entity.width,
    height: entity.height,
    color: entity.color,
    assetId: entity.assetId,
    assetUrl: entity.assetUrl,
    properties: safeVisualProperties(entity),
  };
}

function presetSeed(preset: PlaceablePreset): TabletopEntitySeed {
  return {
    type: preset.type,
    label: preset.label,
    width: preset.width,
    height: preset.height,
    assetId: preset.assetId,
    assetUrl: preset.assetUrl,
    properties: preset.properties,
  };
}

function sceneCenterInView() {
  const runtime = currentTabletopRuntime();
  if (!runtime) return { x: 0, y: 0 };
  const rect = runtime.host.getBoundingClientRect();
  return runtime.clientToWorld({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  });
}

function selectedEntity(snapshot: TabletopSnapshot | null) {
  if (!snapshot || snapshot.selectedIds.length !== 1) return null;
  return snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null;
}

function percent(value: number) {
  return Math.round(value * 100);
}

export function TabletopCreativeDockBridge() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<DockMode>("library");
  const [query, setQuery] = useState("");

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
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  useEffect(() => {
    if (window.location.pathname !== "/tabletop") return;
    const drop = (event: DragEvent) => {
      const raw = event.dataTransfer?.getData(PLACEABLE_MIME);
      if (!raw) return;
      const runtime = currentTabletopRuntime();
      if (!runtime) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        const preset = JSON.parse(raw) as PlaceablePreset;
        const point = runtime.clientToWorld({ x: event.clientX, y: event.clientY });
        runtime.engine.addEntityAt(presetSeed(preset), point);
      } catch {
        return;
      }
    };
    const dragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes(PLACEABLE_MIME)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    };
    document.addEventListener("dragover", dragOver, true);
    document.addEventListener("drop", drop, true);
    return () => {
      document.removeEventListener("dragover", dragOver, true);
      document.removeEventListener("drop", drop, true);
    };
  }, []);

  const selected = selectedEntity(snapshot);
  const selectedRegion = selected ? tabletopRegionBehavior(selected) : null;
  const library = useMemo(() => {
    if (!snapshot) return [];
    const lowered = query.trim().toLowerCase();
    const visual = snapshot.scene.entities.filter(
      (entity) => entity.assetUrl || entity.assetId || entity.type === "token" || entity.type === "object" || entity.type === "tile" || entity.type === "creature" || entity.type === "character" || entity.type === "npc",
    );
    const deduped = new Map<string, TabletopEntity>();
    for (const entity of visual) {
      const key = entity.assetId || entity.assetUrl || `${entity.type}:${entity.label}:${entity.color}`;
      if (!deduped.has(key)) deduped.set(key, entity);
    }
    return [...deduped.values()]
      .filter((entity) => !lowered || entity.label.toLowerCase().includes(lowered) || entity.type.includes(lowered))
      .slice(0, 60);
  }, [query, snapshot]);

  const createRegion = (surface: TabletopSurfaceType) => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const preset = REGION_PRESETS.find((item) => item.id === surface) ?? REGION_PRESETS.at(-1)!;
    const grid = runtime.snapshot().scene.gridSize;
    runtime.engine.addEntityAt(
      {
        type: "area",
        label: preset.label,
        width: grid * 4,
        height: grid * 3,
        properties: {
          region: {
            enabled: true,
            surface,
            movementMultiplier: preset.patch.movementMultiplier ?? 1,
            lightMultiplier: preset.patch.lightMultiplier ?? 1,
            soundAbsorption: preset.patch.soundAbsorption ?? 0,
            concealment: preset.patch.concealment ?? 0,
            elevationOffset: 0,
            tint: preset.tint,
            label: preset.label,
            notes: "",
          },
        },
      },
      sceneCenterInView(),
    );
  };

  const updateRegion = (patch: Partial<TabletopRegionBehavior>) => {
    const runtime = currentTabletopRuntime();
    if (!runtime || !selected || !selectedRegion) return;
    runtime.engine.updateSelectedProperties({
      region: { ...selectedRegion, ...patch },
    });
  };

  if (!snapshot || new URLSearchParams(window.location.search).get("view") === "director") return null;

  return (
    <aside className="tadeon-creative-dock" data-open={open}>
      <button
        type="button"
        className="tadeon-creative-dock__handle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title={open ? "Recolher Dock criativo" : "Abrir Dock criativo"}
      >
        <LibraryBig aria-hidden="true" />
        <span>Dock</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="tadeon-creative-dock__panel">
          <header>
            <div>
              <small>Biblioteca operacional</small>
              <strong>{snapshot.scene.name}</strong>
            </div>
            <Button size="icon" variant="ghost" aria-label="Fechar Dock" onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </Button>
          </header>
          <nav>
            <button type="button" aria-pressed={mode === "library"} onClick={() => setMode("library")}>
              <Archive aria-hidden="true" /> Placeables
            </button>
            <button type="button" aria-pressed={mode === "regions"} onClick={() => setMode("regions")}>
              <MapPinned aria-hidden="true" /> Regiões
            </button>
          </nav>

          {mode === "library" && (
            <section className="tadeon-creative-dock__library">
              <label className="tadeon-creative-dock__search">
                <Search aria-hidden="true" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filtrar por nome ou tipo" />
              </label>
              <div className="tadeon-creative-dock__stats">
                <span>{library.length} modelos únicos</span>
                <span>{snapshot.scene.entities.length} na cena</span>
              </div>
              <div className="tadeon-creative-dock__cards">
                {library.map((entity) => {
                  const preset = presetFromEntity(entity);
                  return (
                    <article
                      key={`${entity.assetId ?? entity.assetUrl ?? entity.id}:${entity.type}`}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(PLACEABLE_MIME, JSON.stringify(preset));
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                    >
                      <div className="tadeon-creative-dock__thumb">
                        {entity.assetUrl ? <img src={entity.assetUrl} alt="" loading="lazy" /> : <Box aria-hidden="true" />}
                      </div>
                      <div>
                        <strong>{entity.label}</strong>
                        <small>{entity.type}</small>
                      </div>
                      <button
                        type="button"
                        title="Adicionar cópia visual no centro da vista"
                        onClick={() => currentTabletopRuntime()?.engine.addEntityAt(presetSeed(preset), sceneCenterInView())}
                      >
                        <Copy aria-hidden="true" />
                      </button>
                    </article>
                  );
                })}
                {library.length === 0 && (
                  <div className="tadeon-creative-dock__empty">
                    <LibraryBig aria-hidden="true" />
                    <strong>Nenhum placeable visual encontrado</strong>
                    <span>Quando tokens, objetos e tiles entram na cena, eles passam a formar uma biblioteca reutilizável sem duplicar vínculos sensíveis.</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {mode === "regions" && (
            <section className="tadeon-creative-dock__regions">
              <div className="tadeon-creative-dock__region-presets">
                {REGION_PRESETS.map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" onClick={() => createRegion(id)}>
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              {selectedRegion && selected ? (
                <div className="tadeon-creative-dock__region-editor">
                  <header>
                    <div>
                      <small>Região selecionada</small>
                      <strong>{selected.label}</strong>
                    </div>
                    <label>
                      <span>Ativa</span>
                      <Switch checked={selectedRegion.enabled} onCheckedChange={(enabled) => updateRegion({ enabled })} />
                    </label>
                  </header>
                  <label className="is-wide">
                    <span>Superfície</span>
                    <select value={selectedRegion.surface} onChange={(event) => updateRegion({ surface: event.target.value as TabletopSurfaceType })}>
                      {REGION_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                      <option value="normal">Normal</option>
                    </select>
                  </label>
                  <div className="tadeon-creative-dock__region-grid">
                    <label>
                      <span>Movimento ×</span>
                      <Input type="number" min={0.1} max={12} step={0.1} value={selectedRegion.movementMultiplier} onChange={(event) => updateRegion({ movementMultiplier: Number(event.target.value) || 1 })} />
                    </label>
                    <label>
                      <span>Luz %</span>
                      <Input type="number" min={0} max={300} value={percent(selectedRegion.lightMultiplier)} onChange={(event) => updateRegion({ lightMultiplier: Math.max(0, Number(event.target.value) / 100) })} />
                    </label>
                    <label>
                      <span>Som absorvido %</span>
                      <Input type="number" min={0} max={100} value={percent(selectedRegion.soundAbsorption)} onChange={(event) => updateRegion({ soundAbsorption: Math.max(0, Math.min(1, Number(event.target.value) / 100)) })} />
                    </label>
                    <label>
                      <span>Ocultação %</span>
                      <Input type="number" min={0} max={100} value={percent(selectedRegion.concealment)} onChange={(event) => updateRegion({ concealment: Math.max(0, Math.min(1, Number(event.target.value) / 100)) })} />
                    </label>
                    <label>
                      <span>Elevação</span>
                      <Input type="number" value={selectedRegion.elevationOffset} onChange={(event) => updateRegion({ elevationOffset: Number(event.target.value) || 0 })} />
                    </label>
                    <label>
                      <span>Cor</span>
                      <input type="color" value={selectedRegion.tint || "#8f6bb8"} onChange={(event) => updateRegion({ tint: event.target.value })} />
                    </label>
                  </div>
                  <label className="is-wide">
                    <span>Nome operacional</span>
                    <Input value={selectedRegion.label ?? ""} onChange={(event) => updateRegion({ label: event.target.value })} placeholder="Ex.: água profunda, fumaça densa" />
                  </label>
                  <label className="is-wide">
                    <span>Notas</span>
                    <Input value={selectedRegion.notes ?? ""} onChange={(event) => updateRegion({ notes: event.target.value })} placeholder="Contexto para o mestre; sem automação de regra" />
                  </label>
                  <p><Eye aria-hidden="true" /> Luz, movimento, som e ocultação ficam independentes. A região descreve o espaço; ela não decide ações dos personagens.</p>
                </div>
              ) : (
                <div className="tadeon-creative-dock__empty is-region">
                  <MapPinned aria-hidden="true" />
                  <strong>Crie ou selecione uma região</strong>
                  <span>Regiões são placeables normais: podem ser movidas, redimensionadas, rotacionadas, duplicadas e desfeitas pelo histórico da própria Mesa.</span>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
