import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Expand,
  Loader2,
  Moon,
  Projector,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark, ThreadField } from "@/components/brand-mark";
import { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import { useAuth } from "@/lib/auth";
import {
  TabletopParticipantError,
  tabletopParticipantService,
  type TabletopParticipantView,
} from "@/lib/tabletop/tabletop-participant-service";
import type { TabletopRealtimeEvent } from "@/lib/tabletop/realtime-protocol";
import { useTabletopRealtime } from "@/lib/tabletop/use-tabletop-realtime";
import { createEmptyVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";
import "@/styles/tabletop-director.css";

function directorError(error: unknown) {
  if (error instanceof TabletopParticipantError) {
    if (error.code === "TABLETOP_PARTICIPANT_FORBIDDEN")
      return "Esta conta não está ativa na sala ou não pode usar a saída.";
    if (error.code === "TABLETOP_PARTICIPANT_NOT_FOUND")
      return "A sala foi encerrada ou não está mais disponível.";
  }
  return "A saída protegida não pôde sincronizar a cena.";
}

export function TabletopDirectorWorkspace({
  sessionId,
  realtimeEnabled,
}: {
  sessionId?: string;
  realtimeEnabled: boolean;
}) {
  const { user, profile } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TabletopEngine | null>(null);
  const previousCueId = useRef<string | null>(null);
  const transitionTimer = useRef(0);
  const [view, setView] = useState<TabletopParticipantView | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [presenceStartedAt] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (!sessionId) {
      setView(null);
      setError("Abra esta saída pelo controle da sala do mestre.");
      setLoading(false);
      return;
    }
    try {
      const next = await tabletopParticipantService.load(sessionId);
      if (
        next.participant.role !== "master" &&
        next.participant.role !== "co_master"
      ) {
        setView(null);
        setError("Somente mestre ou co-mestre pode abrir a saída do Diretor.");
        return;
      }
      setView(next);
      setError(null);
    } catch (cause) {
      setView(null);
      setError(directorError(cause));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new TabletopEngine();
    engineRef.current = engine;
    let active = true;
    void engine
      .init(host)
      .then(() => {
        if (!active) return;
        engine.setReadOnly(true);
        setEngineReady(true);
      })
      .catch(() => {
        if (active) setError("O motor gráfico não pôde iniciar nesta saída.");
      });
    return () => {
      active = false;
      engineRef.current = null;
      void engine.destroy();
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    void load();
    const refreshOnFocus = () => void load();
    window.addEventListener("focus", refreshOnFocus);
    return () => window.removeEventListener("focus", refreshOnFocus);
  }, [load]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine || !engineReady || !view?.scene) return;
    const state = view.session.directorState;
    engine.loadScene(view.scene);
    engine.setVisibility(
      view.visibility ?? createEmptyVisibilityState(),
      false,
    );
    engine.setReadOnly(true);
    engine.setGridVisible(state.showGrid);
    engine.applyDirectorCamera(state.camera);
  }, [engineReady, view]);

  const state = view?.session.directorState;
  const activeCue = useMemo(
    () => state?.cues.find((cue) => cue.id === state.activeCueId) ?? null,
    [state?.activeCueId, state?.cues],
  );

  useEffect(() => {
    const cueId = activeCue?.id ?? null;
    if (!cueId || cueId === previousCueId.current) return;
    previousCueId.current = cueId;
    window.clearTimeout(transitionTimer.current);
    setTransitioning(false);
    window.requestAnimationFrame(() => {
      setTransitioning(true);
      const duration = Math.max(180, Math.min(1400, Math.round((activeCue?.durationMs ?? 900) * 0.28)));
      transitionTimer.current = window.setTimeout(() => setTransitioning(false), duration);
    });
  }, [activeCue]);

  useEffect(
    () => () => window.clearTimeout(transitionTimer.current),
    [],
  );

  const onRealtimeEvent = useCallback(
    (event: TabletopRealtimeEvent) => {
      if (event.type === "token.move-commit") {
        engineRef.current?.applyRemoteEntityPatch(event.payload.entityId, {
          x: event.payload.x,
          y: event.payload.y,
        });
        return;
      }
      if (
        event.type === "director.state" ||
        event.type === "scene.transition" ||
        event.type === "structure.state"
      ) {
        void load();
      }
    },
    [load],
  );

  const presence = useMemo(
    () =>
      user && view?.scene
        ? {
            userId: user.id,
            displayName: (
              profile?.full_name?.trim() ||
              profile?.email?.split("@")[0] ||
              "Diretor"
            ).slice(0, 80),
            role: view.participant.role,
            sceneId: view.scene.id,
            controlledTokenId: null,
            state: "connected" as const,
            color: "#d9d7a4",
            updatedAt: presenceStartedAt,
          }
        : null,
    [
      presenceStartedAt,
      profile?.email,
      profile?.full_name,
      user,
      view?.participant.role,
      view?.scene,
    ],
  );

  const realtime = useTabletopRealtime({
    enabled: realtimeEnabled && Boolean(view?.scene),
    sessionId,
    sceneId: view?.scene?.id,
    presence,
    onEvent: onRealtimeEvent,
  });

  const title = state?.title || view?.scene?.name || "Mesa Nexus";
  const subtitle = state?.subtitle || view?.session.name || "Saída do Diretor";

  return (
    <main
      className={`tadeon-director-output is-${state?.mode ?? "loading"}${transitioning ? " is-transitioning" : ""}`}
      data-transition={activeCue?.transition ?? "cut"}
      data-active-cue={activeCue?.id ?? undefined}
      aria-live="polite"
    >
      <ThreadField />
      <div
        ref={hostRef}
        className="tadeon-director-output__canvas"
        aria-hidden={state?.mode !== "scene"}
      />

      {state?.mode === "blackout" && (
        <div className="tadeon-director-output__blackout">
          <Moon aria-hidden="true" />
        </div>
      )}

      {state?.mode === "intermission" && (
        <div className="tadeon-director-output__intermission">
          <span>
            <Sparkles aria-hidden="true" /> Intervalo
          </span>
          <BrandMark className="tadeon-director-output__brand" />
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      )}

      {state?.mode === "scene" && state.showHud && (
        <div className="tadeon-director-output__hud">
          <small>{view?.session.name}</small>
          <strong>{title}</strong>
          {state.subtitle && <span>{state.subtitle}</span>}
        </div>
      )}

      {(loading || error || !view?.scene) && state?.mode !== "blackout" && (
        <div className="tadeon-director-output__status">
          {loading ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : error ? (
            <ShieldCheck aria-hidden="true" />
          ) : (
            <Projector aria-hidden="true" />
          )}
          <strong>
            {loading
              ? "Sincronizando a saída…"
              : error || "Aguardando uma cena transmitida"}
          </strong>
          {error && (
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCw aria-hidden="true" /> Tentar novamente
            </Button>
          )}
        </div>
      )}

      <div className="tadeon-director-output__controls">
        <span
          className={`is-${realtime.connectionState}`}
          title={`Realtime: ${realtime.connectionState}`}
        />
        <Button
          size="icon"
          variant="ghost"
          aria-label="Atualizar projeção"
          onClick={() => void load()}
        >
          <RefreshCw aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Exibir em tela cheia"
          onClick={() => void document.documentElement.requestFullscreen?.()}
        >
          <Expand aria-hidden="true" />
        </Button>
      </div>
    </main>
  );
}
