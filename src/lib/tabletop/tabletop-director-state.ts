import { z } from "zod";
import type { TabletopProjectionMode } from "./camera-controller";
import { DEFAULT_TABLETOP_VIEW_ORIENTATION } from "./tabletop-projection";

const coordinate = z.number().finite().min(-1_000_000).max(1_000_000);

export const tabletopDirectorCameraSchema = z
  .object({
    mode: z.enum(["fit", "manual"]),
    x: coordinate,
    y: coordinate,
    zoom: z.number().finite().min(0.15).max(4),
    projection: z.enum(["plan", "isometric"]),
    levelId: z.uuid().nullable(),
    yaw: z.number().finite().min(0).max(359.999).default(45),
    tilt: z.number().finite().min(0.18).max(0.9).default(0.5),
    elevationScale: z.number().finite().min(0.25).max(2.5).default(1),
  })
  .strict();

export const tabletopDirectorStateSchema = z
  .object({
    mode: z.enum(["scene", "intermission", "blackout"]),
    title: z.string().trim().max(160),
    subtitle: z.string().trim().max(320),
    showGrid: z.boolean(),
    showHud: z.boolean(),
    camera: tabletopDirectorCameraSchema,
  })
  .strict();

export type TabletopDirectorCamera = z.infer<
  typeof tabletopDirectorCameraSchema
>;
export type TabletopDirectorState = z.infer<typeof tabletopDirectorStateSchema>;

export const DEFAULT_TABLETOP_DIRECTOR_STATE: TabletopDirectorState = {
  mode: "scene",
  title: "",
  subtitle: "",
  showGrid: true,
  showHud: false,
  camera: {
    mode: "fit",
    x: 0,
    y: 0,
    zoom: 1,
    projection: "plan",
    levelId: null,
    ...DEFAULT_TABLETOP_VIEW_ORIENTATION,
  },
};

export function parseTabletopDirectorState(
  value: unknown,
): TabletopDirectorState {
  const parsed = tabletopDirectorStateSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : {
        ...DEFAULT_TABLETOP_DIRECTOR_STATE,
        camera: { ...DEFAULT_TABLETOP_DIRECTOR_STATE.camera },
      };
}

export function tabletopDirectorCameraFromView(input: {
  x: number;
  y: number;
  zoom: number;
  projection: TabletopProjectionMode;
  levelId: string | null;
  yaw: number;
  tilt: number;
  elevationScale: number;
}): TabletopDirectorCamera {
  return tabletopDirectorCameraSchema.parse({ ...input, mode: "manual" });
}
