import { useEffect, useState } from "react";
import {
  Aperture,
  Axis3d,
  Camera,
  Grid2X2,
  Loader2,
  Moon,
  MonitorUp,
  Projector,
  RotateCcw,
  RotateCw,
  Scan,
  Sparkles,
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

  useEffect(() => setDraft(session.directorState), [session.directorState]);

  const persist = async (
    next = draft,
    success = "Saída do Diretor atualizada.",
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
      await onSaved();
      await broadcastRevision(revision).catch(() => undefined);
      toast.success(success);
    } catch {
      toast.error(
        "A saída mudou em outra janela. Atualize a sala e tente novamente.",
      );
      await onSaved().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const persistCamera = (
    patch: Partial<TabletopDirectorCamera>,
    success: string,
  ) => {
    const next = {
      ...draft,
      mode: "scene" as const,
      camera: { ...draft.camera, ...patch },
    };
    setDraft(next);
    void persist(next, success);
  };

  const setMode = (mode: typeof draft.mode) => {
    const next = { ...draft, mode };
    setDraft(next);
    void persist(
      next,
      mode === "blackout"
        ? "Blackout enviado para a projeção."
        : mode === "intermission"
          ? "Tela de intervalo enviada."
          : "Cena devolvida à projeção.",
    );
  };

  const captureCamera = () => {
    const camera = getCurrentCamera?.();
    if (!camera) {
      toast.error("A câmera da cena ainda não está pronta para captura.");
      return;
    }
    const next = { ...draft, mode: "scene" as const, camera };
    setDraft(next);
    void persist(next, "Enquadramento atual enviado à projeção.");
  };

  return (
    <section
      className="tadeon-director-remote"
      aria-label="Controle do Diretor"
    >
      <div className="tadeon-director-remote__head">
        <span>
          <Projector aria-hidden="true" />
        </span>
        <div>
          <small>Saída independente</small>
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

      <div className="tadeon-director-remote__modes" role="group">
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
            setDraft((current) => ({ ...current, title: event.target.value }))
          }
        />
        <Input
          value={draft.subtitle}
          maxLength={320}
          placeholder="Subtítulo opcional"
          onChange={(event) =>
            setDraft((current) => ({
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
          onClick={() => {
            const next = {
              ...draft,
              mode: "scene" as const,
              camera: { ...draft.camera, mode: "fit" as const },
            };
            setDraft(next);
            void persist(next, "Cena ajustada à saída completa.");
          }}
        >
          <Scan aria-hidden="true" /> Ajustar à tela
        </Button>
        <button
          type="button"
          aria-pressed={draft.camera.projection === "isometric"}
          disabled={saving}
          onClick={() => {
            const projection =
              draft.camera.projection === "plan" ? "isometric" : "plan";
            persistCamera(
              { projection },
              projection === "isometric"
                ? "Projeção 3D ativada na saída."
                : "Projeção devolvida à planta 2D.",
            );
          }}
        >
          <Axis3d aria-hidden="true" />
          {draft.camera.projection === "isometric" ? "3D isométrico" : "Planta 2D"}
        </button>
      </div>

      {draft.camera.projection === "isometric" && (
        <div
          className="tadeon-director-remote__orbit"
          role="group"
          aria-label="Rotação da câmera 3D da projeção"
        >
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              persistCamera(
                { yaw: (draft.camera.yaw + 315) % 360 },
                "Projeção 3D girada para a esquerda.",
              )
            }
          >
            <RotateCcw aria-hidden="true" /> Girar esquerda
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            onClick={() =>
              persistCamera(
                { yaw: (draft.camera.yaw + 45) % 360 },
                "Projeção 3D girada para a direita.",
              )
            }
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
              setDraft((current) => ({ ...current, showGrid }))
            }
          />
        </label>
        <label>
          <MonitorUp aria-hidden="true" />
          <span>Identidade da cena</span>
          <Switch
            checked={draft.showHud}
            onCheckedChange={(showHud) =>
              setDraft((current) => ({ ...current, showHud }))
            }
          />
        </label>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="w-full"
        disabled={saving}
        onClick={() => void persist()}
      >
        {saving ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <Projector aria-hidden="true" />
        )}
        Aplicar composição
      </Button>
    </section>
  );
}
