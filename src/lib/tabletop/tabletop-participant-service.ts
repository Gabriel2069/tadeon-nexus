import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignRole } from "@/lib/nexus-contracts";
import type { TabletopScene } from "@/lib/tabletop/types";

const uuidSchema = z.uuid();
const finiteNumber = z.number().finite();

const participantLayerSchema = z
  .object({
    id: uuidSchema,
    name: z.string().trim().min(1).max(160),
    order: z.number().int().min(0).max(1000),
    visible: z.literal(true),
    locked: z.boolean(),
    layerType: z.enum(["map", "objects", "tokens", "drawings"]),
  })
  .strict();

const participantEntitySchema = z
  .object({
    id: uuidSchema,
    layerId: uuidSchema,
    type: z.enum([
      "token",
      "creature",
      "npc",
      "character",
      "object",
      "tile",
      "drawing",
      "text",
      "marker",
      "note",
      "area",
      "light",
      "handout_pin",
    ]),
    label: z.string().trim().min(1).max(240),
    x: finiteNumber,
    y: finiteNumber,
    width: finiteNumber.positive().max(100_000),
    height: finiteNumber.positive().max(100_000),
    rotation: finiteNumber,
    zIndex: z.number().int().min(-100_000).max(100_000),
    hidden: z.literal(false),
    locked: z.boolean(),
    color: z.number().int().min(0).max(0xffffff),
    assetUrl: z.url().optional(),
    elevation: finiteNumber.optional(),
    controllable: z.boolean(),
    properties: z.record(z.string(), z.unknown()),
  })
  .strict();

const participantSceneSchema = z
  .object({
    id: uuidSchema,
    name: z.string().trim().min(1).max(160),
    width: z.number().int().min(320).max(100_000),
    height: z.number().int().min(320).max(100_000),
    gridMode: z.enum(["square", "none"]),
    gridSize: z.number().int().min(8).max(512),
    gridScale: finiteNumber.positive().max(100),
    snap: z.boolean(),
    backgroundAssetUrl: z.url().optional(),
    layers: z.array(participantLayerSchema).max(32),
    entities: z.array(participantEntitySchema).max(2_000),
  })
  .strict();

const participantViewSchema = z
  .object({
    session: z
      .object({
        id: uuidSchema,
        name: z.string().trim().min(1).max(160),
        campaignId: uuidSchema,
        currentSceneId: uuidSchema.nullable(),
        version: z.number().int().nonnegative(),
        joinLocked: z.boolean(),
      })
      .strict(),
    participant: z
      .object({
        role: z.enum(["master", "co_master", "player", "observer"]),
        canInteract: z.boolean(),
      })
      .strict(),
    scene: participantSceneSchema.nullable(),
  })
  .strict();

export type TabletopParticipantScene = TabletopScene & {
  entities: Array<TabletopScene["entities"][number] & { controllable: boolean }>;
};

export interface TabletopParticipantView {
  session: {
    id: string;
    name: string;
    campaignId: string;
    currentSceneId: string | null;
    version: number;
    joinLocked: boolean;
  };
  participant: {
    role: CampaignRole;
    canInteract: boolean;
  };
  scene: TabletopParticipantScene | null;
}

export type TabletopParticipantErrorCode =
  | "TABLETOP_PARTICIPANT_AUTH_REQUIRED"
  | "TABLETOP_PARTICIPANT_FORBIDDEN"
  | "TABLETOP_PARTICIPANT_NOT_FOUND"
  | "TABLETOP_PARTICIPANT_INVALID_RESPONSE"
  | "TABLETOP_PARTICIPANT_UNAVAILABLE";

export class TabletopParticipantError extends Error {
  constructor(public readonly code: TabletopParticipantErrorCode) {
    super(code);
    this.name = "TabletopParticipantError";
  }
}

export function parseTabletopParticipantView(input: unknown): TabletopParticipantView {
  const parsed = participantViewSchema.safeParse(input);
  if (!parsed.success) {
    throw new TabletopParticipantError("TABLETOP_PARTICIPANT_INVALID_RESPONSE");
  }
  return parsed.data as TabletopParticipantView;
}

export class TabletopParticipantService {
  async load(sessionId: string): Promise<TabletopParticipantView> {
    if (!uuidSchema.safeParse(sessionId).success) {
      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_NOT_FOUND");
    }

    const { data, error } = await supabase.functions.invoke("tabletop-view", {
      body: { sessionId },
    });
    if (error) {
      const status = "context" in error && error.context instanceof Response
        ? error.context.status
        : 0;
      if (status === 401)
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_AUTH_REQUIRED");
      if (status === 403)
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_FORBIDDEN");
      if (status === 404)
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_NOT_FOUND");
      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_UNAVAILABLE");
    }
    return parseTabletopParticipantView(data);
  }
}

export const tabletopParticipantService = new TabletopParticipantService();
