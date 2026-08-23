import { useEffect, useState } from "react";
import { BrickWall, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TabletopStagePortal } from "@/components/tabletop/tabletop-stage-portal";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import type { TabletopEntity, TabletopSnapshot } from "@/lib/tabletop/types";
import "@/styles/tabletop-semantic-transform.css";

const REGION_CANDIDATES = new Set<TabletopEntity["type"]>([
  "drawing",
  "object",
  "tile",
  "marker",
  "note",
  "area",
]);

export function TabletopSemanticTransformBridge() {
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
    const onRender = (event: Event) =>
      setSnapshot(
        (event as CustomEvent<TabletopSnapshot>).detail ??
          currentTabletopRuntime()?.snapshot() ??
          null,
      );
    const onDestroyed = () => setSnapshot(null);
    window.addEventListener("tadeon-tabletop-render", onRender);
    window.addEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("tadeon-tabletop-render", onRender);
      window.removeEventListener("tadeon-tabletop-runtime-destroyed", onDestroyed);
    };
  }, []);

  const selected =
    snapshot?.selectedIds.length === 1
      ? snapshot.scene.entities.find((entity) => entity.id === snapshot.selectedIds[0]) ?? null
      : null;
  if (!selected || !REGION_CANDIDATES.has(selected.type)) return null;

  const makeRegion = () => {
    const engine = currentTabletopRuntime()?.engine;
    if (!engine) return;
    engine.updateSelected({ type: selected.type === "area" ? "object" : "area" }, selected.type === "area" ? "Converter região em objeto" : "Converter em região");
    if (selected.type !== "area") {
      engine.updateSelectedProperties(
        {
          region: {
            enabled: true,
            surface: "custom",
            movementMultiplier: 1,
            lightMultiplier: 1,
            soundAbsorption: 0,
            concealment: 0,
            elevationOffset: 0,
            label: selected.label,
          },
        },
        "Preparar comportamento da região",
      );
      toast.success("A peça virou uma região comportamental editável.");
    } else {
      toast.success("A região voltou a ser um objeto da cena.");
    }
  };

  return (
    <TabletopStagePortal>
    <div className="tadeon-semantic-transform" role="toolbar" aria-label="Transformações contextuais">
      <small>Transformar</small>
      {selected.type === "drawing" && (
        <Button
          size="sm"
          variant="outline"
          title="Criar segmentos arquitetônicos seguindo este traço e o tipo de estrutura ativo"
          onClick={() => {
            const count = currentTabletopRuntime()?.engine.createStructuresFromSelectedDrawing() ?? 0;
            if (count > 0) toast.success(`${count} segmento${count === 1 ? "" : "s"} de arquitetura criado${count === 1 ? "" : "s"} a partir do traço.`);
            else toast.error("O traço não possui geometria suficiente para virar arquitetura.");
          }}
        >
          <BrickWall aria-hidden="true" /> Arquitetura
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={makeRegion}>
        <ScanLine aria-hidden="true" /> {selected.type === "area" ? "Objeto" : "Região"}
      </Button>
    </div>
    </TabletopStagePortal>
  );
}
