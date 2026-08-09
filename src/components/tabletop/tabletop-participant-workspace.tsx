import {
  BookOpenText,
  Eye,
  Images,
  Loader2,
  LogIn,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TabletopRealtimeStatus } from "@/components/tabletop/realtime-status";
import { TabletopHandoutViewer } from "@/components/tabletop/tabletop-handout-viewer";
import { useAuth } from "@/lib/auth";
import { TabletopEngine } from "@/lib/tabletop/tabletop-engine";
import { createEmptyVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";
import {
  TabletopParticipantError,
  tabletopParticipantService,
  type TabletopParticipantView,
  type TabletopParticipantScene,
  type TabletopParticipantHandout,
} from "@/lib/tabletop/tabletop-participant-service";
import {
  tabletopPersistenceService,
  type TabletopCampaignSummary,
} from "@/lib/tabletop/tabletop-persistence-service";
import type { TabletopRealtimeEvent } from "@/lib/tabletop/realtime-protocol";
import {
  tabletopSessionService,
  type TabletopSession,
} from "@/lib/tabletop/tabletop-session-service";
import { useTabletopRealtime } from "@/lib/tabletop/use-tabletop-realtime";
import "@/styles/tabletop-participant.css";

function participantErrorMessage(error: unknown) {
  if (!(error instanceof TabletopParticipantError))
    return "Não foi possível abrir a visão compartilhada da Mesa.";
  switch (error.code) {
    case "TABLETOP_PARTICIPANT_AUTH_REQUIRED":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "TABLETOP_PARTICIPANT_FORBIDDEN":
      return "Seu acesso à sala não está ativo.";
    case "TABLETOP_PARTICIPANT_NOT_FOUND":
      return "A sala foi encerrada ou não está mais disponível.";
    case "TABLETOP_PARTICIPANT_INVALID_RESPONSE":
      return "A cena recebida não passou pela validação de segurança.";
    default:
      return "A visão compartilhada está temporariamente indisponível.";
  }
}

export function TabletopParticipantWorkspace({
  realtimeEnabled,
}: {
  realtimeEnabled: boolean;
}) {
  const { user, profile } = useAuth();
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<TabletopEngine | null>(null);
  const [campaigns, setCampaigns] = useState<TabletopCampaignSummary[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [session, setSession] = useState<TabletopSession | null>(null);
  const [view, setView] = useState<TabletopParticipantView | null>(null);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedHandout, setSelectedHandout] =
    useState<TabletopParticipantHandout | null>(null);
  const sessionRef = useRef<TabletopSession | null>(null);
  const loadViewRef = useRef<
    ((targetSession: TabletopSession) => Promise<void>) | null
  >(null);
  const broadcastStructureStateRef = useRef<
    | ((payload: {
        wallId: string;
        wallType: "door_open" | "door_closed";
        version: number;
      }) => Promise<void>)
    | null
  >(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const engine = new TabletopEngine({
      onAssetError: (message) => toast.error(message),
      onActivateStructure: (wall) => {
        const activeSession = sessionRef.current;
        if (!activeSession || !wall.playerOperable) return;
        void tabletopParticipantService
          .toggleDoor(activeSession.id, wall.id, wall.version ?? 1)
          .then(async (result) => {
            await loadViewRef.current?.(activeSession);
            try {
              await broadcastStructureStateRef.current?.(result);
            } catch {
              // A RPC é a fonte de verdade; a visão local já foi recarregada.
            }
          })
          .catch((error) => {
            toast.error(participantErrorMessage(error));
            void loadViewRef.current?.(activeSession);
          });
      },
    });
    engineRef.current = engine;
    let active = true;
    void engine.init(host).then(() => {
      if (!active) return;
      engine.setReadOnly(true);
      engine.fitToScreen();
    });
    return () => {
      active = false;
      engineRef.current = null;
      void engine.destroy();
    };
  }, []);

  useEffect(() => {
    if (!view?.scene || !engineRef.current) return;
    engineRef.current.loadScene(view.scene);
    engineRef.current.setActiveLevel(view.scene.activeLevelId);
    engineRef.current.setVisibility(
      view.visibility ?? createEmptyVisibilityState(),
      false,
    );
    engineRef.current.setInteractiveStructures(
      view.participant.canInteract
        ? (view.visibility?.walls ?? []).map((wall) => wall.id)
        : [],
    );
    engineRef.current.setReadOnly(true);
    engineRef.current.fitToScreen();
  }, [view?.scene, view?.visibility]);

  const loadView = useCallback(async (targetSession: TabletopSession) => {
    try {
      const nextView = await tabletopParticipantService.load(targetSession.id);
      setView(nextView);
      setErrorMessage(null);
    } catch (error) {
      setView(null);
      setErrorMessage(participantErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    loadViewRef.current = loadView;
  }, [loadView]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const refreshRoom = useCallback(async () => {
    if (!campaignId || !user) return;
    setLoading(true);
    try {
      const openSession =
        await tabletopSessionService.findOpenSession(campaignId);
      setSession(openSession);
      setView(null);
      if (!openSession) {
        setJoined(false);
        setErrorMessage(null);
        return;
      }
      const participants = await tabletopSessionService.listParticipants(
        openSession.id,
      );
      const active = participants.some(
        (participant) =>
          participant.userId === user.id && participant.state === "active",
      );
      setJoined(active);
      if (active) await loadView(openSession);
      else setErrorMessage(null);
    } catch {
      setSession(null);
      setView(null);
      setJoined(false);
      setErrorMessage("Não foi possível consultar a sala desta campanha.");
    } finally {
      setLoading(false);
    }
  }, [campaignId, loadView, user]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void tabletopPersistenceService
      .listCampaigns()
      .then((items) => {
        if (!active) return;
        setCampaigns(items);
        setCampaignId((current) => current || items[0]?.id || "");
      })
      .catch(() => {
        if (active)
          setErrorMessage("Não foi possível carregar suas campanhas.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (campaignId) void refreshRoom();
  }, [campaignId, refreshRoom]);

  const handleJoin = async () => {
    if (!session) return;
    setJoining(true);
    try {
      await tabletopSessionService.joinSession(session.id);
      setJoined(true);
      await loadView(session);
      toast.success("Você entrou na sala ao vivo.");
    } catch {
      toast.error(
        "Não foi possível entrar. A sala pode estar bloqueada ou encerrada.",
      );
      await refreshRoom();
    } finally {
      setJoining(false);
    }
  };

  const onRealtimeEvent = useCallback(
    (event: TabletopRealtimeEvent) => {
      if (event.type === "scene.transition") {
        void refreshRoom();
        return;
      }
      if (event.type === "structure.state") {
        if (session) void loadView(session);
        return;
      }
      if (event.type !== "token.drag-preview") return;
      setView((current) => {
        if (!current?.scene || current.scene.id !== event.sceneId)
          return current;
        return {
          ...current,
          scene: {
            ...current.scene,
            entities: current.scene.entities.map((entity) =>
              entity.id === event.payload.entityId
                ? { ...entity, x: event.payload.x, y: event.payload.y }
                : entity,
            ) as TabletopParticipantScene["entities"],
          },
        };
      });
    },
    [loadView, refreshRoom, session],
  );

  const handouts = useMemo(() => {
    const unique = new Map(
      (view?.scene?.entities ?? []).flatMap((entity) =>
        entity.handout
          ? [[entity.handout.nodeId, entity.handout] as const]
          : [],
      ),
    );
    return [...unique.values()];
  }, [view?.scene?.entities]);

  const presence = useMemo(
    () =>
      user && view?.scene
        ? {
            userId: user.id,
            displayName:
              profile?.full_name?.trim() ||
              profile?.email?.split("@")[0] ||
              "Participante",
            role: view.participant.role,
            sceneId: view.scene.id,
            controlledTokenId: null,
            state: "connected" as const,
            color: view.participant.role === "observer" ? "#7f8da8" : "#d5a85b",
            updatedAt: Date.now(),
          }
        : null,
    [
      profile?.email,
      profile?.full_name,
      user,
      view?.participant.role,
      view?.scene,
    ],
  );
  const realtime = useTabletopRealtime({
    enabled: realtimeEnabled && joined,
    sessionId: session?.id,
    sceneId: view?.scene?.id,
    presence,
    onEvent: onRealtimeEvent,
  });

  useEffect(() => {
    broadcastStructureStateRef.current = realtime.broadcastStructureState;
  }, [realtime.broadcastStructureState]);

  return (
    <main className="tadeon-participant-view">
      <header className="tadeon-participant-view__header">
        <div>
          <span className="tadeon-participant-view__eyebrow">
            <Eye aria-hidden="true" /> Visão compartilhada
          </span>
          <h1>Mesa Nexus</h1>
          <p>Você recebe somente o que o mestre tornou visível nesta sala.</p>
        </div>
        <div className="tadeon-participant-view__controls">
          <label>
            <span>Campanha</span>
            <select
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
              disabled={loading || campaigns.length === 0}
            >
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            onClick={() => void refreshRoom()}
            disabled={!campaignId || loading}
          >
            <RefreshCw
              className={loading ? "animate-spin" : ""}
              aria-hidden="true"
            />
            Atualizar
          </Button>
        </div>
      </header>

      <section className="tadeon-participant-view__stage" aria-busy={loading}>
        <div ref={hostRef} className="tadeon-participant-view__canvas" />
        {loading && (
          <div className="tadeon-participant-view__empty" role="status">
            <Loader2 className="animate-spin" aria-hidden="true" />
            <strong>Sincronizando a sala…</strong>
          </div>
        )}
        {!loading && campaigns.length === 0 && (
          <div className="tadeon-participant-view__empty">
            <UsersRound aria-hidden="true" />
            <strong>Nenhuma campanha disponível</strong>
            <span>Peça ao mestre para adicionar sua conta a uma campanha.</span>
          </div>
        )}
        {!loading && campaignId && !session && (
          <div className="tadeon-participant-view__empty">
            <ShieldCheck aria-hidden="true" />
            <strong>Nenhuma sala aberta</strong>
            <span>
              Este painel será liberado quando o mestre iniciar uma sessão.
            </span>
          </div>
        )}
        {!loading && session && !joined && (
          <div className="tadeon-participant-view__empty">
            <LogIn aria-hidden="true" />
            <strong>{session.name}</strong>
            <span>
              {session.joinLocked
                ? "A entrada está bloqueada pelo mestre."
                : "A sala está pronta para receber você."}
            </span>
            <Button
              type="button"
              onClick={() => void handleJoin()}
              disabled={joining || session.joinLocked}
            >
              {joining ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <LogIn aria-hidden="true" />
              )}
              Entrar na sala
            </Button>
          </div>
        )}
        {!loading && joined && errorMessage && (
          <div className="tadeon-participant-view__empty is-error">
            <ShieldCheck aria-hidden="true" />
            <strong>Visão protegida indisponível</strong>
            <span>{errorMessage}</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void refreshRoom()}
            >
              Tentar novamente
            </Button>
          </div>
        )}
        {!loading && joined && view && !view.scene && (
          <div className="tadeon-participant-view__empty">
            <Eye aria-hidden="true" />
            <strong>Aguardando uma cena</strong>
            <span>O mestre ainda não transmitiu um mapa para a sala.</span>
          </div>
        )}
        {joined && view?.scene && (
          <div className="tadeon-participant-view__hud">
            <div>
              <small>{session?.name}</small>
              <strong>{view.scene.name}</strong>
              <span>
                {view.participant.role === "observer"
                  ? "Observador"
                  : "Jogador"}
              </span>
              {view.participant.canInteract &&
                (view.visibility?.walls.length ?? 0) > 0 && (
                  <span>
                    Duplo clique ou toque nas portas destacadas para acionar
                  </span>
                )}
            </div>
            <TabletopRealtimeStatus
              enabled={realtimeEnabled}
              state={realtime.connectionState}
              participants={realtime.participants}
              errorMessage={realtime.errorMessage}
              onReconnect={realtime.reconnect}
              compact
            />
          </div>
        )}
        {joined && view?.scene && handouts.length > 0 && (
          <details className="tadeon-participant-view__handouts">
            <summary>
              <span>
                <BookOpenText aria-hidden="true" />
              </span>
              <span>
                <strong>Handouts do Nexus</strong>
                <small>{handouts.length} compartilhado(s) pelo mestre</small>
              </span>
              <span className="tadeon-participant-view__handout-count">
                {handouts.length}
              </span>
            </summary>
            <div className="tadeon-participant-view__handout-list">
              {handouts.map((handout) => (
                <article key={handout.nodeId}>
                  {handout.coverUrl && (
                    <img src={handout.coverUrl} alt="" loading="lazy" />
                  )}
                  <div>
                    <small>{handout.nodeType}</small>
                    <strong>{handout.title}</strong>
                    {handout.summary && <p>{handout.summary}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedHandout(handout)}
                    aria-label={`Visualizar ${handout.title} na Mesa`}
                  >
                    Visualizar
                    {handout.attachments.length > 0 && (
                      <span>
                        <Images aria-hidden="true" />
                        {handout.attachments.length}
                      </span>
                    )}
                  </button>
                </article>
              ))}
            </div>
          </details>
        )}
      </section>
      <TabletopHandoutViewer
        handout={selectedHandout}
        open={selectedHandout !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedHandout(null);
        }}
      />
    </main>
  );
}
