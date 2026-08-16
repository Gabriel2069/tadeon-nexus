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
import { useTabletopRealtime } from "@/lib/tabletop/use-tabletop-realtime";
import "@/styles/tabletop-director-timeline.css";

type PersistedSceneHints = { campaignId?: string };

function cueFromCurrent(state: TabletopDirectorState): TabletopDirectorCue | null {
  const runtime = currentTabletopRuntime();
  if (!runtime) return null;
  const camera = runtime.engine.directorCamera();
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
  };
}

export function TabletopDirectorTimelineBridge() {
  const { user, profile } = useAuth();
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [session, setSession] = useState<TabletopSession | null>(null);
  const [participants, setParticipants] = useState<TabletopSessionParticipant[]>([]);
  const [busy, setBusy] = useState(false);
  const autoTimer = useRef(0);

  const runtime = currentTabletopRuntime();
  const scene = runtime?.snapshot().scene as
    | (ReturnType<NonNullable<typeof currentTabletopRuntime>["snapshot"]>["scene"] & PersistedSceneHints)
    | undefined;
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
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 3500);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const currentParticipant = participants.find(
    (participant) => participant.userId === user?.id && participant.state === "active",
  );
  const presence = useMemo(() => {
    if (!user?.id || !session?.currentSceneId || !currentParticipant) return null;
    return {
      userId: user.id,
      displayName: profile?.full_name || user.email?.split("@")[0] || "Mestre",
      role: currentParticipant.role,
      sceneId: session.currentSceneId,
      controlledTokenId: null,
      state: "connected" as const,
      color: "#d9d7a4",
      updatedAt: Date.now(),
    };
  }, [currentParticipant, profile?.full_name, session?.currentSceneId, user?.email, user?.id]);

  const realtime = useTabletopRealtime({
    enabled: Boolean(session && currentParticipant && presence),
    sessionId: session?.id,
    sceneId: session?.currentSceneId,
    presence,
    onEvent: () => undefined,
  });

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
        await realtime.broadcastDirectorState(revision).catch(() => undefined);
        await refresh();
        if (success) toast.success(success);
        return revision;
      } catch {
        await refresh().catch(() => undefined);
        toast.error("A direção mudou em outra janela. Atualizei a timeline para evitar sobrescrita.");
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, realtime, refresh, session],
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
        void refresh().then(async () => {
          const latest = await tabletopSessionService.findOpenSession(session.campaignId);
          if (!latest) return;
          const index = latest.directorState.cues.findIndex((item) => item.id === cue.id);
          const following = latest.directorState.cues[index + 1];
          if (following) await executeCue(following, true);
        });
      }, cue.durationMs);
    },
    [refresh, saveState, session],
  );

  useEffect(
    () => () => window.clearTimeout(autoTimer.current),
    [],
  );

  if (!target || !session || !currentParticipant) return null;
  if (currentParticipant.role !== "master" && currentParticipant.role !== "co_master") return null;

  const state = session.directorState;
  const addCue = () => {
    const cue = cueFromCurrent(state);
    if (!cue) return;
    void saveState({ ...state, cues: [...state.cues, cue] }, "Enquadramento adicionado à timeline.");
  };
  const replaceCue = (id: string, patch: Partial<TabletopDirectorCue>) => {
    void saveState({
      ...state,
      cues: state.cues.map((cue) => (cue.id === id ? { ...cue, ...patch, id: cue.id } : cue)),
    });
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
        <Button size="sm" variant="outline" onClick={addCue} disabled={busy}>
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
                  value={cue.label}
                  maxLength={120}
                  disabled={busy}
                  onChange={(event) => replaceCue(cue.id, { label: event.target.value || `Cue ${index + 1}` })}
                />
                <div>
                  <select
                    value={cue.transition}
                    disabled={busy}
                    onChange={(event) => replaceCue(cue.id, { transition: event.target.value as TabletopDirectorCue["transition"] })}
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
                    onChange={(event) => replaceCue(cue.id, { durationMs: Math.max(0, Math.min(600000, Number(event.target.value) * 1000)) })}
                    aria-label={`Duração do cue ${index + 1} em segundos`}
                  />
                </div>
              </div>
              <Button size="icon" variant="secondary" onClick={() => void executeCue(cue)} disabled={busy} aria-label={`Executar ${cue.label}`}>
                <Play />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => removeCue(cue.id)} disabled={busy} aria-label={`Remover ${cue.label}`}>
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
