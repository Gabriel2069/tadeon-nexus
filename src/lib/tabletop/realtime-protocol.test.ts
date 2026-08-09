import { describe, expect, it } from "vitest";
import {
  parseTabletopPresence,
  parseTabletopRealtimeEvent,
  tabletopSceneChannel,
  tabletopSessionChannel,
  TabletopRealtimeEventGate,
  type TabletopRealtimeEvent,
} from "./realtime-protocol";

const sceneId = "11111111-1111-4111-8111-111111111111";
const entityId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const wallId = "44444444-4444-4444-8444-444444444444";

function event(sequence = 1, sentAt = 5_000): TabletopRealtimeEvent {
  return {
    protocol: 1,
    eventId: `event_${sequence}00`,
    sourceId: "browser_100",
    sceneId,
    sequence,
    sentAt,
    type: "token.drag-preview",
    payload: { entityId, x: 120, y: 240 },
  };
}

describe("protocolo Realtime da Mesa", () => {
  it("gera canais privados determinísticos somente para UUIDs válidos", () => {
    expect(tabletopSceneChannel(sceneId)).toBe(`tabletop:scene:${sceneId}`);
    expect(tabletopSessionChannel(userId)).toBe(`tabletop:session:${userId}`);
    expect(() => tabletopSceneChannel("../../public")).toThrow();
  });

  it("aceita evento atual da mesma cena e recusa cena, tempo ou payload inválido", () => {
    expect(
      parseTabletopRealtimeEvent(event(), { sceneId, now: 5_500 }),
    ).toEqual(event());
    expect(
      parseTabletopRealtimeEvent(event(), {
        sceneId: userId,
        now: 5_500,
      }),
    ).toBeNull();
    expect(
      parseTabletopRealtimeEvent(event(1, 1), { sceneId, now: 20_000 }),
    ).toBeNull();
    expect(
      parseTabletopRealtimeEvent(
        { ...event(), payload: { ...event().payload, executable: true } },
        { sceneId, now: 5_500 },
      ),
    ).toBeNull();
  });

  it("descarta eventos duplicados, fora de ordem e acima do limite local", () => {
    const gate = new TabletopRealtimeEventGate(2, 1_000);
    expect(gate.accept(event(1), 5_000)).toBe(true);
    expect(gate.accept(event(1), 5_010)).toBe(false);
    expect(gate.accept(event(2), 5_020)).toBe(true);
    expect(gate.accept(event(3), 5_030)).toBe(false);
    expect(gate.accept(event(4), 6_100)).toBe(true);
  });

  it("valida a notificação mínima de uma porta sem transportar geometria", () => {
    const doorEvent: TabletopRealtimeEvent = {
      ...event(),
      type: "structure.state",
      payload: { wallId, wallType: "door_open", version: 2 },
    };
    expect(
      parseTabletopRealtimeEvent(doorEvent, { sceneId, now: 5_500 }),
    ).toEqual(doorEvent);
    expect(
      parseTabletopRealtimeEvent(
        { ...doorEvent, payload: { ...doorEvent.payload, x1: 12 } },
        { sceneId, now: 5_500 },
      ),
    ).toBeNull();
  });

  it("limita Presence aos campos lentos previstos", () => {
    const presence = {
      userId,
      displayName: "Jogador",
      role: "player",
      sceneId,
      controlledTokenId: entityId,
      state: "connected",
      color: "#35b7a1",
      updatedAt: 5_000,
    };
    expect(parseTabletopPresence(presence)).toEqual(presence);
    expect(parseTabletopPresence({ ...presence, mouseX: 10 })).toBeNull();
  });
});
