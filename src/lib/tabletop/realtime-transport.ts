import type { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  parseTabletopPresence,
  parseTabletopRealtimeEvent,
  tabletopPresenceSchema,
  tabletopSceneChannel,
  tabletopSessionChannel,
  TabletopRealtimeEventGate,
  type TabletopPresence,
  type TabletopRealtimeEvent,
} from "./realtime-protocol";

export const TABLETOP_REALTIME_BROADCAST_EVENT = "tabletop.event";
export const TABLETOP_REALTIME_SUBSCRIBE_TIMEOUT_MS = 10_000;

type ChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";
type ChannelSendResponse = "ok" | "timed out" | "error" | (string & {});
type ChannelListener = (payload?: unknown) => void;

export interface TabletopRealtimeChannelAdapter {
  on(
    type: "broadcast" | "presence",
    filter: Record<string, string>,
    callback: ChannelListener,
  ): TabletopRealtimeChannelAdapter;
  subscribe(
    callback: (status: ChannelStatus, error?: Error) => void,
    timeout?: number,
  ): TabletopRealtimeChannelAdapter;
  send(message: {
    type: "broadcast";
    event: string;
    payload: TabletopRealtimeEvent;
  }): Promise<ChannelSendResponse>;
  track(payload: TabletopPresence): Promise<ChannelSendResponse>;
  untrack(): Promise<ChannelSendResponse>;
  presenceState(): Record<string, unknown>;
}

export interface TabletopRealtimeClientAdapter {
  setAuth(): Promise<void>;
  createChannel(topic: string, options: RealtimeChannelOptions): TabletopRealtimeChannelAdapter;
  removeChannel(channel: TabletopRealtimeChannelAdapter): Promise<unknown>;
}

export type TabletopRealtimeConnectionState =
  "idle" | "connecting" | "connected" | "degraded" | "disconnected";

export type TabletopRealtimeErrorCode =
  | "TABLETOP_REALTIME_DISABLED"
  | "TABLETOP_REALTIME_INVALID_CONTEXT"
  | "TABLETOP_REALTIME_AUTH_FAILED"
  | "TABLETOP_REALTIME_SUBSCRIBE_FAILED"
  | "TABLETOP_REALTIME_SUBSCRIBE_TIMEOUT"
  | "TABLETOP_REALTIME_NOT_CONNECTED"
  | "TABLETOP_REALTIME_INVALID_EVENT"
  | "TABLETOP_REALTIME_SEND_FAILED"
  | "TABLETOP_REALTIME_PRESENCE_FAILED";

const SAFE_ERROR_MESSAGES: Record<TabletopRealtimeErrorCode, string> = {
  TABLETOP_REALTIME_DISABLED: "A sincronização ao vivo ainda não está habilitada.",
  TABLETOP_REALTIME_INVALID_CONTEXT: "Não foi possível validar a sala da Mesa Nexus.",
  TABLETOP_REALTIME_AUTH_FAILED: "Não foi possível autenticar a conexão da Mesa Nexus.",
  TABLETOP_REALTIME_SUBSCRIBE_FAILED: "Não foi possível entrar na sala da Mesa Nexus.",
  TABLETOP_REALTIME_SUBSCRIBE_TIMEOUT: "A conexão da Mesa Nexus demorou além do esperado.",
  TABLETOP_REALTIME_NOT_CONNECTED: "A Mesa Nexus não está conectada.",
  TABLETOP_REALTIME_INVALID_EVENT: "A atualização da Mesa Nexus não passou pela validação.",
  TABLETOP_REALTIME_SEND_FAILED: "Não foi possível sincronizar a atualização da Mesa Nexus.",
  TABLETOP_REALTIME_PRESENCE_FAILED: "Não foi possível atualizar sua presença na Mesa Nexus.",
};

export class TabletopRealtimeTransportError extends Error {
  constructor(
    public readonly code: TabletopRealtimeErrorCode,
    options?: ErrorOptions,
  ) {
    super(SAFE_ERROR_MESSAGES[code], options);
    this.name = "TabletopRealtimeTransportError";
  }
}

export interface TabletopRealtimeTransportOptions {
  sessionId: string;
  sceneId: string;
  sourceId: string;
  presence: TabletopPresence;
  isEnabled: () => boolean | Promise<boolean>;
  onEvent: (event: TabletopRealtimeEvent) => void;
  onPresence: (presence: TabletopPresence[]) => void;
  onConnectionStateChange?: (state: TabletopRealtimeConnectionState) => void;
  now?: () => number;
  subscribeTimeoutMs?: number;
}

const defaultClient: TabletopRealtimeClientAdapter = {
  async setAuth() {
    await supabase.realtime.setAuth();
  },
  createChannel(topic, options) {
    return supabase.channel(topic, options) as unknown as TabletopRealtimeChannelAdapter;
  },
  async removeChannel(channel) {
    await supabase.removeChannel(channel as unknown as RealtimeChannel);
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapBroadcastPayload(message: unknown): unknown {
  return isRecord(message) && "payload" in message ? message.payload : message;
}

function normalizePresence(value: unknown): TabletopPresence | null {
  if (!isRecord(value)) return null;

  // Supabase acrescenta campos internos como `presence_ref`. Somente os campos
  // públicos do nosso contrato entram na aplicação.
  return parseTabletopPresence({
    userId: value.userId,
    displayName: value.displayName,
    role: value.role,
    sceneId: value.sceneId,
    controlledTokenId: value.controlledTokenId,
    state: value.state,
    color: value.color,
    updatedAt: value.updatedAt,
  });
}

function flattenPresenceState(state: Record<string, unknown>): TabletopPresence[] {
  const newestByUser = new Map<string, TabletopPresence>();

  for (const rawEntry of Object.values(state)) {
    const entries = Array.isArray(rawEntry) ? rawEntry : [rawEntry];
    for (const entry of entries) {
      const presence = normalizePresence(entry);
      if (!presence) continue;

      const current = newestByUser.get(presence.userId);
      if (!current || presence.updatedAt > current.updatedAt) {
        newestByUser.set(presence.userId, presence);
      }
    }
  }

  return [...newestByUser.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "pt-BR"),
  );
}

function safeTransportError(
  code: TabletopRealtimeErrorCode,
  cause?: unknown,
): TabletopRealtimeTransportError {
  return new TabletopRealtimeTransportError(code, { cause });
}

export class TabletopRealtimeTransport {
  private sceneChannel: TabletopRealtimeChannelAdapter | null = null;
  private sessionChannel: TabletopRealtimeChannelAdapter | null = null;
  private readonly eventGate = new TabletopRealtimeEventGate();
  private state: TabletopRealtimeConnectionState = "idle";
  private connectPromise: Promise<void> | null = null;
  private disconnecting = false;

  constructor(
    private readonly options: TabletopRealtimeTransportOptions,
    private readonly client: TabletopRealtimeClientAdapter = defaultClient,
  ) {}

  get connectionState(): TabletopRealtimeConnectionState {
    return this.state;
  }

  async connect(): Promise<void> {
    if (this.state === "connected") return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.openChannels();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async openChannels(): Promise<void> {
    this.setState("connecting");
    this.disconnecting = false;

    if (!(await this.options.isEnabled())) {
      this.setState("idle");
      throw safeTransportError("TABLETOP_REALTIME_DISABLED");
    }

    let sceneTopic: string;
    let sessionTopic: string;
    const presence = tabletopPresenceSchema.safeParse(this.options.presence);
    const sourceIdIsValid = /^[A-Za-z0-9_-]{8,80}$/.test(this.options.sourceId);

    try {
      sceneTopic = tabletopSceneChannel(this.options.sceneId);
      sessionTopic = tabletopSessionChannel(this.options.sessionId);
      if (!presence.success || presence.data.sceneId !== this.options.sceneId || !sourceIdIsValid) {
        throw new Error("invalid context");
      }
    } catch (error) {
      this.setState("idle");
      throw safeTransportError("TABLETOP_REALTIME_INVALID_CONTEXT", error);
    }

    try {
      await this.client.setAuth();
    } catch (error) {
      this.setState("idle");
      throw safeTransportError("TABLETOP_REALTIME_AUTH_FAILED", error);
    }

    const sceneChannel = this.client.createChannel(sceneTopic, {
      config: {
        private: true,
        broadcast: { ack: true, self: false },
      },
    });
    const sessionChannel = this.client.createChannel(sessionTopic, {
      config: {
        private: true,
        broadcast: { ack: true, self: false },
        presence: { key: presence.data.userId, enabled: true },
      },
    });

    this.sceneChannel = sceneChannel;
    this.sessionChannel = sessionChannel;
    this.registerSceneListeners(sceneChannel);
    this.registerSessionListeners(sessionChannel);

    try {
      await Promise.all([this.subscribe(sceneChannel), this.subscribe(sessionChannel)]);

      const trackResult = await sessionChannel.track(presence.data);
      if (trackResult !== "ok") {
        throw safeTransportError("TABLETOP_REALTIME_PRESENCE_FAILED");
      }
      this.setState("connected");
    } catch (error) {
      await this.cleanupChannels();
      this.setState("disconnected");
      if (error instanceof TabletopRealtimeTransportError) throw error;
      throw safeTransportError("TABLETOP_REALTIME_SUBSCRIBE_FAILED", error);
    }
  }

  private registerSceneListeners(channel: TabletopRealtimeChannelAdapter): void {
    channel.on("broadcast", { event: TABLETOP_REALTIME_BROADCAST_EVENT }, (message) =>
      this.receiveEvent("scene", message),
    );
  }

  private registerSessionListeners(channel: TabletopRealtimeChannelAdapter): void {
    channel.on("broadcast", { event: TABLETOP_REALTIME_BROADCAST_EVENT }, (message) =>
      this.receiveEvent("session", message),
    );

    const syncPresence = () => this.emitPresenceSnapshot();
    channel.on("presence", { event: "sync" }, syncPresence);
    channel.on("presence", { event: "join" }, syncPresence);
    channel.on("presence", { event: "leave" }, syncPresence);
  }

  private subscribe(channel: TabletopRealtimeChannelAdapter): Promise<void> {
    const timeout = this.options.subscribeTimeoutMs ?? TABLETOP_REALTIME_SUBSCRIBE_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      let settled = false;
      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          if (!settled) {
            settled = true;
            resolve();
          }
          return;
        }

        if (settled) {
          if (!this.disconnecting) {
            this.setState(status === "CLOSED" ? "disconnected" : "degraded");
          }
          return;
        }

        settled = true;
        if (status === "TIMED_OUT") {
          reject(safeTransportError("TABLETOP_REALTIME_SUBSCRIBE_TIMEOUT", error));
          return;
        }
        reject(safeTransportError("TABLETOP_REALTIME_SUBSCRIBE_FAILED", error));
      }, timeout);
    });
  }

  private receiveEvent(scope: "scene" | "session", message: unknown): void {
    const event = parseTabletopRealtimeEvent(unwrapBroadcastPayload(message), {
      sceneId: this.options.sceneId,
      now: this.options.now?.(),
    });
    if (!event || event.sourceId === this.options.sourceId) return;

    const isSessionEvent = event.type === "scene.transition";
    if ((scope === "session") !== isSessionEvent) return;
    if (!this.eventGate.accept(event, this.options.now?.())) return;

    this.options.onEvent(event);
  }

  private emitPresenceSnapshot(): void {
    if (!this.sessionChannel) return;
    this.options.onPresence(flattenPresenceState(this.sessionChannel.presenceState()));
  }

  async send(event: TabletopRealtimeEvent): Promise<void> {
    if (!(await this.options.isEnabled())) {
      throw safeTransportError("TABLETOP_REALTIME_DISABLED");
    }
    if (this.state !== "connected" || !this.sceneChannel || !this.sessionChannel) {
      throw safeTransportError("TABLETOP_REALTIME_NOT_CONNECTED");
    }

    const parsed = parseTabletopRealtimeEvent(event, {
      sceneId: this.options.sceneId,
      now: this.options.now?.(),
    });
    if (!parsed || parsed.sourceId !== this.options.sourceId) {
      throw safeTransportError("TABLETOP_REALTIME_INVALID_EVENT");
    }

    const channel = parsed.type === "scene.transition" ? this.sessionChannel : this.sceneChannel;
    const result = await channel.send({
      type: "broadcast",
      event: TABLETOP_REALTIME_BROADCAST_EVENT,
      payload: parsed,
    });
    if (result !== "ok") {
      throw safeTransportError("TABLETOP_REALTIME_SEND_FAILED");
    }
  }

  async updatePresence(presence: TabletopPresence): Promise<void> {
    if (!(await this.options.isEnabled())) {
      throw safeTransportError("TABLETOP_REALTIME_DISABLED");
    }
    if (this.state !== "connected" || !this.sessionChannel) {
      throw safeTransportError("TABLETOP_REALTIME_NOT_CONNECTED");
    }

    const parsed = tabletopPresenceSchema.safeParse(presence);
    if (
      !parsed.success ||
      parsed.data.userId !== this.options.presence.userId ||
      parsed.data.sceneId !== this.options.sceneId
    ) {
      throw safeTransportError("TABLETOP_REALTIME_INVALID_CONTEXT");
    }

    const result = await this.sessionChannel.track(parsed.data);
    if (result !== "ok") {
      throw safeTransportError("TABLETOP_REALTIME_PRESENCE_FAILED");
    }
  }

  async disconnect(): Promise<void> {
    this.disconnecting = true;
    if (this.sessionChannel) {
      try {
        await this.sessionChannel.untrack();
      } catch {
        // A remoção do canal abaixo encerra a presença mesmo se o untrack falhar.
      }
    }
    await this.cleanupChannels();
    this.eventGate.clear();
    this.setState("disconnected");
    this.disconnecting = false;
  }

  private async cleanupChannels(): Promise<void> {
    const channels = [this.sceneChannel, this.sessionChannel].filter(
      (channel): channel is TabletopRealtimeChannelAdapter => channel !== null,
    );
    this.sceneChannel = null;
    this.sessionChannel = null;
    await Promise.allSettled(channels.map((channel) => this.client.removeChannel(channel)));
  }

  private setState(state: TabletopRealtimeConnectionState): void {
    if (state === this.state) return;
    this.state = state;
    this.options.onConnectionStateChange?.(state);
  }
}
