import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignRole } from "@/lib/nexus-contracts";

const tabletopSessionDatabase = supabase as unknown as SupabaseClient;

export type TabletopSessionServiceErrorCode =
  | "TABLETOP_SESSION_AUTH_REQUIRED"
  | "TABLETOP_SESSION_DISABLED"
  | "TABLETOP_SESSION_CONFLICT"
  | "TABLETOP_SESSION_INVALID_INPUT"
  | "TABLETOP_SESSION_FORBIDDEN"
  | "TABLETOP_SESSION_DATABASE_ERROR";

export class TabletopSessionServiceError extends Error {
  constructor(public readonly code: TabletopSessionServiceErrorCode) {
    super(code);
    this.name = "TabletopSessionServiceError";
  }
}

interface SessionRow {
  id: string;
  campaign_id: string;
  current_scene_id: string | null;
  name: string;
  status: "open" | "closed";
  join_locked: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  session_id: string;
  user_id: string;
  role: CampaignRole;
  state: "active" | "left" | "removed";
  joined_at: string;
  last_seen_at: string;
  left_at: string | null;
}

export interface TabletopSession {
  id: string;
  campaignId: string;
  currentSceneId: string | null;
  name: string;
  status: SessionRow["status"];
  joinLocked: boolean;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TabletopSessionParticipant {
  sessionId: string;
  userId: string;
  role: CampaignRole;
  state: ParticipantRow["state"];
  joinedAt: string;
  lastSeenAt: string;
  leftAt: string | null;
}

export function normalizeTabletopSessionName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > 160) {
    throw new TabletopSessionServiceError("TABLETOP_SESSION_INVALID_INPUT");
  }
  return normalized;
}

export function mapTabletopSession(row: SessionRow): TabletopSession {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    currentSceneId: row.current_scene_id,
    name: row.name,
    status: row.status,
    joinLocked: row.join_locked,
    version: row.version,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTabletopSessionParticipant(
  row: ParticipantRow,
): TabletopSessionParticipant {
  return {
    sessionId: row.session_id,
    userId: row.user_id,
    role: row.role,
    state: row.state,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    leftAt: row.left_at,
  };
}

export function toTabletopSessionServiceError(error: {
  code?: string;
  message?: string;
} | null) {
  const message = error?.message ?? "";
  if (message.includes("TABLETOP_AUTH_REQUIRED")) {
    return new TabletopSessionServiceError("TABLETOP_SESSION_AUTH_REQUIRED");
  }
  if (message.includes("TABLETOP_REALTIME_DISABLED")) {
    return new TabletopSessionServiceError("TABLETOP_SESSION_DISABLED");
  }
  if (
    error?.code === "40001" ||
    error?.code === "23505" ||
    message.includes("TABLETOP_SESSION_VERSION_CONFLICT") ||
    message.includes("TABLETOP_SESSION_ALREADY_OPEN")
  ) {
    return new TabletopSessionServiceError("TABLETOP_SESSION_CONFLICT");
  }
  if (
    error?.code?.startsWith("22") ||
    error?.code === "23514" ||
    message.includes("TABLETOP_INVALID_SESSION")
  ) {
    return new TabletopSessionServiceError("TABLETOP_SESSION_INVALID_INPUT");
  }
  if (
    error?.code === "42501" ||
    message.includes("TABLETOP_SESSION_NOT_")
  ) {
    return new TabletopSessionServiceError("TABLETOP_SESSION_FORBIDDEN");
  }
  return new TabletopSessionServiceError("TABLETOP_SESSION_DATABASE_ERROR");
}

export class TabletopSessionService {
  constructor(private readonly database: SupabaseClient = tabletopSessionDatabase) {}

  async findOpenSession(campaignId: string): Promise<TabletopSession | null> {
    const { data, error } = await this.database
      .from("tabletop_sessions")
      .select(
        "id,campaign_id,current_scene_id,name,status,join_locked,version,created_by,created_at,updated_at",
      )
      .eq("campaign_id", campaignId)
      .eq("status", "open")
      .maybeSingle();
    if (error) throw toTabletopSessionServiceError(error);
    return data ? mapTabletopSession(data as SessionRow) : null;
  }

  async listParticipants(
    sessionId: string,
  ): Promise<TabletopSessionParticipant[]> {
    const { data, error } = await this.database
      .from("tabletop_session_participants")
      .select(
        "session_id,user_id,role,state,joined_at,last_seen_at,left_at",
      )
      .eq("session_id", sessionId)
      .order("joined_at");
    if (error) throw toTabletopSessionServiceError(error);
    return (data ?? []).map((row) =>
      mapTabletopSessionParticipant(row as ParticipantRow),
    );
  }

  async openSession({
    campaignId,
    sceneId,
    name,
  }: {
    campaignId: string;
    sceneId: string;
    name: string;
  }) {
    const { data, error } = await this.database.rpc("open_tabletop_session", {
      target_campaign_id: campaignId,
      target_scene_id: sceneId,
      session_name: normalizeTabletopSessionName(name),
    });
    if (error || typeof data !== "string") {
      throw toTabletopSessionServiceError(error);
    }
    return data;
  }

  async joinSession(sessionId: string): Promise<CampaignRole> {
    const { data, error } = await this.database.rpc("join_tabletop_session", {
      target_session_id: sessionId,
    });
    if (error || typeof data !== "string") {
      throw toTabletopSessionServiceError(error);
    }
    return data as CampaignRole;
  }

  async leaveSession(sessionId: string) {
    const { error } = await this.database.rpc("leave_tabletop_session", {
      target_session_id: sessionId,
    });
    if (error) throw toTabletopSessionServiceError(error);
  }

  async moveSessionScene(
    sessionId: string,
    sceneId: string,
    expectedVersion: number,
  ) {
    const { data, error } = await this.database.rpc(
      "move_tabletop_session_scene",
      {
        target_session_id: sessionId,
        target_scene_id: sceneId,
        expected_session_version: expectedVersion,
      },
    );
    if (error || typeof data !== "number") {
      throw toTabletopSessionServiceError(error);
    }
    return data;
  }

  async setSessionLock(
    sessionId: string,
    locked: boolean,
    expectedVersion: number,
  ) {
    const { data, error } = await this.database.rpc(
      "set_tabletop_session_lock",
      {
        target_session_id: sessionId,
        locked,
        expected_session_version: expectedVersion,
      },
    );
    if (error || typeof data !== "number") {
      throw toTabletopSessionServiceError(error);
    }
    return data;
  }

  async closeSession(sessionId: string, expectedVersion: number) {
    const { data, error } = await this.database.rpc("close_tabletop_session", {
      target_session_id: sessionId,
      expected_session_version: expectedVersion,
    });
    if (error || typeof data !== "number") {
      throw toTabletopSessionServiceError(error);
    }
    return data;
  }
}

export const tabletopSessionService = new TabletopSessionService();
