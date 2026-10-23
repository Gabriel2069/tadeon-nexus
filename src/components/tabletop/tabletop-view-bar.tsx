import {
  Axis3d,
  Focus,
  Grid2X2,
  Maximize2,
  Minimize2,
  PanelRightOpen,
  Redo2,
  RotateCw,
  ScanLine,
  Undo2,
} from "lucide-react";
import { SelectionGroup } from "@/components/selection-plate";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import type { TabletopSnapshot } from "@/lib/tabletop/types";
import {
  normalizeTabletopViewOrientation,
  TABLETOP_CAMERA_PRESETS,
  type TabletopViewOrientation,
} from "@/lib/tabletop/tabletop-projection";

export function TabletopViewBar({
  snapshot,
  projection,
  orientation,
  editable,
  fullscreen,
  canFullscreen,
  onFullscreen,
  engine,
  onProjection,
  onOrientation,
  onEdit,
}: {
  snapshot: TabletopSnapshot;
  projection: "plan" | "isometric";
  orientation: TabletopViewOrientation;
  editable: boolean;
  fullscreen: boolean;
  canFullscreen: boolean;
  onFullscreen: () => void;
  engine: () => TabletopEngine | null;
  onProjection: (value: "plan" | "isometric") => void;
  onOrientation: (value: TabletopViewOrientation) => void;
  onEdit: () => void;
}) {
  const currentPreset =
    TABLETOP_CAMERA_PRESETS.find(
      (p) =>
        Math.abs(p.orientation.yaw - orientation.yaw) < 0.1 &&
        Math.abs(p.orientation.tilt - orientation.tilt) < 0.001 &&
        Math.abs(p.orientation.elevationScale - orientation.elevationScale) < 0.001,
    )?.id ?? "custom";
  return (
    <div className="tadeon-tabletop-viewbar" aria-label="Visão e encaixe do tabuleiro">
      <div className="tadeon-tabletop-viewbar__camera" role="group" aria-label="Câmera">
        <SelectionGroup
          className="tadeon-tabletop-viewbar__projection"
          aria-label="Projeção da cena"
          activeKey={projection}
          selector='button[aria-pressed="true"]'
        >
          <button
            data-material-surface="view-mode"
            type="button"
            aria-pressed={projection === "plan"}
            onClick={() => onProjection("plan")}
          >
            2D
          </button>
          <button
            data-material-surface="view-mode"
            type="button"
            aria-pressed={projection === "isometric"}
            onClick={() => onProjection("isometric")}
          >
            <Axis3d aria-hidden="true" />
            3D
          </button>
        </SelectionGroup>
        <Select
          value={projection === "plan" ? "plan" : currentPreset}
          onValueChange={(value) => {
            if (value === "plan") {
              onProjection("plan");
              return;
            }
            const preset = TABLETOP_CAMERA_PRESETS.find((p) => p.id === value);
            if (preset) {
              onOrientation(normalizeTabletopViewOrientation(preset.orientation));
              onProjection("isometric");
            }
          }}
        >
          <SelectTrigger
            className="tadeon-tabletop-viewbar__preset"
            aria-label="Enquadramento da câmera"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="tadeon-tabletop-camera-menu">
            <SelectItem value="plan">Planta</SelectItem>
            {TABLETOP_CAMERA_PRESETS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled>
              Personalizado
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="outline"
          aria-label="Girar câmera 90 graus"
          title="Girar câmera 90 graus"
          disabled={projection !== "isometric"}
          onClick={() =>
            onOrientation(
              normalizeTabletopViewOrientation({ ...orientation, yaw: orientation.yaw + 90 }),
            )
          }
        >
          <RotateCw aria-hidden="true" />
        </Button>
      </div>
      <div
        className="tadeon-tabletop-viewbar__framing"
        role="group"
        aria-label="Enquadramento e grade"
      >
        <Button
          size="icon"
          variant="outline"
          aria-label="Ajustar mapa à tela"
          title="Ajustar mapa à tela"
          onClick={() => engine()?.fitToScreen()}
        >
          <ScanLine aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          aria-label="Enquadrar peças selecionadas"
          title="Enquadrar peças selecionadas"
          disabled={!snapshot.selectedIds.length}
          onClick={() => engine()?.focusSelection()}
        >
          <Focus aria-hidden="true" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="tadeon-tabletop-viewbar__snap"
          aria-label="Alternar encaixe na grade"
          title="Alternar encaixe na grade"
          aria-pressed={snapshot.scene.snap}
          disabled={!editable || snapshot.scene.gridMode === "none"}
          onClick={() => engine()?.setSnap(!snapshot.scene.snap)}
        >
          <Grid2X2 aria-hidden="true" />
          <span>Encaixe</span>
        </Button>
      </div>
      <div
        className="tadeon-tabletop-viewbar__actions"
        role="group"
        aria-label="Histórico e editor"
      >
        <div className="tadeon-tabletop-viewbar__history">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Desfazer edição da cena"
            title="Desfazer edição da cena"
            disabled={!editable || !snapshot.canUndo}
            onClick={() => engine()?.undo()}
          >
            <Undo2 aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refazer edição da cena"
            title="Refazer edição da cena"
            disabled={!editable || !snapshot.canRedo}
            onClick={() => engine()?.redo()}
          >
            <Redo2 aria-hidden="true" />
          </Button>
        </div>
        <Button
          className="tadeon-tabletop-viewbar__editor"
          size="sm"
          variant="outline"
          onClick={onEdit}
          aria-label={snapshot.selectedIds.length ? "Editar seleção" : "Editor"}
          title={snapshot.selectedIds.length ? "Editar seleção" : "Abrir editor"}
        >
          <PanelRightOpen aria-hidden="true" />
          <span>{snapshot.selectedIds.length ? "Editar seleção" : "Editor"}</span>
        </Button>
        {canFullscreen && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={fullscreen ? "Sair da tela inteira" : "Expandir tabuleiro em tela inteira"}
            onClick={onFullscreen}
          >
            {fullscreen ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
          </Button>
        )}
      </div>
    </div>
  );
}
