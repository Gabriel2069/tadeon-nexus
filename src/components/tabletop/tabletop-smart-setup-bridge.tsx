import { useEffect, useMemo, useState } from "react";
import { BrainCircuit, Check, Grid2X2, Loader2, ScanLine, Sparkles, WandSparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import { analyzeTabletopMap, type TabletopSmartSetupAnalysis } from "@/lib/tabletop/tabletop-smart-setup";
import { createTabletopStructure, structureCollision, structureChannels } from "@/lib/tabletop/tabletop-spatial";
import { tabletopVisibilityService } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
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
    const render = (event: Event) => setSnapshot((event as CustomEvent<TabletopSnapshot>).detail ?? currentTabletopRuntime()?.snapshot() ?? null);
    window.addEventListener("tadeon-tabletop-render", render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", render);
    };
  }, []);
  return snapshot;
}

export function TabletopSmartSetupBridge() {
  const snapshot = useSnapshot();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<TabletopSmartSetupAnalysis | null>(null);
  const [applyGrid, setApplyGrid] = useState(true);
  const [applyStructures, setApplyStructures] = useState(true);
  const [applyLighting, setApplyLighting] = useState(true);
  const scene = snapshot?.scene;
  const canAnalyze = Boolean(scene && scene.id !== "local-scene" && scene.backgroundAssetUrl);
  const confidence = useMemo(() => analysis ? Math.round(analysis.grid.confidence * 100) : 0, [analysis]);

  useEffect(() => {
    const openSetup = () => setOpen(true);
    window.addEventListener("tadeon-tabletop-smart-setup", openSetup);
    return () => window.removeEventListener("tadeon-tabletop-smart-setup", openSetup);
  }, []);

  const runAnalysis = async () => {
    if (!scene?.backgroundAssetUrl || busy) return;
    setBusy(true);
    try {
      const next = await analyzeTabletopMap(scene);
      setAnalysis(next);
      toast.success("Mapa analisado. Revise as sugestões antes de aplicar.");
    } catch {
      toast.error("Não consegui ler os pixels desse mapa. Confirme o asset/CORS ou tente outro arquivo.");
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
      if (applyGrid) runtime.engine.setGrid(analysis.grid.mode, analysis.grid.size);
      const current = await tabletopVisibilityService.load(scene.id);
      const activeLevelId = snapshot?.activeLevelId ?? scene.levels?.find((level) => level.visible)?.id;
      const existingKeys = new Set(current.walls.map((wall) => [wall.wallType, Math.round(wall.x1), Math.round(wall.y1), Math.round(wall.x2), Math.round(wall.y2)].join(":")));
      const generated = applyStructures
        ? analysis.structures.flatMap((suggestion) => {
            const draft = createTabletopStructure({ id: suggestion.id, type: suggestion.type, start: suggestion.start, end: suggestion.end });
            if (!draft) return [];
            const key = [draft.wallType, Math.round(draft.x1), Math.round(draft.y1), Math.round(draft.x2), Math.round(draft.y2)].join(":");
            if (existingKeys.has(key)) return [];
            const collision = structureCollision(draft.wallType);
            return [{
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
              properties: { ...structureChannels(draft.wallType), smartSetup: true, smartConfidence: suggestion.confidence } as never,
              version: 1,
            }];
          })
        : [];
      const next = {
        ...current,
        globalIllumination: applyLighting ? analysis.suggestedGlobalIllumination : current.globalIllumination,
        fogEnabled: applyLighting ? analysis.suggestedFogEnabled : current.fogEnabled,
        walls: [...current.walls, ...generated].slice(0, 512),
      };
      const saved = await tabletopVisibilityService.save(scene.id, next);
      runtime.engine.setVisibility(saved.visibility, true);
      window.dispatchEvent(new CustomEvent("tadeon-tabletop-smart-setup-applied", { detail: { sceneId: scene.id, grid: applyGrid, structures: generated.length, illumination: applyLighting } }));
      toast.success(`Setup aplicado: ${generated.length} nova(s) estrutura(s), grade ${analysis.grid.size}px${applyLighting ? " e iluminação sugerida" : ""}.`);
      setOpen(false);
    } catch {
      toast.error("A cena mudou ou não aceitou o setup. Reanalise antes de aplicar novamente.");
    } finally {
      setBusy(false);
    }
  };

  if (!snapshot || location.pathname !== "/tabletop" || new URLSearchParams(location.search).get("view") === "director") return null;

  return (
    <>
      <button type="button" className="tadeon-smart-setup__launcher" onClick={() => setOpen(true)} title="Setup inteligente do mapa">
        <WandSparkles aria-hidden="true" />
        <span>Setup</span>
      </button>
      <aside className="tadeon-smart-setup" data-open={open} aria-hidden={!open}>
        <header>
          <span><BrainCircuit aria-hidden="true" /></span>
          <div><small>Leitura assistida</small><strong>Setup inteligente</strong></div>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)} aria-label="Fechar setup"><X /></Button>
        </header>
        <div className="tadeon-smart-setup__body">
          {!canAnalyze ? (
            <div className="tadeon-smart-setup__empty"><ScanLine /><strong>Adicione uma imagem de fundo</strong><p>O assistente lê o mapa atual para sugerir grade, arquitetura, fog e iluminação sem alterar nada antes da sua confirmação.</p></div>
          ) : !analysis ? (
            <div className="tadeon-smart-setup__intro"><Sparkles /><h3>Entender este mapa</h3><p>Analisa os pixels localmente no navegador. Nenhuma imagem precisa sair da sessão para o processo de detecção.</p><Button onClick={runAnalysis} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ScanLine />} Analisar mapa</Button></div>
          ) : (
            <>
              <section className="tadeon-smart-setup__score"><Grid2X2 /><div><small>Grade provável · confiança {confidence}%</small><strong>{analysis.grid.mode} · {analysis.grid.size}px</strong><p>{analysis.grid.evidence}</p></div></section>
              <section className="tadeon-smart-setup__diagnostics">{analysis.diagnostics.map((item) => <p key={item}><Check />{item}</p>)}</section>
              <section className="tadeon-smart-setup__choices">
                <label><input type="checkbox" checked={applyGrid} onChange={(event) => setApplyGrid(event.target.checked)} /><span><strong>Alinhar grade</strong><small>Aplica modo e tamanho sugeridos.</small></span></label>
                <label><input type="checkbox" checked={applyStructures} onChange={(event) => setApplyStructures(event.target.checked)} /><span><strong>Arquitetura sugerida</strong><small>{analysis.structures.length} eixo(s) de parede com confiança suficiente.</small></span></label>
                <label><input type="checkbox" checked={applyLighting} onChange={(event) => setApplyLighting(event.target.checked)} /><span><strong>Luz e fog iniciais</strong><small>Iluminação {Math.round(analysis.suggestedGlobalIllumination * 100)}% · fog preparado.</small></span></label>
              </section>
              <div className="tadeon-smart-setup__actions"><Button variant="outline" onClick={runAnalysis} disabled={busy}>Reanalisar</Button><Button onClick={apply} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <WandSparkles />} Aplicar selecionados</Button></div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
