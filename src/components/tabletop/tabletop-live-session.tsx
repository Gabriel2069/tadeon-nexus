import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  DoorOpen,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Radio,
  RefreshCw,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import type { CampaignRole } from "@/lib/nexus-contracts";
import type { TabletopRealtimeEvent } from "@/lib/tabletop/realtime-protocol";
import { useTabletopRealtime } from "@/lib/tabletop/use-tabletop-realtime";
import {
  tabletopSessionService,
  TabletopSessionServiceError,
  type TabletopSession,
  type TabletopSessionParticipant,
} from "@/lib/tabletop/tabletop-session-service";
import { TabletopRealtimeStatus } from "@/components/tabletop/realtime-status";
import { TabletopDirectorRemote } from "@/components/tabletop/tabletop-director-remote";
import type { TabletopDirectorCamera } from "@/lib/tabletop/tabletop-director-state";
import "@/styles/tabletop-live-session.css";

const ROLE_LABELS: Record<CampaignRole, string> = {
  master: "Mestre",
  co_master: "Co-mestre",
  player: "Jogador",
  observer: "Observador",
};

function liveSessionErrorMessage(error: unknown) {
  if (!(error instanceof TabletopSessionServiceError)) {
    return "Não foi possível atualizar a sala ao vivo.";
  }
  switch (error.code) {
    case "TABLETOP_SESSION_AUTH_REQUIRED":
      return "Sua sessão expirou. Entre novamente para continuar.";
    case "TABLETOP_SESSION_DISABLED":
      return "A sincronização ao vivo ainda não está habilitada para esta conta.";
    case "TABLETOP_SESSION_CONFLICT":
      return "A sala mudou em outra janela. Os dados serão recarregados.";
    case "TABLETOP_SESSION_INVALID_INPUT":
      return "Revise o nome e a cena da sala.";
    case "TABLETOP_SESSION_FORBIDDEN":
      return "Você não tem permissão para realizar esta ação na sala.";
    default:
      return "A sala ao vivo não conseguiu acessar o banco com segurança.";
  }
}

export function TabletopLiveSession({
  enabled,
  campaignId,
  campaignName,
  sceneId,
  sceneName,
  getCurrentCamera,
  onRemoteEntityMove,
}: {
  enabled: boolean;
  campaignId?: string | null;
  campaignName?: string | null;
  sceneId?: string | null;
  sceneName?: string | null;
  getCurrentCamera?: () => TabletopDirectorCamera | null | undefined;
  onRemoteEntityMove?: (payload: {
    entityId: string;
    x: number;
    y: number;
    version: number;
  }) => void;
}) {
  const { user, profile } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [session, setSession] = useState<TabletopSession | null>(null);
  const [participants, setParticipants] = useState<
    TabletopSessionParticipant[]
  >([]);
  const [roomName, setRoomName] = useState("Sessão ao vivo");
  const [loading, setLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<
    TabletopRealtimeEvent["type"] | null
  >(null);
  const [presenceStartedAt, setPresenceStartedAt] = useState(() => Date.now());

  const currentParticipant = useMemo(
    () => participants.find((participant) => participant.userId === user?.id),
    [participants, user?.id],
  );
  const activeParticipant =
    currentParticipant?.state === "active" ? currentParticipant : null;
  const activeCount = participants.filter(
    (participant) => participant.state === "active",
  ).length;

  const refresh = useCallback(async () => {
    if (!enabled || !campaignId) {
      setSession(null);
      setParticipants([]);
      return;
    }
    try {
      const nextSession =
        await tabletopSessionService.findOpenSession(campaignId);
      setSession(nextSession);
      setParticipants(
        nextSession
          ? await tabletopSessionService.listParticipants(nextSession.id)
          : [],
      );
    } catch (error) {
      setSession(null);
      setParticipants([]);
      throw error;
    }
  }, [campaignId, enabled]);

  useEffect(() => {
    let active = true;
    if (!enabled || !campaignId) {
      setSession(null);
      setParticipants([]);
      return;
    }
    setLoading(true);
    void refresh()
      .catch((error) => {
        if (active) toast.error(liveSessionErrorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    const refreshOnFocus = () => void refresh().catch(() => undefined);
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [campaignId, enabled, refresh]);

  useEffect(() => {
    setPresenceStartedAt(Date.now());
    setLastEvent(null);
  }, [session?.id, session?.currentSceneId]);

  const onRealtimeEvent = useCallback(
    (event: TabletopRealtimeEvent) => {
      setLastEvent(event.type);
      if (event.type === "scene.transition") {
        void refresh().catch(() => undefined);
        return;
      }
      if (event.type === "token.move-commit") {
        onRemoteEntityMove?.(event.payload);
      }
    },
    [onRemoteEntityMove, refresh],
  );

  const realtimePresence = useMemo(() => {
    if (!user?.id || !activeParticipant || !session?.currentSceneId)
      return null;
    const fallbackName = user.email?.split("@")[0] || "Participante";
    return {
      userId: user.id,
      displayName: (profile?.full_name || fallbackName).slice(0, 80),
      role: activeParticipant.role,
      sceneId: session.currentSceneId,
      controlledTokenId: null,
      state: "connected" as const,
      color: activeParticipant.role === "master" ? "#d9d7a4" : "#4f6e5d",
      updatedAt: presenceStartedAt,
    };
  }, [
    activeParticipant,
    presenceStartedAt,
    profile?.full_name,
    session?.currentSceneId,
    user?.email,
    user?.id,
  ]);

  const realtime = useTabletopRealtime({
    enabled: enabled && Boolean(activeParticipant),
    sessionId: session?.id,
    sceneId: session?.currentSceneId,
    presence: realtimePresence,
    onEvent: onRealtimeEvent,
  });

  const runOperation = async (
    operation: () => Promise<unknown>,
    successMessage: string,
  ) => {
    setLoading(true);
    try {
      await operation();
      await refresh();
      toast.success(successMessage);
    } catch (error) {
      toast.error(liveSessionErrorMessage(error));
      if (
        error instanceof TabletopSessionServiceError &&
        error.code === "TABLETOP_SESSION_CONFLICT"
      ) {
        await refresh().catch(() => undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  const openRoom = () => {
    if (!campaignId || !sceneId) return;
    void runOperation(
      () =>
        tabletopSessionService.openSession({
          campaignId,
          sceneId,
          name: roomName,
        }),
      "Sala ao vivo aberta nesta cena.",
    );
  };

  return (
    <section
      className={`tadeon-live-session ${expanded ? "is-expanded" : ""}`}
      aria-label="Sala ao vivo da Mesa Nexus"
    >
      <button
        type="button"
        className="tadeon-live-session__summary"
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="tadeon-live-session__glyph" aria-hidden="true">
          <Radio />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="tadeon-live-session__eyebrow">
            Mesa sincronizada
          </span>
          <strong>
            {!enabled
              ? "Sala ao vivo em canário"
              : session
                ? session.name
                : "Preparar sala ao vivo"}
          </strong>
        </span>
        {session && (
          <span className="tadeon-live-session__count">
            {activeCount} {activeCount === 1 ? "presente" : "presentes"}
          </span>
        )}
        <ChevronDown
          className="tadeon-live-session__chevron"
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="tadeon-live-session__body">
          {!enabled ? (
            <div className="tadeon-live-session__notice">
              <Lock className="h-4 w-4" aria-hidden="true" />
              <span>
                A interface está pronta, mas conexões permanecem desligadas até
                a liberação segura da flag Realtime para sua conta.
              </span>
            </div>
          ) : !campaignId ? (
            <div className="tadeon-live-session__notice">
              Selecione uma campanha para preparar a sala.
            </div>
          ) : session ? (
            <div className="tadeon-live-session__room">
              <div className="min-w-0">
                <TabletopRealtimeStatus
                  compact
                  enabled={Boolean(activeParticipant)}
                  state={realtime.connectionState}
                  participants={realtime.participants}
                  errorMessage={realtime.errorMessage}
                  onReconnect={realtime.reconnect}
                />
                <p className="mt-2 truncate text-[11px] text-muted-foreground">
                  {campaignName || "Campanha"} · versão {session.version}
                  {lastEvent ? ` · último evento: ${lastEvent}` : ""}
                </p>
              </div>

              <div className="tadeon-live-session__actions">
                {!activeParticipant ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2"
                    disabled={loading || session.joinLocked}
                    onClick={() =>
                      void runOperation(
                        () => tabletopSessionService.joinSession(session.id),
                        "Você entrou na sala ao vivo.",
                      )
                    }
                  >
                    <LogIn className="h-4 w-4" />
                    {session.joinLocked ? "Entrada travada" : "Entrar"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={loading}
                    onClick={() =>
                      void runOperation(
                        () => tabletopSessionService.leaveSession(session.id),
                        "Você saiu da sala ao vivo.",
                      )
                    }
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={loading}
                  onClick={() =>
                    void runOperation(
                      () =>
                        tabletopSessionService.setSessionLock(
                          session.id,
                          !session.joinLocked,
                          session.version,
                        ),
                      session.joinLocked
                        ? "Entrada da sala liberada."
                        : "Entrada da sala travada.",
                    )
                  }
                >
                  {session.joinLocked ? (
                    <LockOpen className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {session.joinLocked ? "Liberar" : "Travar"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={
                    loading || !sceneId || session.currentSceneId === sceneId
                  }
                  onClick={() => {
                    if (!sceneId) return;
                    void runOperation(
                      () =>
                        tabletopSessionService.moveSessionScene(
                          session.id,
                          sceneId,
                          session.version,
                        ),
                      `Cena “${sceneName || "selecionada"}” transmitida.`,
                    );
                  }}
                >
                  <DoorOpen className="h-4 w-4" />
                  {session.currentSceneId === sceneId
                    ? "Cena no ar"
                    : "Transmitir cena"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  disabled={loading}
                  onClick={() => {
                    if (!window.confirm("Encerrar esta sala ao vivo?")) return;
                    void runOperation(
                      () =>
                        tabletopSessionService.closeSession(
                          session.id,
                          session.version,
                        ),
                      "Sala ao vivo encerrada.",
                    );
                  }}
                >
                  <Square className="h-3.5 w-3.5" />
                  Encerrar
                </Button>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Atualizar estado da sala"
                  disabled={loading}
                  onClick={() =>
                    void runOperation(
                      () => refresh(),
                      "Estado da sala atualizado.",
                    )
                  }
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              {activeParticipant && (
                <>
                  <p className="tadeon-live-session__role">
                    Você está na sala como {ROLE_LABELS[activeParticipant.role]}
                    .
                  </p>
                  {(activeParticipant.role === "master" ||
                    activeParticipant.role === "co_master") && (
                    <TabletopDirectorRemote
                      session={session}
                      getCurrentCamera={getCurrentCamera}
                      onSaved={refresh}
                      broadcastRevision={realtime.broadcastDirectorState}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="tadeon-live-session__create">
              <div className="min-w-0">
                <label htmlFor="tabletop-room-name">Nome da sala</label>
                <Input
                  id="tabletop-room-name"
                  value={roomName}
                  maxLength={160}
                  disabled={loading}
                  onChange={(event) => setRoomName(event.target.value)}
                />
                <p>
                  {sceneId
                    ? `A sala começa em “${sceneName || "Cena selecionada"}”.`
                    : "Crie ou selecione uma cena ativa antes de abrir a sala."}
                </p>
              </div>
              <Button
                type="button"
                className="gap-2"
                disabled={loading || !sceneId || !roomName.trim()}
                onClick={openRoom}
              >
                <Radio className="h-4 w-4" />
                Abrir sala
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
