import type { Database as GeneratedDatabase, Json } from "./types";

type TabletopWallRow = {
  id: string;
  scene_id: string;
  level_id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  wall_type: string;
  blocks_vision: boolean;
  blocks_movement: boolean;
  base_elevation: number;
  height: number;
  thickness: number;
  player_operable: boolean;
  version: number;
  properties: Json;
  created_at: string;
  updated_at: string;
};

type TabletopWallInsert = Partial<TabletopWallRow> &
  Pick<TabletopWallRow, "scene_id" | "level_id" | "x1" | "y1" | "x2" | "y2" | "wall_type">;

type TabletopWallUpdate = Partial<TabletopWallRow>;

export type RuntimeDatabase = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      tabletop_walls: {
        Row: TabletopWallRow;
        Insert: TabletopWallInsert;
        Update: TabletopWallUpdate;
        Relationships: [];
      };
    };
  };
};
