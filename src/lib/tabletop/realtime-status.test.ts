import { describe, expect, it } from "vitest";
import { getTabletopRealtimeStatusPresentation } from "./realtime-status";

describe("apresentação do estado Realtime da Mesa", () => {
  it("mantém uma mensagem segura quando a flag está desligada", () => {
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: false,
        state: "connected",
        participantCount: 8,
      }),
    ).toMatchObject({
      label: "Sincronização preparada",
      tone: "neutral",
      canRetry: false,
    });
  });

  it("flexiona a contagem de participantes conectados", () => {
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: true,
        state: "connected",
        participantCount: 1,
      }).label,
    ).toBe("1 participante ao vivo");
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: true,
        state: "connected",
        participantCount: 4,
      }).label,
    ).toBe("4 participantes ao vivo");
  });

  it("só oferece reconexão para estados recuperáveis", () => {
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: true,
        state: "degraded",
        participantCount: 2,
      }).canRetry,
    ).toBe(true);
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: true,
        state: "disconnected",
        participantCount: 0,
      }).canRetry,
    ).toBe(true);
    expect(
      getTabletopRealtimeStatusPresentation({
        enabled: true,
        state: "connecting",
        participantCount: 0,
      }).canRetry,
    ).toBe(false);
  });
});
