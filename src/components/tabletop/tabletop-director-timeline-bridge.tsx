import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clapperboard, Plus, Play, Trash2, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import {
  applyTabletopDirectorCue,
  type TabletopDirectorCue,
  type TabletopDirectorState,
} from "@/lib/tabletop/tabletop-director-state";
import { currentTabletopRuntime } from "@/lib/tabletop/tabletop-player-runtime";
import {
  tabletopSessionService,
  type TabletopSession,
  type TabletopSessionParticipant,
} from "@/lib/tabletop/tabletop-session-service";
import { tabletopVisibilityService } from "@/lib/tabletop/tabletop-visibility-service";
import type { TabletopScene } from "@/lib/tabletop/types";
import "@/styles/tabletop-director-timeline.css";

type SceneWithCampaign = TabletopScene & { campaignId?: string };

async function cueFromCurrent(state: TabletopDirectorState): Promise<TabletopDirectorCue | null> {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const camera = runtime.engine.directorCamera();
  const scene = runtime.snapshot().scene;
  const visibility = await tabletopVisibilityService.load(scene.id).catch(() => null);
  return {
    id: crypto.randomUUID(),
    label: `Cue ${state.cues.length + 1}`,
    durationMs: 3000,
    transition: "fade",
    mode: state.mode,
    title: state.title,
    subtitle: state.subtitle,
    showGrid: state.showGrid,
    showHud: state.showHud,
    camera,
    globalIllumination: visibility?.globalIllumination,
    fogEnabled: visibility?.fogEnabled,
  };
}

export function TabletopDirectorTimelineBridge() {
  const { user } = useAuth();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [session, setSession] = useState<TabletopSession | null>(null);
  const [participants, setParticipants] = useState<TabletopSessionParticipant[]>([]);
  const [busy, setBusy] = useState(false);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const autoTimer = useRef(0);
  const executeCueRef = useRef<(cue: TabletopDirectorCue, schedule?: boolean) => Promise<void>>(
    async () => undefined,
  );

  const runtime = currentTabletopRuntime();
  const scene = runtime?.snapshot().scene as SceneWithCampaign | undefined;
  const campaignId = scene?.campaignId;

  useEffect(() => {
    let stopped = false;
    let timer = 0;
    const syncTarget = () => {
      if (stopped) return;
      setTarget(document.querySelector<HTMLElement>(".tadeon-director-remote"));
      timer = window.setTimeout(syncTarget, 600);
    };
    syncTarget();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setSession(null);
      setParticipants([]);
      return;
    }
    const next = await tabletopSessionService.findOpenSession(campaignId);
    setSession(next);
    setParticipants(next ? await tabletopSessionService.listParticipants(next.id) : []);
  }, [campaignId]);

  useEffect(() => {
    void refresh().catch(() => undefined);
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 4500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const currentParticipant = useMemo(
    () =>
      participants.find(
        (participant) => participant.userId === user?.id && participant.state === "active",
      ),
    [participants, user?.id],
  );

  const saveState = useCallback(
    async (next: TabletopDirectorState, success?: string) => {
      if (!session || busy) return null;
      setBusy(true);
      try {
        const revision = await tabletopSessionService.setDirectorState(
          session.id,
          next,
          session.version,
        );
        window.dispatchEvent(
          new CustomEvent("tadeon-tabletop-director-state-saved", {
            detail: { sessionId: session.id, revision },
          }),
        );
        await refresh();
        if (success) toast.success(success);
        return revision;
      } catch {
        await refresh().catch(() => undefined);
        toast.error(
          "A direção mudou em outra janela. Atualizei a timeline para evitar sobrescrita.",
        );
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, session],
  );

  const executeCue = useCallback(
    async (cue: TabletopDirectorCue, schedule = true) => {
      if (!session) return;
      const next = applyTabletopDirectorCue(session.directorState, cue);
      const currentRuntime = currentTabletopRuntime();
      const currentScene = currentRuntime?.snapshot().scene;
      if (
        currentRuntime &&
        currentScene &&
        (cue.globalIllumination !== undefined || cue.fogEnabled !== undefined)
      ) {
        try {
          const visibility = await tabletopVisibilityService.load(currentScene.id);
          const saved = await tabletopVisibilityService.save(currentScene.id, {
            ...visibility,
            globalIllumination:
              cue.globalIllumination ?? visibility.globalIllumination,
            fogEnabled: cue.fogEnabled ?? visibility.fogEnabled,
          });
          currentRuntime.engine.setVisibility(saved.visibility, true);
        } catch {
          toast.error("O cue foi preparado, mas luz/fog mudou em outra janela.");
          return;
        }
      }
      const revision = await saveState(next, `Cue “${cue.label}” transmitido.`);
      if (!revision || !schedule || !next.autoAdvance || cue.durationMs <= 0) return;
      window.clearTimeout(autoTimer.current);
      autoTimer.current = window.setTimeout(() => {
        void tabletopSessionService.findOpenSession(session.campaignId).then((latest) => {
          if (!latest) return;
          const index = latest.directorState.cues.findIndex((item) => item.id === cue.id);
          const following = latest.directorState.cues[index + 1];
          if (following) void executeCueRef.current(following, true);
        });
      }, cue.durationMs);
    },
    [saveState, session],
  );

  useEffect(() => {
    executeCueRef.current = executeCue;
  }, [executeCue]);

  useEffect(() => {
    const runCue = (event: Event) => {
      const cueId = (event as CustomEvent<{ cueId?: string }>).detail?.cueId;
      if (!cueId || !session) return;
      const cue = session.directorState.cues.find((item) => item.id === cueId);
      if (cue) void executeCueRef.current(cue, true);
    };
    window.addEventListener("tadeon-tabletop-director-run-cue", runCue);
    return () => window.removeEventListener("tadeon-tabletop-director-run-cue", runCue);
  }, [session]);

  useEffect(
    () => () => window.clearTimeout(autoTimer.current),
    [],
  );

  if (!target || !session || !currentParticipant) return null;
  if (currentParticipant.role !== "master" && currentParticipant.role !== "co_master") return null;

  const state = session.directorState;
  const addCue = async () => {
    if (busy) return;
    const cue = await cueFromCurrent(state);
    if (!cue) return;
    await saveState(
      { ...state, cues: [...state.cues, cue] },
      "Enquadramento, luz e fog adicionados à timeline.",
    );
  };
  const replaceCue = (id: string, patch: Partial<TabletopDirectorCue>) =>
    saveState({
      ...state,
      cues: state.cues.map((cue) =>
        cue.id === id ? { ...cue, ...patch, id: cue.id } : cue,
      ),
    });
  const commitLabel = (cue: TabletopDirectorCue, fallbackIndex: number) => {
    const value = (draftLabels[cue.id] ?? cue.label).trim() || `Cue ${fallbackIndex + 1}`;
    setDraftLabels((current) => {
      const next = { ...current };
      delete next[cue.id];
      return next;
    });
    if (value !== cue.label) void replaceCue(cue.id, { label: value });
  };
  const removeCue = (id: string) => {
    void saveState({
      ...state,
      cues: state.cues.filter((cue) => cue.id !== id),
      activeCueId: state.activeCueId === id ? null : state.activeCueId,
    });
  };

  return createPortal(
    <section className="tadeon-director-timeline" aria-label="Timeline de direção">
      <header>
        <span><Clapperboard aria-hidden="true" /></span>
        <div><small>Sequência da sessão</small><strong>Cues de direção</strong></div>
        <Button size="sm" variant="outline" onClick={() => void addCue()} disabled={busy}>
          <Plus /> Capturar atual
        </Button>
      </header>
      <label className="tadeon-director-timeline__auto">
        <TimerReset aria-hidden="true" />
        <span><strong>Avanço automático</strong><small>Respeita a duração de cada cue.</small></span>
        <Switch
          checked={state.autoAdvance}
          disabled={busy}
          onCheckedChange={(autoAdvance) => void saveState({ ...state, autoAdvance })}
        />
      </label>
      <div className="tadeon-director-timeline__list">
        {state.cues.length === 0 ? (
          <p>Capture a câmera atual para começar uma sequência.</p>
        ) : (
          state.cues.map((cue, index) => (
            <article key={cue.id} data-active={state.activeCueId === cue.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <Input
                  value={draftLabels[cue.id] ?? cue.label}
                  maxLength={120}
                  disabled={busy}
                  onChange={(event) =>
                    setDraftLabels((current) => ({
                      ...current,
                      [cue.id]: event.target.value,
                    }))
                  }
                  onBlur={() => commitLabel(cue, index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <div>
                  <select
                    value={cue.transition}
                    disabled={busy}
                    onChange={(event) =>
                      void replaceCue(cue.id, {
                        transition: event.target.value as TabletopDirectorCue["transition"],
                      })
                    }
                    aria-label={`Transição do cue ${index + 1}`}
                  >
                    <option value="cut">Corte</option>
                    <option value="fade">Fade</option>
                    <option value="orbit">Órbita</option>
                  </select>
                  <Input
                    type="number"
                    min={0}
                    max={600}
                    step={0.5}
                    value={cue.durationMs / 1000}
                    disabled={busy}
                    onChange={(event) => {
                      const seconds = Math.max(0, Math.min(600, Number(event.target.value)));
                      if (Number.isFinite(seconds))
                        void replaceCue(cue.id, { durationMs: Math.round(seconds * 1000) });
                    }}
                    aria-label={`Duração do cue ${index + 1} em segundos`}
                  />
                </div>
              </div>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => void executeCue(cue)}
                disabled={busy}
                aria-label={`Executar ${cue.label}`}
              >
                <Play />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeCue(cue.id)}
                disabled={busy}
                aria-label={`Remover ${cue.label}`}
              >
                <Trash2 />
              </Button>
            </article>
          ))
        )}
      </div>
    </section>,
    target,
  );
}
