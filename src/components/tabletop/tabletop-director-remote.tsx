import { useEffect, useMemo, useState } from "react";
import {
  Aperture,
  Axis3d,
  Camera,
  Eye,
  Grid2X2,
  Loader2,
  Moon,
  MonitorUp,
  Projector,
  Radio,
  RotateCcw,
  RotateCw,
  Scan,
  Send,
  Sparkles,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { TabletopDirectorCamera } from "@/lib/tabletop/tabletop-director-state";
import type { TabletopSession } from "@/lib/tabletop/tabletop-session-service";
import { tabletopSessionService } from "@/lib/tabletop/tabletop-session-service";
import "@/styles/tabletop-director-remote.css";
import "@/styles/interface-stability.css";

function sameComposition(left: TabletopSession["directorState"], right: TabletopSession["directorState"]) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function TabletopDirectorRemote({
  session,
  getCurrentCamera,
  onSaved,
  broadcastRevision,
}: {
  session: TabletopSession;
  getCurrentCamera?: () => TabletopDirectorCamera | null | undefined;
  onSaved: () => Promise<void>;
  broadcastRevision: (revision: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(session.directorState);
  const [saving, setSaving] = useState(false);
  const [localDirty, setLocalDirty] = useState(false);

  useEffect(() => {
    if (!localDirty) setDraft(session.directorState);
  }, [localDirty, session.directorState]);

  const dirty = useMemo(
    () => !sameComposition(draft, session.directorState),
    [draft, session.directorState],
  );

  const updateDraft = (
    updater:
      | TabletopSession["directorState"]
      | ((current: TabletopSession["directorState"]) => TabletopSession["directorState"]),
  ) => {
    setLocalDirty(true);
    setDraft((current) =>
      typeof updater === "function" ? updater(current) : updater,
    );
  };

  const transmit = async (
    next = draft,
    success = "Composição transmitida para a saída do Diretor.",
  ) => {
    if (saving) return;
    setSaving(true);
    try {
      const revision = await tabletopSessionService.setDirectorState(
        session.id,
        next,
        session.version,
      );
      setDraft(next);
      setLocalDirty(false);
      await onSaved();
      await broadcastRevision(revision).catch(() => undefined);
      toast.success(success);
    } catch {
      toast.error(
        "A saída mudou em outra janela. Atualizei a referência; revise a prévia antes de transmitir novamente.",
      );
      setLocalDirty(false);
      await onSaved().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const stageCamera = (patch: Partial<TabletopDirectorCamera>) => {
    updateDraft((current) => ({
      ...current,
      mode: "scene" as const,
      camera: { ...current.camera, ...patch },
    }));
  };

  const setMode = (mode: typeof draft.mode) => {
    updateDraft((current) => ({ ...current, mode }));
  };

  const captureCamera = () => {
    const camera = getCurrentCamera?.();
    if (!camera) {
      toast.error("A câmera da cena ainda não está pronta para captura.");
      return;
    }
    updateDraft((current) => ({ ...current, mode: "scene" as const, camera }));
    toast.message("Enquadramento capturado na prévia. Nada foi transmitido ainda.");
  };

  const discardDraft = () => {
    setDraft(session.directorState);
    setLocalDirty(false);
  };

  const emergencyBlackout = () => {
    const next = { ...session.directorState, mode: "blackout" as const };
    setDraft(next);
    setLocalDirty(false);
    void transmit(next, "Blackout enviado imediatamente para a projeção.");
  };

  const modeLabel =
    draft.mode === "blackout" ? "Blackout" : draft.mode === "intermission" ? "Intervalo" : "Cena";
  const liveModeLabel =
    session.directorState.mode === "blackout"
      ? "Blackout"
      : session.directorState.mode === "intermission"
        ? "Intervalo"
        : "Cena";

  return (
    <section
      className="tadeon-director-remote"
      data-dirty={dirty}
      aria-label="Controle do Diretor"
    >
      <div className="tadeon-director-remote__head">
        <span>
          <Projector aria-hidden="true" />
        </span>
        <div>
          <small>Preparar primeiro · transmitir depois</small>
          <strong>Câmera do Diretor</strong>
        </div>
        <Button size="sm" variant="outline" asChild>
          <a
            href={`/tabletop?view=director&session=${encodeURIComponent(session.id)}`}
            target="_blank"
            rel="noreferrer"
          >
            <MonitorUp aria-hidden="true" /> Abrir projeção
          </a>
        </Button>
      </div>

      <div className="tadeon-director-remote__statebar">
        <span className="is-live"><Radio aria-hidden="true" /> Ao vivo: {liveModeLabel}</span>
        <span className={dirty ? "is-draft" : ""}><Eye aria-hidden="true" /> Prévia: {modeLabel}</span>
        {dirty && <strong>não transmitida</strong>}
      </div>

      <div className="tadeon-director-remote__preview" data-mode={draft.mode} data-projection={draft.camera.projection}>
        <div className="tadeon-director-remote__preview-frame">
          <span className="tadeon-director-remote__preview-grid" data-visible={draft.showGrid} />
          <span className="tadeon-director-remote__preview-orbit" style={{ transform: `rotate(${draft.camera.yaw}deg)` }} />
          {draft.mode === "blackout" ? (
            <div className="tadeon-director-remote__preview-message"><Moon aria-hidden="true" /><strong>Blackout</strong></div>
          ) : draft.mode === "intermission" ? (
            <div className="tadeon-director-remote__preview-message"><Sparkles aria-hidden="true" /><strong>{draft.title || "Intervalo"}</strong><small>{draft.subtitle || "Tela de pausa"}</small></div>
          ) : (
            <div className="tadeon-director-remote__preview-scene">
              <Scan aria-hidden="true" />
              <span>{draft.camera.projection === "isometric" ? "Cena 3D" : "Planta 2D"}</span>
              {draft.showHud && <small>{draft.title || "Identidade da cena"}</small>}
            </div>
          )}
        </div>
        <small>Prévia de composição ~ a saída pública continua inalterada até Transmitir.</small>
      </div>

      <div className="tadeon-director-remote__modes" role="group" aria-label="Modo preparado">
        <button
          type="button"
          className={draft.mode === "scene" ? "is-active" : ""}
          disabled={saving}
          onClick={() => setMode("scene")}
        >
          <Camera aria-hidden="true" /> Cena
        </button>
        <button
          type="button"
          className={draft.mode === "intermission" ? "is-active" : ""}
          disabled={saving}
          onClick={() => setMode("intermission")}
        >
          <Sparkles aria-hidden="true" /> Intervalo
        </button>
        <button
          type="button"
          className={draft.mode === "blackout" ? "is-active" : ""}
          disabled={saving}
          onClick={() => setMode("blackout")}
        >
          <Moon aria-hidden="true" /> Blackout
        </button>
      </div>

      <div className="tadeon-director-remote__copy">
        <Input
          value={draft.title}
          maxLength={160}
          placeholder="Título opcional para intervalo ou HUD"
          onChange={(event) =>
            updateDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
        <Input
          value={draft.subtitle}
          maxLength={320}
          placeholder="Subtítulo opcional"
          onChange={(event) =>
            updateDraft((current) => ({
              ...current,
              subtitle: event.target.value,
            }))
          }
        />
      </div>

      <div className="tadeon-director-remote__camera">
        <Button
          size="sm"
          onClick={captureCamera}
          disabled={saving || !getCurrentCamera}
        >
          <Aperture aria-hidden="true" /> Capturar câmera atual
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving}
          onClick={() =>
            updateDraft((current) => ({
              ...current,
              mode: "scene" as const,
              camera: { ...current.camera, mode: "fit" as const },
            }))
          }
        >
          <Scan aria-hidden="true" /> Ajustar à tela
        </Button>
        <button
          type="button"
          aria-pressed={draft.camera.projection === "isometric"}
          disabled={saving}
          onClick={() =>
            stageCamera({
              projection: draft.camera.projection === "plan" ? "isometric" : "plan",
            })
          }
        >
          <Axis3d aria-hidden="true" />
          {draft.camera.projection === "isometric" ? "3D isométrico" : "Planta 2D"}
        </button>
      </div>

      {draft.camera.projection === "isometric" && (
        <div
          className="tadeon-director-remote__orbit"
          role="group"
          aria-label="Rotação da câmera 3D da prévia"
        >
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => stageCamera({ yaw: (draft.camera.yaw + 315) % 360 })}
          >
            <RotateCcw aria-hidden="true" /> Girar esquerda
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() => stageCamera({ yaw: (draft.camera.yaw + 45) % 360 })}
          >
            <RotateCw aria-hidden="true" /> Girar direita
          </Button>
        </div>
      )}

      <div className="tadeon-director-remote__toggles">
        <label>
          <Grid2X2 aria-hidden="true" />
          <span>Grade na saída</span>
          <Switch
            checked={draft.showGrid}
            onCheckedChange={(showGrid) =>
              updateDraft((current) => ({ ...current, showGrid }))
            }
          />
        </label>
        <label>
          <MonitorUp aria-hidden="true" />
          <span>Identidade da cena</span>
          <Switch
            checked={draft.showHud}
            onCheckedChange={(showHud) =>
              updateDraft((current) => ({ ...current, showHud }))
            }
          />
        </label>
      </div>

      <div className="tadeon-director-remote__publish">
        <Button
          size="sm"
          variant="ghost"
          disabled={saving || !dirty}
          onClick={discardDraft}
        >
          <Undo2 aria-hidden="true" /> Descartar
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={saving || session.directorState.mode === "blackout"}
          onClick={emergencyBlackout}
        >
          <Moon aria-hidden="true" /> Blackout agora
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={saving || !dirty}
          onClick={() => void transmit()}
        >
          {saving ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
          Transmitir composição
        </Button>
      </div>
    </section>
  );
}
