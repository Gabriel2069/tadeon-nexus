import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { CampaignRole } from "@/lib/nexus-contracts";
import type { TabletopScene } from "@/lib/tabletop/types";
import type { TabletopVisibilityState } from "@/lib/tabletop/tabletop-visibility-service";

const uuidSchema = z.uuid();
const finiteNumber = z.number().finite();
const participantDatabase = supabase as unknown as SupabaseClient;

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

const participantHandoutAttachmentSchema = z
  .object({
    assetId: uuidSchema,
    name: z.string().trim().min(1).max(240),
    mimeType: z.string().trim().min(1).max(160),
    sizeBytes: z
      .number()
      .int()
      .nonnegative()
      .max(100 * 1024 * 1024),
    role: z.string().trim().max(80),
    caption: z.string().trim().max(500),
    url: z.url(),
  })
  .strict();

const participantHandoutSchema = z
  .object({
    nodeId: uuidSchema,
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().max(600),
    nodeType: z.string().trim().min(1).max(80),
    coverUrl: z.url().optional(),
    attachments: z.array(participantHandoutAttachmentSchema).max(16),
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
    levelId: uuidSchema,
    controllable: z.boolean(),
    properties: z.record(z.string(), z.unknown()),
    handout: participantHandoutSchema.optional(),
  })
  .strict();

const visibilityPointSchema = z
  .object({ x: finiteNumber, y: finiteNumber })
  .strict();

const participantVisibilitySchema = z
  .object({
    version: z.number().int().positive(),
    globalIllumination: finiteNumber.min(0).max(1),
    fogEnabled: z.boolean(),
    fogOpacity: finiteNumber.min(0).max(1),
    walls: z
      .array(
        z
          .object({
            id: uuidSchema,
            levelId: uuidSchema,
            x1: finiteNumber,
            y1: finiteNumber,
            x2: finiteNumber,
            y2: finiteNumber,
            wallType: z.enum(["door_closed", "door_open"]),
            blocksVision: z.boolean(),
            blocksMovement: z.boolean(),
            baseElevation: finiteNumber,
            height: finiteNumber.min(8).max(100_000),
            thickness: finiteNumber.min(1).max(1024),
            playerOperable: z.literal(true),
            version: z.number().int().positive(),
          })
          .strict(),
      )
      .max(128),
    lights: z
      .array(
        z
          .object({
            id: uuidSchema,
            levelId: uuidSchema,
            entityId: z.null(),
            x: finiteNumber,
            y: finiteNumber,
            elevation: finiteNumber,
            radius: finiteNumber.min(8).max(100_000),
            intensity: finiteNumber.min(0).max(1),
            color: z.string().regex(/^#[0-9a-f]{6}$/i),
            enabled: z.boolean(),
            castsShadows: z.boolean(),
            visibilityPolygon: z
              .array(visibilityPointSchema)
              .max(2048)
              .optional(),
          })
          .strict(),
      )
      .max(256),
    fogStrokes: z
      .array(
        z
          .object({
            id: uuidSchema,
            levelId: uuidSchema,
            operation: z.enum(["reveal", "hide"]),
            points: z.array(visibilityPointSchema).min(1).max(64),
            radius: finiteNumber.min(8).max(1024),
            sequenceIndex: z.number().int().min(0).max(100_000),
          })
          .strict(),
      )
      .max(512),
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
    activeLevelId: uuidSchema,
    levels: z
      .array(
        z
          .object({
            id: uuidSchema,
            name: z.string().trim().min(1).max(120),
            order: z.number().int().min(-100).max(100),
            baseElevation: finiteNumber,
            height: finiteNumber.min(8).max(100_000),
            visible: z.literal(true),
            locked: z.boolean(),
            version: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(1),
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
    visibility: participantVisibilitySchema.nullable(),
  })
  .strict();

export interface TabletopParticipantHandoutAttachment {
  assetId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  role: string;
  caption: string;
  url: string;
}

export interface TabletopParticipantHandout {
  nodeId: string;
  title: string;
  summary: string;
  nodeType: string;
  coverUrl?: string;
  attachments: TabletopParticipantHandoutAttachment[];
}

export type TabletopParticipantScene = Omit<TabletopScene, "entities"> & {
  activeLevelId: string;
  levels: NonNullable<TabletopScene["levels"]>;
  entities: Array<
    TabletopScene["entities"][number] & {
      controllable: boolean;
      handout?: TabletopParticipantHandout;
    }
  >;
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
  visibility: TabletopVisibilityState | null;
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

export function parseTabletopParticipantView(
  input: unknown,
): TabletopParticipantView {
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
      const status =
        "context" in error && error.context instanceof Response
          ? error.context.status
          : 0;
      if (status === 401)
        throw new TabletopParticipantError(
          "TABLETOP_PARTICIPANT_AUTH_REQUIRED",
        );
      if (status === 403)
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_FORBIDDEN");
      if (status === 404)
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_NOT_FOUND");
      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_UNAVAILABLE");
    }
    return parseTabletopParticipantView(data);
  }

  async toggleDoor(sessionId: string, wallId: string, expectedVersion: number) {
    if (
      !uuidSchema.safeParse(sessionId).success ||
      !uuidSchema.safeParse(wallId).success ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 1
    ) {
      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_NOT_FOUND");
    }
    const { data, error } = await participantDatabase.rpc(
      "toggle_tabletop_door",
      {
        target_session_id: sessionId,
        target_wall_id: wallId,
        expected_wall_version: expectedVersion,
      },
    );
    if (error) {
      if (error.code === "40001")
        throw new TabletopParticipantError(
          "TABLETOP_PARTICIPANT_INVALID_RESPONSE",
        );
      if (error.code === "42501")
        throw new TabletopParticipantError("TABLETOP_PARTICIPANT_FORBIDDEN");
      throw new TabletopParticipantError("TABLETOP_PARTICIPANT_UNAVAILABLE");
    }
    return z
      .object({
        wallId: uuidSchema,
        wallType: z.enum(["door_closed", "door_open"]),
        blocksVision: z.boolean(),
        blocksMovement: z.boolean(),
        version: z.number().int().positive(),
        visibilityVersion: z.number().int().positive(),
      })
      .strict()
      .parse(data);
  }
}

export const tabletopParticipantService = new TabletopParticipantService();
