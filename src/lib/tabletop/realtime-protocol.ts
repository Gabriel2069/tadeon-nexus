import { z } from "zod";

export const TABLETOP_REALTIME_PROTOCOL_VERSION = 1 as const;
export const TABLETOP_REALTIME_EVENT_MAX_AGE_MS = 10_000;
export const TABLETOP_REALTIME_FUTURE_SKEW_MS = 3_000;

const uuidSchema = z.uuid();
const transportIdSchema = z
  .string()
  .min(8)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);
const coordinateSchema = z.number().finite().min(-1_000_000).max(1_000_000);
const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const eventBaseSchema = z.object({
  protocol: z.literal(TABLETOP_REALTIME_PROTOCOL_VERSION),
  eventId: transportIdSchema,
  sourceId: transportIdSchema,
  sceneId: uuidSchema,
  sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sentAt: z.number().int().nonnegative(),
});

export const tabletopRealtimeEventSchema = z.discriminatedUnion("type", [
  eventBaseSchema.extend({
    type: z.literal("token.drag-preview"),
    payload: z
      .object({
        entityId: uuidSchema,
        x: coordinateSchema,
        y: coordinateSchema,
      })
      .strict(),
  }),
  eventBaseSchema.extend({
    type: z.literal("pointer.ping"),
    payload: z
      .object({
        x: coordinateSchema,
        y: coordinateSchema,
        color: colorSchema.optional(),
        label: z.string().trim().min(1).max(80).optional(),
      })
      .strict(),
  }),
  eventBaseSchema.extend({
    type: z.literal("selection.preview"),
    payload: z
      .object({
        entityIds: z.array(uuidSchema).max(64),
      })
      .strict(),
  }),
  eventBaseSchema.extend({
    type: z.literal("drawing.preview"),
    payload: z
      .object({
        points: z
          .array(
            z.object({ x: coordinateSchema, y: coordinateSchema }).strict(),
          )
          .min(1)
          .max(128),
        color: colorSchema,
        width: z.number().finite().min(1).max(64),
      })
      .strict(),
  }),
  eventBaseSchema.extend({
    type: z.literal("scene.transition"),
    payload: z
      .object({
        targetSceneId: uuidSchema,
      })
      .strict(),
  }),
]);

export type TabletopRealtimeEvent = z.infer<typeof tabletopRealtimeEventSchema>;

export const tabletopPresenceSchema = z
  .object({
    userId: uuidSchema,
    displayName: z.string().trim().min(1).max(80),
    role: z.enum(["master", "co_master", "player", "observer"]),
    sceneId: uuidSchema,
    controlledTokenId: uuidSchema.nullable(),
    state: z.enum(["connected", "away"]),
    color: colorSchema,
    updatedAt: z.number().int().nonnegative(),
  })
  .strict();

export type TabletopPresence = z.infer<typeof tabletopPresenceSchema>;

export interface RealtimeParseOptions {
  sceneId: string;
  now?: number;
  maxAgeMs?: number;
  maxFutureSkewMs?: number;
}

export function parseTabletopRealtimeEvent(
  input: unknown,
  options: RealtimeParseOptions,
): TabletopRealtimeEvent | null {
  const parsed = tabletopRealtimeEventSchema.safeParse(input);
  if (!parsed.success || parsed.data.sceneId !== options.sceneId) return null;

  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? TABLETOP_REALTIME_EVENT_MAX_AGE_MS;
  const maxFutureSkewMs =
    options.maxFutureSkewMs ?? TABLETOP_REALTIME_FUTURE_SKEW_MS;
  const age = now - parsed.data.sentAt;
  if (age > maxAgeMs || age < -maxFutureSkewMs) return null;

  return parsed.data;
}

export function parseTabletopPresence(input: unknown): TabletopPresence | null {
  const parsed = tabletopPresenceSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}

export function tabletopSceneChannel(sceneId: string): string {
  return `tabletop:scene:${uuidSchema.parse(sceneId)}`;
}

export function tabletopSessionChannel(sessionId: string): string {
  return `tabletop:session:${uuidSchema.parse(sessionId)}`;
}

interface SourceWindow {
  startedAt: number;
  count: number;
}

export class TabletopRealtimeEventGate {
  private readonly lastSequence = new Map<string, number>();
  private readonly sourceWindows = new Map<string, SourceWindow>();

  constructor(
    private readonly maxEventsPerWindow = 40,
    private readonly windowMs = 1_000,
  ) {
    if (maxEventsPerWindow < 1 || windowMs < 1) {
      throw new Error("TABLETOP_INVALID_REALTIME_GATE");
    }
  }

  accept(event: TabletopRealtimeEvent, now = Date.now()): boolean {
    const previousSequence = this.lastSequence.get(event.sourceId);
    if (previousSequence !== undefined && event.sequence <= previousSequence) {
      return false;
    }

    const currentWindow = this.sourceWindows.get(event.sourceId);
    const window =
      !currentWindow || now - currentWindow.startedAt >= this.windowMs
        ? { startedAt: now, count: 0 }
        : currentWindow;
    if (window.count >= this.maxEventsPerWindow) return false;

    window.count += 1;
    this.sourceWindows.set(event.sourceId, window);
    this.lastSequence.set(event.sourceId, event.sequence);
    return true;
  }

  clearSource(sourceId: string): void {
    this.lastSequence.delete(sourceId);
    this.sourceWindows.delete(sourceId);
  }

  clear(): void {
    this.lastSequence.clear();
    this.sourceWindows.clear();
  }
}
