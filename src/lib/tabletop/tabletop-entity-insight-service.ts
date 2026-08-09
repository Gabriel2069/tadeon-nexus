import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  normalizeTabletopSheetSummary,
  type TabletopSheetSummary,
} from "@/lib/tabletop/tabletop-entity-insight";

const tabletopInsightDatabase = supabase as unknown as SupabaseClient;

export class TabletopEntityInsightService {
  async loadSheetSummary(
    sheetId: string,
  ): Promise<TabletopSheetSummary | null> {
    const { data, error } = await tabletopInsightDatabase
      .from("character_sheets")
      .select(
        "id,name,occupation,brand,origin,exposure,equilibrium,condition,conditions,stats",
      )
      .eq("id", sheetId)
      .maybeSingle();
    if (error) throw error;
    return data
      ? normalizeTabletopSheetSummary(data as Record<string, unknown>)
      : null;
  }
}

export const tabletopEntityInsightService = new TabletopEntityInsightService();
