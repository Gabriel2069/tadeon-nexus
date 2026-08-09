import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeTabletopViewState,
  type TabletopViewState,
} from "./tabletop-projection";

const tabletopViewDatabase = supabase as unknown as SupabaseClient;

interface TabletopViewPreferenceRow {
  scene_id: string;
  user_id: string;
  projection: string;
  camera_x: number | string;
  camera_y: number | string;
  zoom: number | string;
  yaw: number | string;
  tilt: number | string;
  elevation_scale: number | string;
  active_level_id: string | null;
}

export class TabletopViewPreferenceError extends Error {
  constructor() {
    super("TABLETOP_VIEW_PREFERENCE_ERROR");
    this.name = "TabletopViewPreferenceError";
  }
}

export function mapTabletopViewPreference(
  row: TabletopViewPreferenceRow,
): TabletopViewState {
  return normalizeTabletopViewState({
    projection: row.projection === "isometric" ? "isometric" : "plan",
    x: Number(row.camera_x),
    y: Number(row.camera_y),
    zoom: Number(row.zoom),
    yaw: Number(row.yaw),
    tilt: Number(row.tilt),
    elevationScale: Number(row.elevation_scale),
    levelId: row.active_level_id,
  });
}

export class TabletopViewPreferenceService {
  constructor(
    private readonly database: SupabaseClient = tabletopViewDatabase,
    private readonly auth = supabase.auth,
  ) {}

  async load(sceneId: string): Promise<TabletopViewState | null> {
    const { data, error } = await this.database
      .from("tabletop_view_preferences")
      .select(
        "scene_id,user_id,projection,camera_x,camera_y,zoom,yaw,tilt,elevation_scale,active_level_id",
      )
      .eq("scene_id", sceneId)
      .maybeSingle();
    if (error) throw new TabletopViewPreferenceError();
    return data
      ? mapTabletopViewPreference(data as TabletopViewPreferenceRow)
      : null;
  }

  async save(sceneId: string, state: TabletopViewState) {
    const { data } = await this.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new TabletopViewPreferenceError();
    const normalized = normalizeTabletopViewState(state);
    const { error } = await this.database
      .from("tabletop_view_preferences")
      .upsert(
        {
          scene_id: sceneId,
          user_id: userId,
          projection: normalized.projection,
          camera_x: normalized.x,
          camera_y: normalized.y,
          zoom: normalized.zoom,
          yaw: normalized.yaw,
          tilt: normalized.tilt,
          elevation_scale: normalized.elevationScale,
          active_level_id: normalized.levelId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "scene_id,user_id" },
      );
    if (error) throw new TabletopViewPreferenceError();
  }
}

export const tabletopViewPreferenceService =
  new TabletopViewPreferenceService();
