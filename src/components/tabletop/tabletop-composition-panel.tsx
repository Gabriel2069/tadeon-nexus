import { useState } from "react";
import {
  Box,
  Circle,
  Columns3,
  CopyPlus,
  Grid2X2,
  Pause,
  Play,
  Rows3,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
import {
  tabletopMediaKind,
  tabletopModelPausePatch,
  tabletopModelSpeedPatch,
} from "@/lib/tabletop/tabletop-media";
import type { TabletopFormation } from "@/lib/tabletop/tabletop-arrangement";
import { LayerManager } from "@/lib/tabletop/layer-manager";

export function TabletopCompositionPanel({
  snapshot,
  editable,
  engine,
}: {
  snapshot: TabletopSnapshot;
  editable: boolean;
  engine: () => TabletopEngine | null;
}) {
  const [gap, setGap] = useState(0.5),
    [columns, setColumns] = useState(3);
  const [copies, setCopies] = useState(3),
    [stepX, setStepX] = useState(1.5);
  const [stepY, setStepY] = useState(0),
    [height, setHeight] = useState(0);
  const [turn, setTurn] = useState(0);
  const selected = snapshot.scene.entities.filter((e) => snapshot.selectedIds.includes(e.id));
  const layers = new LayerManager(() => snapshot.scene.layers);
  const movableCount = selected.filter((entity) => layers.canEdit(entity)).length;
  const unit = Math.max(8, snapshot.scene.gridSize * snapshot.scene.gridScale);
  const primary = selected.length === 1 ? selected[0] : null;
  const properties =
    primary?.properties && typeof primary.properties === "object"
      ? (primary.properties as Record<string, unknown>)
      : {};
  const model = !!primary && tabletopMediaKind(properties.mime_type, primary.assetUrl) === "model";
  const form = (formation: TabletopFormation) => {
    if (!engine()?.formSelected(formation, gap * unit, columns))
      toast.error("A formação precisa de duas peças editáveis e espaço suficiente na cena.");
  };
  const field = (
    label: string,
    value: number,
    set: (value: number) => void,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value) || 0;
          set(Math.max(min, Math.min(max, step === 1 ? Math.round(next) : next)));
        }}
      />
    </label>
  );
  if (!selected.length) return null;
  return (
    <section className="tadeon-composition" aria-label="Montagem e encaixe">
      <header>
        <ScanLine aria-hidden="true" />
        <div>
          <strong>Compor o espaço</strong>
          <small>
            {selected.length} peça{selected.length === 1 ? "" : "s"} · distâncias em células da
            grade
          </small>
        </div>
      </header>
      <fieldset disabled={!editable || !movableCount}>
        <div className="tadeon-composition__quick">
          <Button
            variant="outline"
            size="sm"
            disabled={snapshot.scene.gridMode === "none"}
            onClick={() => engine()?.snapSelectedToGrid()}
          >
            <Grid2X2 aria-hidden="true" />
            Encaixar na grade
          </Button>
          <Button variant="outline" size="sm" onClick={() => engine()?.focusSelection()}>
            Enquadrar conjunto
          </Button>
        </div>
        {model && (
          <div className="tadeon-composition__model">
            <h3>
              <Box aria-hidden="true" />
              Modelo 3D
            </h3>
            <div className="tadeon-composition__fields">
              {(
                [
                  ["model_scale", "Escala do modelo", 1, 0.05, 20, 0.05],
                  ["model_yaw", "Giro do modelo (°)", 0, -360, 360, 15],
                ["model_elevation_offset", "Altura da base (px)", 0, -4096, 4096, 8],
                  ["model_animation_speed", "Velocidade da animação", 1, 0.05, 4, 0.05],
                ] as const
              ).map(([key, label, fallback, min, max, step]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    key={`${primary!.id}:${properties[key]}`}
                    aria-label={label}
                    defaultValue={typeof properties[key] === "number" ? properties[key] : fallback}
                    min={min}
                    max={max}
                    step={step}
                    onBlur={(event) => {
                      const value = event.currentTarget.valueAsNumber;
                      if (!Number.isFinite(value)) {
                        event.currentTarget.value = String(properties[key] ?? fallback);
                        return;
                      }
                      const next = Math.max(min, Math.min(max, value));
                      if (next !== (properties[key] ?? fallback))
                        engine()?.updateSelectedProperties(
                          key === "model_animation_speed"
                            ? tabletopModelSpeedPatch(properties, next, performance.now() / 1000)
                            : { [key]: next },
                          label,
                        );
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="tadeon-composition__quick">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  engine()?.updateSelectedProperties(
                    tabletopModelPausePatch(
                      properties,
                      properties.model_animation_paused !== true,
                      performance.now() / 1000,
                    ),
                    "Alternar animação 3D",
                  )
                }
              >
                {properties.model_animation_paused === true ? (
                  <Play aria-hidden="true" />
                ) : (
                  <Pause aria-hidden="true" />
                )}
                {properties.model_animation_paused === true ? "Retomar" : "Pausar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  engine()?.updateSelectedProperties(
                    { model_scale: 1, model_yaw: 0, model_elevation_offset: 0 },
                    "Reassentar modelo 3D",
                  )
                }
              >
                Reassentar modelo
              </Button>
            </div>
          </div>
        )}
        <details open={selected.length > 1}>
          <summary>
            Formações <small>alinhar sem perder o conjunto</small>
          </summary>
          <div className="tadeon-composition__fields">
            {field("Intervalo", gap, setGap, 0, 16, 0.25)}
            {field("Colunas", columns, setColumns, 1, 24)}
          </div>
          <div className="tadeon-composition__formations">
            {(
              [
                ["row", "Fileira", Columns3],
                ["column", "Coluna", Rows3],
                ["grid", "Grade", Grid2X2],
                ["ring", "Círculo", Circle],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                disabled={movableCount < 2}
                aria-label={`Organizar em ${label.toLowerCase()}`}
                onClick={() => form(id)}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </details>
        <details>
          <summary>
            Repetir conjunto <small>fileiras, escadas e padrões</small>
          </summary>
          <div className="tadeon-composition__fields">
            {field("Cópias adicionais", copies, setCopies, 1, 24)}
            {field("Passo horizontal", stepX, setStepX, -32, 32, 0.25)}
            {field("Passo vertical", stepY, setStepY, -32, 32, 0.25)}
            {field("Altura por cópia", height, setHeight, -16, 16, 0.25)}
            {field("Giro por cópia (°)", turn, setTurn, -180, 180, 15)}
          </div>
          <p>
            {copies * movableCount} novas peças. O original permanece; desfazer retira o lote
            inteiro.
            {movableCount !== selected.length && " Peças bloqueadas ficam fora do lote."}
          </p>
          <Button
            size="sm"
            onClick={() => {
              const count =
                engine()?.repeatSelected({
                  copies,
                  stepX: stepX * unit,
                  stepY: stepY * unit,
                  elevationStep: height * unit,
                  rotationStep: turn,
                }) ?? 0;
              if (count) toast.success(`${count} peças inseridas como um único lote.`);
              else
                toast.error(
                  "O conjunto ultrapassa a cena ou não tem peças editáveis. Reduza o passo ou as cópias.",
                );
            }}
          >
            <CopyPlus aria-hidden="true" />
            Inserir {copies} cópias do conjunto
          </Button>
        </details>
      </fieldset>
    </section>
  );
}
