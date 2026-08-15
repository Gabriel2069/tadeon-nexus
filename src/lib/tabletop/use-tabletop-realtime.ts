import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TabletopPresence,
  TabletopRealtimeEvent,
} from "./realtime-protocol";
import {
  TabletopRealtimeTransport,
  TabletopRealtimeTransportError,
  type TabletopRealtimeConnectionState,
} from "./realtime-transport";

const FALLBACK_REALTIME_ERROR =
  "Não foi possível iniciar a sincronização da Mesa Nexus.";

function createSourceId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `browser_${crypto.randomUUID()}`;
  }
  return `browser_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export interface UseTabletopRealtimeOptions {
  enabled: boolean;
  sessionId?: string | null;
  sceneId?: string | null;
  presence?: TabletopPresence | null;
  onEvent: (event: TabletopRealtimeEvent) => void;
}

export interface UseTabletopRealtimeResult {
  connectionState: TabletopRealtimeConnectionState;
  participants: TabletopPresence[];
  errorMessage: string | null;
  reconnect: () => void;
  send: (event: TabletopRealtimeEvent) => Promise<void>;
  broadcastStructureState: (payload: {
    wallId: string;
    wallType: "door_open" | "door_closed";
    version: number;
  }) => Promise<void>;
  broadcastDirectorState: (revision: number) => Promise<void>;
  broadcastEntityMove: (payload: {
    entityId: string;
    x: number;
    y: number;
    version: number;
  }) => Promise<void>;
  updatePresence: (presence: TabletopPresence) => Promise<void>;
}

export function useTabletopRealtime({
  enabled,
  sessionId,
  sceneId,
  presence,
  onEvent,
}: UseTabletopRealtimeOptions): UseTabletopRealtimeResult {
  const [connectionState, setConnectionState] =
    useState<TabletopRealtimeConnectionState>("idle");
  const [participants, setParticipants] = useState<TabletopPresence[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const transportRef = useRef<TabletopRealtimeTransport | null>(null);
  const onEventRef = useRef(onEvent);
  const sourceIdRef = useRef<string>(createSourceId());
  const sequenceRef = useRef(0);
  const presenceUserId = presence?.userId;
  const presenceDisplayName = presence?.displayName;
  const presenceRole = presence?.role;
  const presenceSceneId = presence?.sceneId;
  const presenceControlledTokenId = presence?.controlledTokenId;
  const presenceState = presence?.state;
  const presenceColor = presence?.color;
  const presenceUpdatedAt = presence?.updatedAt;
  const stablePresence = useMemo<TabletopPresence | null>(
    () =>
      presenceUserId &&
      presenceDisplayName &&
      presenceRole &&
      presenceSceneId &&
      presenceState &&
      presenceColor &&
      presenceUpdatedAt !== undefined
        ? {
            userId: presenceUserId,
            displayName: presenceDisplayName,
            role: presenceRole,
            sceneId: presenceSceneId,
            controlledTokenId: presenceControlledTokenId ?? null,
            state: presenceState,
            color: presenceColor,
            updatedAt: presenceUpdatedAt,
          }
        : null,
    [
      presenceColor,
      presenceControlledTokenId,
      presenceDisplayName,
      presenceRole,
      presenceSceneId,
      presenceState,
      presenceUpdatedAt,
      presenceUserId,
    ],
  );

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled || !sessionId || !sceneId || !stablePresence) {
      transportRef.current = null;
      setConnectionState("idle");
      setParticipants([]);
      setErrorMessage(null);
      return;
    }

    let active = true;
    const transport = new TabletopRealtimeTransport({
      sessionId,
      sceneId,
      sourceId: sourceIdRef.current,
      presence: stablePresence,
      isEnabled: () => enabled,
      onEvent: (event) => onEventRef.current(event),
      onPresence: (snapshot) => {
        if (active) setParticipants(snapshot);
      },
      onConnectionStateChange: (state) => {
        if (active) setConnectionState(state);
      },
    });
    transportRef.current = transport;
    setErrorMessage(null);

    void transport.connect().catch((error: unknown) => {
      if (!active) return;
      setConnectionState("disconnected");
      setErrorMessage(
        error instanceof TabletopRealtimeTransportError
          ? error.message
          : FALLBACK_REALTIME_ERROR,
      );
    });

    return () => {
      active = false;
      if (transportRef.current === transport) transportRef.current = null;
      void transport.disconnect();
    };
  }, [attempt, enabled, sceneId, sessionId, stablePresence]);

  const reconnect = useCallback(() => {
    setErrorMessage(null);
    setAttempt((value) => value + 1);
  }, []);

  const send = useCallback(async (event: TabletopRealtimeEvent) => {
    const transport = transportRef.current;
    if (!transport) {
      throw new TabletopRealtimeTransportError(
        "TABLETOP_REALTIME_NOT_CONNECTED",
      );
    }
    await transport.send(event);
  }, []);

  const broadcastStructureState = useCallback(
    async (payload: {
      wallId: string;
      wallType: "door_open" | "door_closed";
      version: number;
    }) => {
      const transport = transportRef.current;
      if (!transport || !sceneId) {
        throw new TabletopRealtimeTransportError(
          "TABLETOP_REALTIME_NOT_CONNECTED",
        );
      }
      sequenceRef.current += 1;
      const sentAt = Date.now();
      await transport.send({
        protocol: 1,
        eventId: `event_${sentAt.toString(36)}_${sequenceRef.current.toString(36)}`,
        sourceId: sourceIdRef.current,
        sceneId,
        sequence: sequenceRef.current,
        sentAt,
        type: "structure.state",
        payload,
      });
    },
    [sceneId],
  );

  const broadcastDirectorState = useCallback(
    async (revision: number) => {
      const transport = transportRef.current;
      if (!transport || !sceneId) {
        throw new TabletopRealtimeTransportError(
          "TABLETOP_REALTIME_NOT_CONNECTED",
        );
      }
      sequenceRef.current += 1;
      const sentAt = Date.now();
      await transport.send({
        protocol: 1,
        eventId: `event_${sentAt.toString(36)}_${sequenceRef.current.toString(36)}`,
        sourceId: sourceIdRef.current,
        sceneId,
        sequence: sequenceRef.current,
        sentAt,
        type: "director.state",
        payload: { revision },
      });
    },
    [sceneId],
  );

  const broadcastEntityMove = useCallback(
    async (payload: { entityId: string; x: number; y: number; version: number }) => {
      const transport = transportRef.current;
      if (!transport || !sceneId) {
        throw new TabletopRealtimeTransportError(
          "TABLETOP_REALTIME_NOT_CONNECTED",
        );
      }
      sequenceRef.current += 1;
      const sentAt = Date.now();
      await transport.send({
        protocol: 1,
        eventId: `event_${sentAt.toString(36)}_${sequenceRef.current.toString(36)}`,
        sourceId: sourceIdRef.current,
        sceneId,
        sequence: sequenceRef.current,
        sentAt,
        type: "token.move-commit",
        payload,
      });
    },
    [sceneId],
  );

  const updatePresence = useCallback(async (nextPresence: TabletopPresence) => {
    const transport = transportRef.current;
    if (!transport) {
      throw new TabletopRealtimeTransportError(
        "TABLETOP_REALTIME_NOT_CONNECTED",
      );
    }
    await transport.updatePresence(nextPresence);
  }, []);

  return {
    connectionState,
    participants,
    errorMessage,
    reconnect,
    send,
    broadcastStructureState,
    broadcastDirectorState,
    broadcastEntityMove,
    updatePresence,
  };
}
