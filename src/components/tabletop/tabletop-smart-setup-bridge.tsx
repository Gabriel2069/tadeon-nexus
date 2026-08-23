import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Check,
  Compass,
  Footprints,
  Grid2X2,
  Layers3,
  Lightbulb,
  Loader2,
  RotateCcw,
  RotateCw,
  ScanLine,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import {
  analyzeTabletopMapV2,
  smartSetupRegionToEntitySeed,
  type TabletopSmartSetupV2Analysis,
} from "@/lib/tabletop/tabletop-smart-setup-v2";
import { applyTabletopGridOrigin } from "@/lib/tabletop/tabletop-grid-origin-runtime";
import {
  createTabletopStructure,
  structureCollision,
  structureChannels,
} from "@/lib/tabletop/tabletop-spatial";
import { tabletopVisibilityService, type TabletopLight } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
import { TabletopStagePortal } from "@/components/tabletop/tabletop-stage-portal";
import "@/styles/tabletop-smart-setup.css";

function useSnapshot() {
  const [snapshot, setSnapshot] = useState<TabletopSnapshot | null>(null);
  useEffect(() => {
    let frame = 0;
    const boot = () => {
      const runtime = currentTabletopRuntime();
      if (runtime) return setSnapshot(runtime.snapshot());
      frame = requestAnimationFrame(boot);
    };
    boot();
    const render = (event: Event) =>
      setSnapshot(
        (event as CustomEvent<TabletopSnapshot>).detail ??
          currentTabletopRuntime()?.snapshot() ??
          null,
      );
    window.addEventListener("tadeon-tabletop-render", render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", render);
    };
  }, []);
  return snapshot;
}

function nearLight(left: TabletopLight, right: TabletopLight) {
  return (
    Math.hypot(left.x - right.x, left.y - right.y) <= Math.max(24, right.radius * 0.22) &&
    Math.abs(left.radius - right.radius) <= Math.max(24, right.radius * 0.3)
  );
}

export function TabletopSmartSetupBridge() {
  const snapshot = useSnapshot();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<TabletopSmartSetupV2Analysis | null>(null);
  const [applyGrid, setApplyGrid] = useState(true);
  const [applyStructures, setApplyStructures] = useState(true);
  const [applyLighting, setApplyLighting] = useState(true);
  const [applyRegions, setApplyRegions] = useState(true);
  const [spatialView, setSpatialView] = useState({
    projection: "plan" as "plan" | "isometric",
    yaw: 45,
    tilt: 0.5,
    elevationScale: 1,
  });
  const scene = snapshot?.scene;
  const canAnalyze = Boolean(
    scene && scene.id !== "local-scene" && scene.backgroundAssetUrl,
  );
  const confidence = useMemo(
    () => (analysis ? Math.round(analysis.grid.confidence * 100) : 0),
    [analysis],
  );

  useEffect(() => {
    const openSetup = () => setOpen(true);
    window.addEventListener("tadeon-tabletop-smart-setup", openSetup);
    return () => window.removeEventListener("tadeon-tabletop-smart-setup", openSetup);
  }, []);

  useEffect(() => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const current = runtime.engine.viewState();
    setSpatialView({
      projection: current.projection,
      yaw: current.yaw,
      tilt: current.tilt,
      elevationScale: current.elevationScale,
    });
  }, [snapshot]);

  const applySpatialView = (
    patch: Partial<typeof spatialView>,
    fit = false,
  ) => {
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    const current = runtime.engine.viewState();
    runtime.engine.applyViewState({ ...current, ...patch });
    if (fit) runtime.engine.fitToScreen();
    const next = runtime.engine.viewState();
    setSpatialView({
      projection: next.projection,
      yaw: next.yaw,
      tilt: next.tilt,
      elevationScale: next.elevationScale,
    });
  };

  const runAnalysis = async () => {
    if (!scene?.backgroundAssetUrl || busy) return;
    setBusy(true);
    try {
      const next = await analyzeTabletopMapV2(scene);
      setAnalysis(next);
      toast.success(
        `Mapa compreendido em ${next.analysisScore}/100. Revise as sugestões antes de aplicar.`,
      );
    } catch {
      toast.error(
        "Não consegui ler os pixels desse mapa. Confirme o asset/CORS ou tente outro arquivo.",
      );
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!scene || !analysis || busy) return;
    const runtime = currentTabletopRuntime();
    if (!runtime) return;
    setBusy(true);
    try {
      if (applyGrid) {
        runtime.engine.setGrid(analysis.grid.mode, analysis.grid.size);
        const alignedScene = runtime.snapshot().scene;
        applyTabletopGridOrigin(
          runtime.engine,
          alignedScene,
          analysis.gridAlignment.offsetX,
          analysis.gridAlignment.offsetY,
        );
      }

      const current = await tabletopVisibilityService.load(scene.id);
      const activeLevelId =
        snapshot?.activeLevelId ?? scene.levels?.find((level) => level.visible)?.id;
      const existingKeys = new Set(
        current.walls.map((wall) =>
          [
            wall.wallType,
            Math.round(wall.x1),
            Math.round(wall.y1),
            Math.round(wall.x2),
            Math.round(wall.y2),
          ].join(":"),
        ),
      );
      const generated = applyStructures
        ? analysis.structures
            .filter((suggestion) => suggestion.confidence >= 0.48)
            .flatMap((suggestion) => {
              const draft = createTabletopStructure({
                id: suggestion.id,
                type: suggestion.type,
                start: suggestion.start,
                end: suggestion.end,
              });
              if (!draft) return [];
              const key = [
                draft.wallType,
                Math.round(draft.x1),
                Math.round(draft.y1),
                Math.round(draft.x2),
                Math.round(draft.y2),
              ].join(":");
              if (existingKeys.has(key)) return [];
              existingKeys.add(key);
              const collision = structureCollision(draft.wallType);
              return [
                {
                  id: draft.id,
                  levelId: activeLevelId ?? undefined,
                  x1: draft.x1,
                  y1: draft.y1,
                  x2: draft.x2,
                  y2: draft.y2,
                  wallType: draft.wallType,
                  blocksVision: collision.blocksVision,
                  blocksMovement: collision.blocksMovement,
                  height: Math.max(64, scene.gridSize * 3),
                  thickness: Math.max(4, scene.gridSize * 0.1),
                  properties: {
                    ...structureChannels(draft.wallType),
                    smartSetup: true,
                    smartConfidence: suggestion.confidence,
                  } as never,
                  version: 1,
                },
              ];
            })
        : [];

      const generatedLights: TabletopLight[] = applyLighting
        ? analysis.lightZones
            .filter((zone) => zone.confidence >= 0.58)
            .flatMap((zone) => {
              const light: TabletopLight = {
                id: zone.id,
                levelId: activeLevelId ?? undefined,
                entityId: null,
                x: zone.center.x,
                y: zone.center.y,
                radius: zone.radius,
                intensity: zone.intensity,
                color: zone.temperature >= 5000 ? "#fff5db" : "#ffd59a",
                enabled: true,
                castsShadows: true,
                properties: {
                  shape: "radial",
                  falloff: 1.45,
                  softness: 0.5,
                  temperature: zone.temperature,
                  particles: "dust",
                },
              };
              return current.lights.some((existing) => nearLight(existing, light)) ? [] : [light];
            })
        : [];

      const next = {
        ...current,
        globalIllumination: applyLighting
          ? analysis.suggestedGlobalIllumination
          : current.globalIllumination,
        fogEnabled: applyLighting ? analysis.suggestedFogEnabled : current.fogEnabled,
        walls: [...current.walls, ...generated].slice(0, 512),
        lights: [...current.lights, ...generatedLights].slice(0, 256),
      };
      const saved = await tabletopVisibilityService.save(scene.id, next);
      runtime.engine.setVisibility(saved.visibility, true);

      let regionsCreated = 0;
      if (applyRegions) {
        const liveScene = runtime.snapshot().scene;
        const existingSmartKeys = new Set(
          liveScene.entities.flatMap((entity) => {
            if (entity.type !== "area" || !entity.properties || typeof entity.properties !== "object") return [];
            const source = entity.properties as Record<string, unknown>;
            const smart = source.smart_setup;
            if (!smart || typeof smart !== "object") return [];
            const kind = (smart as Record<string, unknown>).kind;
            return [`${String(kind)}:${Math.round(entity.x)}:${Math.round(entity.y)}:${Math.round(entity.width)}:${Math.round(entity.height)}`];
          }),
        );
        for (const region of analysis.semanticRegions.filter((entry) => entry.confidence >= 0.54)) {
          const key = `${region.kind}:${Math.round(region.bounds.x)}:${Math.round(region.bounds.y)}:${Math.round(region.bounds.width)}:${Math.round(region.bounds.height)}`;
          if (existingSmartKeys.has(key)) continue;
          existingSmartKeys.add(key);
          runtime.engine.addEntityAt(
            { ...smartSetupRegionToEntitySeed(region), levelId: activeLevelId ?? null },
            {
              x: region.bounds.x + region.bounds.width / 2,
              y: region.bounds.y + region.bounds.height / 2,
            },
          );
          regionsCreated += 1;
        }
      }

      window.dispatchEvent(
        new CustomEvent("tadeon-tabletop-smart-setup-applied", {
          detail: {
            sceneId: scene.id,
            version: 2,
            score: analysis.analysisScore,
            grid: applyGrid,
            gridOffset: applyGrid
              ? [analysis.gridAlignment.offsetX, analysis.gridAlignment.offsetY]
              : null,
            structures: generated.length,
            lights: generatedLights.length,
            regions: regionsCreated,
            illumination: applyLighting,
          },
        }),
      );
      toast.success(
        `Setup v2 aplicado: ${generated.length} estrutura(s), ${regionsCreated} região(ões), ${generatedLights.length} luz(es)${applyGrid ? ` e grade ${analysis.grid.size}px alinhada` : ""}.`,
      );
      setOpen(false);
    } catch {
      toast.error(
        "A cena mudou ou não aceitou o setup. Reanalise antes de aplicar novamente.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (
    !snapshot ||
    location.pathname !== "/tabletop" ||
    new URLSearchParams(location.search).get("view") === "director"
  )
    return null;

  return (
    <TabletopStagePortal>
    <>
      <button
        type="button"
        className="tadeon-smart-setup__launcher"
        onClick={() => setOpen(true)}
        title="Setup inteligente do mapa"
      >
        <WandSparkles aria-hidden="true" />
        <span>Setup</span>
      </button>
      <aside className="tadeon-smart-setup" data-open={open} aria-hidden={!open}>
        <header>
          <span><BrainCircuit aria-hidden="true" /></span>
          <div><small>Compreensão assistida · v2</small><strong>Setup inteligente</strong></div>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar setup"><X /></Button>
        </header>
        <div className="tadeon-smart-setup__body">
          <section className="tadeon-smart-setup__spatial" aria-label="Configuração da visão espacial">
            <header>
              <span><Compass aria-hidden="true" /></span>
              <div>
                <small>Projeção espacial</small>
                <strong>Observe e posicione por qualquer direção</strong>
              </div>
              <output>{Math.round(spatialView.yaw)}°</output>
            </header>
            <div className="tadeon-smart-setup__projection-modes">
              <button
                type="button"
                aria-pressed={spatialView.projection === "plan"}
                onClick={() => applySpatialView({ projection: "plan" }, true)}
              >2D tático</button>
              <button
                type="button"
                aria-pressed={spatialView.projection === "isometric"}
                onClick={() => applySpatialView({ projection: "isometric" }, true)}
              >3D espacial</button>
            </div>
            <div className="tadeon-smart-setup__orientation-presets" aria-label="Direções de observação">
              {([
                [315, "Noroeste"],
                [45, "Nordeste"],
                [135, "Sudeste"],
                [225, "Sudoeste"],
              ] as const).map(([yaw, label]) => (
                <button
                  key={yaw}
                  type="button"
                  aria-pressed={Math.round(spatialView.yaw) === yaw}
                  onClick={() => applySpatialView({ projection: "isometric", yaw: Number(yaw) }, true)}
                >{label}</button>
              ))}
            </div>
            <div className="tadeon-smart-setup__orientation-controls">
              <button
                type="button"
                onClick={() => applySpatialView({ projection: "isometric", yaw: spatialView.yaw - 45 })}
                aria-label="Girar visão 45 graus para a esquerda"
                title="Girar 45° para a esquerda"
              ><RotateCcw aria-hidden="true" /></button>
              <label>
                <span>Direção</span>
                <input
                  type="range"
                  min="0"
                  max="359"
                  step="1"
                  value={Math.round(spatialView.yaw)}
                  onChange={(event) => applySpatialView({ projection: "isometric", yaw: Number(event.target.value) })}
                />
              </label>
              <button
                type="button"
                onClick={() => applySpatialView({ projection: "isometric", yaw: spatialView.yaw + 45 })}
                aria-label="Girar visão 45 graus para a direita"
                title="Girar 45° para a direita"
              ><RotateCw aria-hidden="true" /></button>
            </div>
            <div className="tadeon-smart-setup__spatial-sliders">
              <label>
                <span>Inclinação <output>{Math.round(spatialView.tilt * 100)}%</output></span>
                <input type="range" min="18" max="90" step="1" value={Math.round(spatialView.tilt * 100)} onChange={(event) => applySpatialView({ projection: "isometric", tilt: Number(event.target.value) / 100 })} />
              </label>
              <label>
                <span>Altura <output>{spatialView.elevationScale.toFixed(2)}×</output></span>
                <input type="range" min="25" max="250" step="5" value={Math.round(spatialView.elevationScale * 100)} onChange={(event) => applySpatialView({ projection: "isometric", elevationScale: Number(event.target.value) / 100 })} />
              </label>
            </div>
          </section>
          {!canAnalyze ? (
            <div className="tadeon-smart-setup__empty">
              <ScanLine />
              <strong>Adicione uma imagem de fundo</strong>
              <p>O assistente lê o mapa atual para sugerir grade, arquitetura, ambientes, terreno, luz, fog e regiões sem alterar nada antes da confirmação.</p>
            </div>
          ) : !analysis ? (
            <div className="tadeon-smart-setup__intro">
              <Sparkles />
              <h3>Entender este mapa</h3>
              <p>A leitura ocorre localmente no navegador e procura periodicidade, contornos, salas, circulação, vãos, textura, transições verticais e focos de luz.</p>
              <Button onClick={runAnalysis} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ScanLine />} Analisar mapa
              </Button>
            </div>
          ) : (
            <>
              <section className="tadeon-smart-setup__score">
                <Grid2X2 />
                <div>
                  <small>Compreensão {analysis.analysisScore}/100 · grade {confidence}%</small>
                  <strong>{analysis.grid.mode} · {analysis.grid.size}px · origem {analysis.gridAlignment.offsetX.toFixed(0)},{analysis.gridAlignment.offsetY.toFixed(0)}</strong>
                  <p>{analysis.grid.evidence}</p>
                </div>
              </section>
              <section className="tadeon-smart-setup__diagnostics">
                <p><Layers3 />{analysis.rooms.length} cômodo(s) · {analysis.corridors.length} corredor(es) · {analysis.verticalTransitions.length} escada(s)/transição(ões)</p>
                <p><Footprints />{analysis.terrain.length} terreno(s) · {analysis.cover.length} cobertura(s) · {analysis.semanticRegions.length} região(ões) aproveitáveis</p>
                <p><Lightbulb />{analysis.lightZones.length} foco(s) provável(is) de luz · {analysis.structures.length} estrutura(s)</p>
                {analysis.diagnostics.slice(-4).map((item) => <p key={item}><Check />{item}</p>)}
              </section>
              <section className="tadeon-smart-setup__choices">
                <label>
                  <input type="checkbox" checked={applyGrid} onChange={(event) => setApplyGrid(event.target.checked)} />
                  <span><strong>Alinhar grade completa</strong><small>Aplica modo, tamanho e origem X/Y detectados. Confiança da origem: {Math.round(analysis.gridAlignment.confidence * 100)}%.</small></span>
                </label>
                <label>
                  <input type="checkbox" checked={applyStructures} onChange={(event) => setApplyStructures(event.target.checked)} />
                  <span><strong>Arquitetura sugerida</strong><small>{analysis.structures.length} trecho(s), incluindo vãos e roofs detectados.</small></span>
                </label>
                <label>
                  <input type="checkbox" checked={applyRegions} onChange={(event) => setApplyRegions(event.target.checked)} />
                  <span><strong>Ambientes, terreno e circulação</strong><small>Cria regiões canônicas para salas, corredores, cobertura, terreno e transições verticais.</small></span>
                </label>
                <label>
                  <input type="checkbox" checked={applyLighting} onChange={(event) => setApplyLighting(event.target.checked)} />
                  <span><strong>Luz, fog e focos locais</strong><small>Iluminação base {Math.round(analysis.suggestedGlobalIllumination * 100)}% · {analysis.lightZones.length} fonte(s) sugerida(s).</small></span>
                </label>
              </section>
              <div className="tadeon-smart-setup__actions">
                <Button variant="outline" onClick={runAnalysis} disabled={busy}>Reanalisar</Button>
                <Button onClick={apply} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <WandSparkles />} Aplicar selecionados
                </Button>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
    </TabletopStagePortal>
  );
}
