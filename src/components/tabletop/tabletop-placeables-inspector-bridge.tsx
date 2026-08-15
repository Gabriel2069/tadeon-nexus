import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BrickWall,
  ChevronDown,
  CloudFog,
  Eye,
  EyeOff,
  Focus,
  LampDesk,
  Layers3,
  Lock,
  LockOpen,
  Search,
  Shapes,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-placeables-inspector.css";

const tabletopDatabase = supabase as unknown as SupabaseClient;

type InspectorKind = "all" | "entities" | "walls" | "lights" | "fog";

interface WallRow {
  id: string;
  level_id: string | null;
  wall_type: string;
}
interface LightRow {
  id: string;
  level_id: string | null;
  enabled: boolean;
  color: string;
}
interface FogRow {
  id: string;
  level_id: string | null;
  operation: string;
  geometry: string | null;
}

function useRuntimeSnapshot() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);

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

  return snapshot;
}

function typeLabel(type: TabletopEntity["type"]) {
  const labels: Partial<Record<TabletopEntity["type"], string>> = {
    token: "Token",
    character: "Personagem",
    npc: "NPC",
    creature: "Criatura",
    object: "Objeto",
    tile: "Tile",
    drawing: "Desenho",
    text: "Texto",
    marker: "Marcador",
    note: "Nota",
    area: "Região",
    light: "Luz",
    handout_pin: "Handout",
  };
  return labels[type] ?? type;
}

const TOKEN_TYPES: TabletopEntity["type"][] = ["token", "character", "npc", "creature"];
const OBJECT_TYPES: TabletopEntity["type"][] = ["object", "tile", "marker", "note", "area", "handout_pin"];

export function TabletopPlaceablesInspectorBridge() {
  const { role } = useAuth();
  const snapshot = useRuntimeSnapshot();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<InspectorKind>("all");
  const [walls, setWalls] = useState<WallRow[]>([]);
  const [lights, setLights] = useState<LightRow[]>([]);
  const [fog, setFog] = useState<FogRow[]>([]);
  const sceneId = snapshot?.scene.id;

  const refreshSpatial = useCallback(async () => {
    if (!sceneId || sceneId === "local-scene") {
      setWalls([]);
      setLights([]);
      setFog([]);
      return;
    }
    const [wallResult, lightResult, fogResult] = await Promise.all([
      tabletopDatabase.from("tabletop_walls").select("id,level_id,wall_type").eq("scene_id", sceneId),
      tabletopDatabase.from("tabletop_lights").select("id,level_id,enabled,color").eq("scene_id", sceneId),
      tabletopDatabase.from("tabletop_fog_strokes").select("id,level_id,operation,geometry").eq("scene_id", sceneId).order("sequence_index"),
    ]);
    if (!wallResult.error) setWalls((wallResult.data ?? []) as unknown as WallRow[]);
    if (!lightResult.error) setLights((lightResult.data ?? []) as unknown as LightRow[]);
    if (!fogResult.error) setFog((fogResult.data ?? []) as unknown as FogRow[]);
  }, [sceneId]);

  useEffect(() => {
    void refreshSpatial();
  }, [refreshSpatial]);

  useEffect(() => {
    const onAutosave = (event: Event) => {
      const state = (event as CustomEvent<{ state?: string }>).detail?.state;
      if (state === "saved") void refreshSpatial();
    };
    window.addEventListener("tadeon-tabletop-autosave-state", onAutosave);
    return () => window.removeEventListener("tadeon-tabletop-autosave-state", onAutosave);
  }, [refreshSpatial]);

  const activeLevelId = snapshot?.scene.levels?.find((level) => level.visible)?.id ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const entities = useMemo(
    () =>
      (snapshot?.scene.entities ?? [])
        .filter((entity) => {
          if (!normalizedQuery) return true;
          return `${entity.label} ${typeLabel(entity.type)}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
        })
        .sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label, "pt-BR")),
    [normalizedQuery, snapshot?.scene.entities],
  );

  const selected = snapshot?.selectedIds.length === 1
    ? snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null
    : null;
  const transformOptions = selected
    ? TOKEN_TYPES.includes(selected.type)
      ? TOKEN_TYPES
      : OBJECT_TYPES.includes(selected.type)
        ? OBJECT_TYPES
        : [selected.type]
    : [];

  if (
    role !== "mestre" ||
    !snapshot ||
    typeof window === "undefined" ||
    window.location.pathname !== "/tabletop" ||
    new URLSearchParams(window.location.search).get("view") === "director"
  )
    return null;

  const levelName = (id: string | null) =>
    snapshot.scene.levels?.find((level) => level.id === id)?.name ?? "Andar base";

  return (
    <aside className="tadeon-placeables" data-open={open}>
      <button
        type="button"
        className="tadeon-placeables__handle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Objetos e placeables da cena"
      >
        <Layers3 aria-hidden="true" />
        <span>{snapshot.scene.entities.length + walls.length + lights.length + fog.length}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div className="tadeon-placeables__panel">
          <header>
            <span className="tadeon-placeables__mark"><Shapes aria-hidden="true" /></span>
            <div>
              <small>Placeables Inspector</small>
              <strong>{snapshot.scene.name}</strong>
            </div>
            <Button size="icon" variant="ghost" aria-label="Fechar inspetor" onClick={() => setOpen(false)}>
              <X aria-hidden="true" />
            </Button>
          </header>

          <label className="tadeon-placeables__search">
            <Search aria-hidden="true" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar entidade, tipo..." />
          </label>

          <nav aria-label="Tipos de placeable">
            {(
              [
                ["all", "Tudo"],
                ["entities", `Entidades ${snapshot.scene.entities.length}`],
                ["walls", `Arquitetura ${walls.length}`],
                ["lights", `Luzes ${lights.length}`],
                ["fog", `Névoa ${fog.length}`],
              ] as const
            ).map(([value, label]) => (
              <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}>
                {label}
              </button>
            ))}
          </nav>

          {selected && (
            <section className="tadeon-placeables__selected">
              <div>
                <small>Seleção</small>
                <strong>{selected.label}</strong>
              </div>
              <Button size="icon" variant="ghost" title="Enquadrar" onClick={() => currentTabletopRuntime()?.engine.focusSelection()}>
                <Focus aria-hidden="true" />
              </Button>
              <button
                type="button"
                title={selected.hidden ? "Revelar" : "Ocultar"}
                onClick={() => currentTabletopRuntime()?.engine.updateSelected({ hidden: !selected.hidden }, selected.hidden ? "Revelar entidade" : "Ocultar entidade")}
              >
                {selected.hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
              <button
                type="button"
                title={selected.locked ? "Desbloquear" : "Bloquear"}
                onClick={() => currentTabletopRuntime()?.engine.updateSelected({ locked: !selected.locked }, selected.locked ? "Desbloquear entidade" : "Bloquear entidade")}
              >
                {selected.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
              </button>
              {transformOptions.length > 1 && (
                <label>
                  <span>Transformar em</span>
                  <select
                    value={selected.type}
                    onChange={(event) =>
                      currentTabletopRuntime()?.engine.updateSelected(
                        { type: event.target.value as TabletopEntity["type"] },
                        `Transformar em ${event.target.value}`,
                      )
                    }
                  >
                    {transformOptions.map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
                  </select>
                </label>
              )}
            </section>
          )}

          <div className="tadeon-placeables__list">
            {(kind === "all" || kind === "entities") && entities.map((entity) => (
              <button
                key={entity.id}
                type="button"
                className="tadeon-placeables__item"
                data-active={snapshot.selectedIds.includes(entity.id)}
                onClick={() => {
                  const engine = currentTabletopRuntime()?.engine;
                  engine?.selectEntityById(entity.id);
                  engine?.focusSelection();
                }}
              >
                <span className="tadeon-placeables__thumb">
                  {entity.assetUrl ? <img src={entity.assetUrl} alt="" loading="lazy" /> : <Shapes aria-hidden="true" />}
                </span>
                <span>
                  <strong>{entity.label}</strong>
                  <small>{typeLabel(entity.type)} · {levelName(entity.levelId ?? null)}</small>
                </span>
                <span className="tadeon-placeables__flags">
                  {entity.hidden && <EyeOff aria-label="Oculto" />}
                  {entity.locked && <Lock aria-label="Bloqueado" />}
                </span>
              </button>
            ))}

            {(kind === "all" || kind === "walls") && walls
              .filter((wall) => !normalizedQuery || wall.wall_type.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
              .map((wall) => (
                <button key={wall.id} type="button" className="tadeon-placeables__item" onClick={() => {
                  const engine = currentTabletopRuntime()?.engine;
                  engine?.setSelectedStructure(wall.id);
                  engine?.focusSelection();
                }}>
                  <span className="tadeon-placeables__thumb"><BrickWall aria-hidden="true" /></span>
                  <span><strong>{wall.wall_type.replaceAll("_", " ")}</strong><small>Arquitetura · {levelName(wall.level_id)}</small></span>
                </button>
              ))}

            {(kind === "all" || kind === "lights") && lights
              .filter(() => !normalizedQuery || "luz iluminação".includes(normalizedQuery))
              .map((light) => (
                <button key={light.id} type="button" className="tadeon-placeables__item" onClick={() => {
                  const engine = currentTabletopRuntime()?.engine;
                  engine?.setSelectedLight(light.id);
                  engine?.focusSelection();
                }}>
                  <span className="tadeon-placeables__thumb" style={{ color: light.color }}><LampDesk aria-hidden="true" /></span>
                  <span><strong>{light.enabled ? "Luz acesa" : "Luz apagada"}</strong><small>Iluminação · {levelName(light.level_id)}</small></span>
                </button>
              ))}

            {(kind === "all" || kind === "fog") && fog.map((stroke, index) => (
              <button key={stroke.id} type="button" className="tadeon-placeables__item" onClick={() => {
                const engine = currentTabletopRuntime()?.engine;
                engine?.setSelectedFog(stroke.id);
                engine?.focusSelection();
              }}>
                <span className="tadeon-placeables__thumb"><CloudFog aria-hidden="true" /></span>
                <span><strong>{stroke.operation === "reveal" ? "Revelação" : "Cobertura"} {index + 1}</strong><small>{stroke.geometry ?? "pincel"} · {levelName(stroke.level_id)}</small></span>
              </button>
            ))}

            {entities.length === 0 && walls.length === 0 && lights.length === 0 && fog.length === 0 && (
              <div className="tadeon-placeables__empty">A cena ainda não possui placeables.</div>
            )}
          </div>
          {activeLevelId && <footer>Andar ativo: {levelName(activeLevelId)}</footer>}
        </div>
      )}
    </aside>
  );
}
