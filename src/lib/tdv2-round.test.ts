import { describe, it, expect } from "vitest";
import { publicTdvRound, mergeTdvRound } from "./tdv2-round";
import { parseTabletopRealtimeEvent } from "./tabletop/realtime-protocol";
describe("public TdV round boundary", () => {
  const round = {
    version: 2,
    round: 2,
    impulses: 1,
    responses: 0,
    position: "Disputada",
    revision: 3,
  };
  it("projects only public counters", () => {
    expect(
      publicTdvRound({ ...round, notes: "SECRET", objective: "SECRET", participants: [] }),
    ).toEqual(round);
  });
  it("updates only the reserved projection and preserves unsaved authored properties", () => {
    const props = { notes: "Local draft", color: "ivory", tdv2_round: { ...round, impulses: 2 } };
    const next = mergeTdvRound(props, publicTdvRound(round));
    expect(next).toEqual({ ...props, tdv2_round: round });
    expect(props.tdv2_round.impulses).toBe(2);
    expect(mergeTdvRound(next, null)).toEqual({ notes: "Local draft", color: "ivory" });
  });
  it("refuses malformed or legacy budgets", () => {
    for (const patch of [
      { impulses: 3 },
      { responses: 2 },
      { round: 0 },
      { version: 1 },
      { position: "private" },
      { revision: Infinity },
    ])
      expect(publicTdvRound({ ...round, ...patch })).toBeNull();
  });
  it("accepts a scoped database invalidation without private state", () => {
    const event = {
      protocol: 1,
      eventId: "tdv2_event_0001",
      sourceId: "tdv2_database",
      sceneId: "00000000-0000-4000-8000-000000000010",
      sequence: 3,
      sentAt: 1000,
      type: "round.state",
      payload: { revision: 3 },
    };
    expect(parseTabletopRealtimeEvent(event, { sceneId: event.sceneId, now: 1000 })?.type).toBe(
      "round.state",
    );
    expect(
      parseTabletopRealtimeEvent(
        { ...event, payload: { revision: 3, notes: "PRIVATE" } },
        { sceneId: event.sceneId, now: 1000 },
      ),
    ).toBeNull();
  });
});
