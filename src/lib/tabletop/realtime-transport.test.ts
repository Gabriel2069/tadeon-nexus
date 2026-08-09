import { describe, expect, it } from "vitest";
import {
  TABLETOP_REALTIME_BROADCAST_EVENT,
  TabletopRealtimeTransport,
  TabletopRealtimeTransportError,
  type TabletopRealtimeChannelAdapter,
  type TabletopRealtimeClientAdapter,
} from "./realtime-transport";
import type { TabletopPresence, TabletopRealtimeEvent } from "./realtime-protocol";

const sessionId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sceneId = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";

const presence: TabletopPresence = {
  userId,
  displayName: "Gabriel",
  role: "master",
  sceneId,
  controlledTokenId: null,
  state: "connected",
  color: "#35b7a1",
  updatedAt: 5_000,
};

function event(
  type: TabletopRealtimeEvent["type"] = "pointer.ping",
  sequence = 1,
): TabletopRealtimeEvent {
  const base = {
    protocol: 1 as const,
    eventId: `event_${sequence}00`,
    sourceId: "remote_100",
    sceneId,
    sequence,
    sentAt: 5_000,
  };
  if (type === "scene.transition") {
    return { ...base, type, payload: { targetSceneId: sceneId } };
  }
  return { ...base, type: "pointer.ping", payload: { x: 10, y: 20 } };
}

class FakeChannel implements TabletopRealtimeChannelAdapter {
  readonly listeners: Array<{
    type: string;
    event: string;
    callback: (payload?: unknown) => void;
  }> = [];
  readonly sent: TabletopRealtimeEvent[] = [];
  tracked: TabletopPresence[] = [];
  untracked = false;
  state: Record<string, unknown> = {};
  subscribeStatus: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR" = "SUBSCRIBED";
  private subscribeCallback:
    | ((
        status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
        error?: Error,
      ) => void)
    | null = null;

  on(
    type: "broadcast" | "presence",
    filter: Record<string, string>,
    callback: (payload?: unknown) => void,
  ) {
    this.listeners.push({ type, event: filter.event, callback });
    return this;
  }

  subscribe(
    callback: (
      status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
      error?: Error,
    ) => void,
  ) {
    this.subscribeCallback = callback;
    callback(
      this.subscribeStatus,
      this.subscribeStatus === "CHANNEL_ERROR" ? new Error("raw database detail") : undefined,
    );
    return this;
  }

  async send(message: { payload: TabletopRealtimeEvent }) {
    this.sent.push(message.payload);
    return "ok" as const;
  }

  async track(value: TabletopPresence) {
    this.tracked.push(value);
    return "ok" as const;
  }

  async untrack() {
    this.untracked = true;
    return "ok" as const;
  }

  presenceState() {
    return this.state;
  }

  emit(type: string, eventName: string, payload?: unknown) {
    for (const listener of this.listeners) {
      if (listener.type === type && listener.event === eventName) {
        listener.callback(payload);
      }
    }
  }

  emitStatus(
    status: "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR",
  ) {
    this.subscribeCallback?.(
      status,
      status === "CHANNEL_ERROR" ? new Error("raw database detail") : undefined,
    );
  }
}

function setup(enabled = true) {
  const channels: Array<{
    topic: string;
    options: unknown;
    channel: FakeChannel;
  }> = [];
  const removed: FakeChannel[] = [];
  const callOrder: string[] = [];
  const events: TabletopRealtimeEvent[] = [];
  const presenceSnapshots: TabletopPresence[][] = [];
  const states: string[] = [];

  const client: TabletopRealtimeClientAdapter = {
    async setAuth(expectedUserId) {
      callOrder.push(`auth:${expectedUserId}`);
    },
    createChannel(topic, options) {
      callOrder.push(`channel:${topic}`);
      const channel = new FakeChannel();
      channels.push({ topic, options, channel });
      return channel;
    },
    async removeChannel(channel) {
      removed.push(channel as FakeChannel);
    },
  };

  const transport = new TabletopRealtimeTransport(
    {
      sessionId,
      sceneId,
      sourceId: "browser_100",
      presence,
      isEnabled: () => enabled,
      onEvent: (value) => events.push(value),
      onPresence: (value) => presenceSnapshots.push(value),
      onConnectionStateChange: (value) => states.push(value),
      now: () => 5_500,
    },
    client,
  );

  return {
    transport,
    client,
    channels,
    removed,
    callOrder,
    events,
    presenceSnapshots,
    states,
  };
}

describe("transporte Realtime privado da Mesa Nexus", () => {
  it("não autentica nem cria canais quando a flag está desligada", async () => {
    const context = setup(false);

    await expect(context.transport.connect()).rejects.toMatchObject({
      code: "TABLETOP_REALTIME_DISABLED",
    });
    expect(context.callOrder).toEqual([]);
    expect(context.channels).toHaveLength(0);
  });

  it("autentica antes de abrir os canais privados de cena e sessão", async () => {
    const context = setup();
    await context.transport.connect();

    expect(context.callOrder).toEqual([
      `auth:${userId}`,
      `channel:tabletop:scene:${sceneId}`,
      `channel:tabletop:session:${sessionId}`,
    ]);
    expect(context.channels).toHaveLength(2);
    for (const channel of context.channels) {
      expect(channel.options).toMatchObject({
        config: { private: true, broadcast: { ack: true, self: false } },
      });
    }
    expect(context.channels[1].options).toMatchObject({
      config: { presence: { key: userId, enabled: true } },
    });
    expect(context.channels[1].channel.tracked).toEqual([presence]);
    expect(context.transport.connectionState).toBe("connected");
  });

  it("roteia eventos efêmeros pela cena e transições pela sessão", async () => {
    const context = setup();
    await context.transport.connect();
    const sceneEvent = {
      ...event(),
      sourceId: "browser_100",
    } as TabletopRealtimeEvent;
    const transition = {
      ...event("scene.transition", 2),
      sourceId: "browser_100",
    } as TabletopRealtimeEvent;

    await context.transport.send(sceneEvent);
    await context.transport.send(transition);

    expect(context.channels[0].channel.sent).toEqual([sceneEvent]);
    expect(context.channels[1].channel.sent).toEqual([transition]);
  });

  it("descarta origem própria, duplicata, evento velho e evento no canal errado", async () => {
    const context = setup();
    await context.transport.connect();
    const sceneChannel = context.channels[0].channel;
    const sessionChannel = context.channels[1].channel;

    sceneChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: event("pointer.ping", 1),
    });
    sceneChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: event("pointer.ping", 1),
    });
    sceneChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: { ...event("pointer.ping", 2), sourceId: "browser_100" },
    });
    sceneChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: event("scene.transition", 3),
    });
    sessionChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: event("scene.transition", 4),
    });
    sceneChannel.emit("broadcast", TABLETOP_REALTIME_BROADCAST_EVENT, {
      payload: { ...event("pointer.ping", 5), sentAt: 20_000 },
    });

    expect(context.events).toEqual([event("pointer.ping", 1), event("scene.transition", 4)]);
  });

  it("normaliza Presence, remove metadados internos e mantém a entrada mais nova", async () => {
    const context = setup();
    await context.transport.connect();
    const sessionChannel = context.channels[1].channel;
    sessionChannel.state = {
      [userId]: [
        { ...presence, displayName: "Antigo", updatedAt: 4_000 },
        { ...presence, presence_ref: "server-ref" },
      ],
      invalid: [{ ...presence, userId: "not-a-uuid" }],
    };

    sessionChannel.emit("presence", "sync");

    expect(context.presenceSnapshots).toEqual([[presence]]);
  });

  it("limpa Presence e os dois canais ao desconectar", async () => {
    const context = setup();
    await context.transport.connect();
    await context.transport.disconnect();

    expect(context.channels[1].channel.untracked).toBe(true);
    expect(context.removed).toEqual(context.channels.map(({ channel }) => channel));
    expect(context.transport.connectionState).toBe("disconnected");
  });

  it("reflete degradação e volta a conectado quando os dois canais se recuperam", async () => {
    const context = setup();
    await context.transport.connect();

    context.channels[0].channel.emitStatus("CHANNEL_ERROR");
    expect(context.transport.connectionState).toBe("degraded");

    context.channels[0].channel.emitStatus("SUBSCRIBED");
    expect(context.transport.connectionState).toBe("connected");

    context.channels[1].channel.emitStatus("CLOSED");
    expect(context.transport.connectionState).toBe("disconnected");

    context.channels[1].channel.emitStatus("SUBSCRIBED");
    expect(context.transport.connectionState).toBe("connected");
  });

  it("não expõe a mensagem bruta do provedor em falhas de assinatura", async () => {
    const context = setup();
    const create = context.client.createChannel.bind(context.client);
    context.client.createChannel = (topic, options) => {
      const channel = create(topic, options) as FakeChannel;
      channel.subscribeStatus = "CHANNEL_ERROR";
      return channel;
    };

    let thrown: unknown;
    try {
      await context.transport.connect();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(TabletopRealtimeTransportError);
    expect((thrown as Error).message).not.toContain("raw database detail");
    expect(context.removed).toHaveLength(2);
  });

  it("rejeita evento de outra origem local antes do envio", async () => {
    const context = setup();
    await context.transport.connect();

    await expect(context.transport.send(event())).rejects.toMatchObject({
      code: "TABLETOP_REALTIME_INVALID_EVENT",
    });
    expect(context.channels[0].channel.sent).toHaveLength(0);
  });
});
