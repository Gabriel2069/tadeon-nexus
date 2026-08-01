import { describe, expect, it } from "vitest";
import {
  mapTabletopSession,
  normalizeTabletopSessionName,
  TabletopSessionServiceError,
  toTabletopSessionServiceError,
} from "./tabletop-session-service";

describe("tabletop session service", () => {
  it("normalizes a safe room name", () => {
    expect(normalizeTabletopSessionName("  Sessão   do Véu  ")).toBe(
      "Sessão do Véu",
    );
  });

  it("rejects empty and oversized names", () => {
    expect(() => normalizeTabletopSessionName("   ")).toThrow(
      TabletopSessionServiceError,
    );
    expect(() => normalizeTabletopSessionName("a".repeat(161))).toThrow(
      TabletopSessionServiceError,
    );
  });

  it("maps database columns without exposing raw rows", () => {
    expect(
      mapTabletopSession({
        id: "session",
        campaign_id: "campaign",
        current_scene_id: "scene",
        name: "Sessão ao vivo",
        status: "open",
        join_locked: false,
        version: 4,
        created_by: "master",
        created_at: "2026-08-01T00:00:00Z",
        updated_at: "2026-08-01T01:00:00Z",
      }),
    ).toEqual({
      id: "session",
      campaignId: "campaign",
      currentSceneId: "scene",
      name: "Sessão ao vivo",
      status: "open",
      joinLocked: false,
      version: 4,
      createdBy: "master",
      createdAt: "2026-08-01T00:00:00Z",
      updatedAt: "2026-08-01T01:00:00Z",
    });
  });

  it("converts database failures to stable public error codes", () => {
    expect(
      toTabletopSessionServiceError({
        code: "42501",
        message: "TABLETOP_REALTIME_DISABLED",
      }).code,
    ).toBe("TABLETOP_SESSION_DISABLED");
    expect(
      toTabletopSessionServiceError({
        code: "40001",
        message: "TABLETOP_SESSION_VERSION_CONFLICT",
      }).code,
    ).toBe("TABLETOP_SESSION_CONFLICT");
    expect(
      toTabletopSessionServiceError({
        code: "XX000",
        message: "internal details that must stay private",
      }).code,
    ).toBe("TABLETOP_SESSION_DATABASE_ERROR");
  });
});
