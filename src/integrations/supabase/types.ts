export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      character_sheets: {
        Row: {
          abilities: Json
          age: string | null
          attributes: Json
          brand: string | null
          condition: string | null
          conditions: Json
          created_at: string
          defense_items: Json
          description: Json
          dying: number
          equilibrium: number
          exposure: number
          fragments: number
          fragments_items: Json
          going_insane: number
          id: string
          inventory: Json
          inventory_capacity: number
          motivation: string | null
          name: string
          notes: string | null
          occupation: string | null
          origin: string | null
          owner_email: string
          owner_id: string
          plots: Json
          pm_spent: number
          power_form_data: Json
          power_form_enabled: boolean
          purchased_skills: Json
          skill_bonus: string | null
          skills: Json
          stat_upgrades: Json
          stats: Json
          updated_at: string
          weapon_proficiency: string
          weapons: Json
        }
        Insert: {
          abilities?: Json
          age?: string | null
          attributes?: Json
          brand?: string | null
          condition?: string | null
          conditions?: Json
          created_at?: string
          defense_items?: Json
          description?: Json
          dying?: number
          equilibrium?: number
          exposure?: number
          fragments?: number
          fragments_items?: Json
          going_insane?: number
          id?: string
          inventory?: Json
          inventory_capacity?: number
          motivation?: string | null
          name: string
          notes?: string | null
          occupation?: string | null
          origin?: string | null
          owner_email: string
          owner_id: string
          plots?: Json
          pm_spent?: number
          power_form_data?: Json
          power_form_enabled?: boolean
          purchased_skills?: Json
          skill_bonus?: string | null
          skills?: Json
          stat_upgrades?: Json
          stats?: Json
          updated_at?: string
          weapon_proficiency?: string
          weapons?: Json
        }
        Update: {
          abilities?: Json
          age?: string | null
          attributes?: Json
          brand?: string | null
          condition?: string | null
          conditions?: Json
          created_at?: string
          defense_items?: Json
          description?: Json
          dying?: number
          equilibrium?: number
          exposure?: number
          fragments?: number
          fragments_items?: Json
          going_insane?: number
          id?: string
          inventory?: Json
          inventory_capacity?: number
          motivation?: string | null
          name?: string
          notes?: string | null
          occupation?: string | null
          origin?: string | null
          owner_email?: string
          owner_id?: string
          plots?: Json
          pm_spent?: number
          power_form_data?: Json
          power_form_enabled?: boolean
          purchased_skills?: Json
          skill_bonus?: string | null
          skills?: Json
          stat_upgrades?: Json
          stats?: Json
          updated_at?: string
          weapon_proficiency?: string
          weapons?: Json
        }
        Relationships: []
      }
      game_settings: {
        Row: {
          clues: Json
          condition_options: Json
          id: string
          initiative_notes: string | null
          initiative_order: Json
          key: string
          monsters: Json
          npcs: Json
          pinned_sheet_ids: Json
          quick_refs: string | null
          rank_table: Json
          reminders: string | null
          scene_combat: string | null
          scene_dialogue: string | null
          scene_investigation: string | null
          scenes_detailed: Json
          skill_branches: Json
          skill_groups: Json
          skill_training_costs: Json
          updated_at: string
          upgrade_costs: Json
        }
        Insert: {
          clues?: Json
          condition_options?: Json
          id?: string
          initiative_notes?: string | null
          initiative_order?: Json
          key?: string
          monsters?: Json
          npcs?: Json
          pinned_sheet_ids?: Json
          quick_refs?: string | null
          rank_table?: Json
          reminders?: string | null
          scene_combat?: string | null
          scene_dialogue?: string | null
          scene_investigation?: string | null
          scenes_detailed?: Json
          skill_branches?: Json
          skill_groups?: Json
          skill_training_costs?: Json
          updated_at?: string
          upgrade_costs?: Json
        }
        Update: {
          clues?: Json
          condition_options?: Json
          id?: string
          initiative_notes?: string | null
          initiative_order?: Json
          key?: string
          monsters?: Json
          npcs?: Json
          pinned_sheet_ids?: Json
          quick_refs?: string | null
          rank_table?: Json
          reminders?: string | null
          scene_combat?: string | null
          scene_dialogue?: string | null
          scene_investigation?: string | null
          scenes_detailed?: Json
          skill_branches?: Json
          skill_groups?: Json
          skill_training_costs?: Json
          updated_at?: string
          upgrade_costs?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_game_settings: { Args: never; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "mestre" | "jogador" | "espectador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["mestre", "jogador", "espectador"],
    },
  },
} as const
