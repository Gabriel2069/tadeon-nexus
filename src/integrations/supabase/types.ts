export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      app_error_logs: {
        Row: {
          context: Json;
          created_at: string;
          fingerprint: string;
          id: string;
          message: string;
          resolved_at: string | null;
          resolved_by: string | null;
          route: string;
          severity: string;
          source: string;
          user_id: string;
        };
        Insert: {
          context?: Json;
          created_at?: string;
          fingerprint: string;
          id?: string;
          message: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          route?: string;
          severity?: string;
          source?: string;
          user_id: string;
        };
        Update: {
          context?: Json;
          created_at?: string;
          fingerprint?: string;
          id?: string;
          message?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          route?: string;
          severity?: string;
          source?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          actor_user_id: string | null;
          campaign_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json;
          resource_id: string | null;
          resource_type: string;
          workspace_id: string | null;
        };
        Insert: {
          actor_user_id?: string | null;
          campaign_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json;
          resource_id?: string | null;
          resource_type?: string;
          workspace_id?: string | null;
        };
        Update: {
          actor_user_id?: string | null;
          campaign_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json;
          resource_id?: string | null;
          resource_type?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_members: {
        Row: {
          campaign_id: string;
          created_at: string;
          role: Database["public"]["Enums"]["campaign_role"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          campaign_id: string;
          created_at?: string;
          role: Database["public"]["Enums"]["campaign_role"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          campaign_id?: string;
          created_at?: string;
          role?: Database["public"]["Enums"]["campaign_role"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      campaigns: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      character_sheets: {
        Row: {
          abilities: Json;
          age: string | null;
          attributes: Json;
          brand: string | null;
          campaign_id: string | null;
          condition: string | null;
          conditions: Json;
          created_at: string;
          defense_items: Json;
          description: Json;
          dying: number;
          equilibrium: number;
          exposure: number;
          fragments: number;
          fragments_items: Json;
          going_insane: number;
          id: string;
          initial_skill_degrees: Json;
          inventory: Json;
          inventory_capacity: number;
          motivation: string | null;
          name: string;
          notes: string | null;
          occupation: string | null;
          origin: string | null;
          owner_id: string;
          plots: Json;
          pm_spent: number;
          power_form_data: Json;
          power_form_enabled: boolean;
          purchased_skills: Json;
          skill_bonus: string | null;
          skills: Json;
          stat_upgrades: Json;
          stats: Json;
          updated_at: string;
          weapon_proficiency: string;
          weapon_proficiency_family: string;
          weapons: Json;
        };
        Insert: {
          abilities?: Json;
          age?: string | null;
          attributes?: Json;
          brand?: string | null;
          campaign_id?: string | null;
          condition?: string | null;
          conditions?: Json;
          created_at?: string;
          defense_items?: Json;
          description?: Json;
          dying?: number;
          equilibrium?: number;
          exposure?: number;
          fragments?: number;
          fragments_items?: Json;
          going_insane?: number;
          id?: string;
          initial_skill_degrees?: Json;
          inventory?: Json;
          inventory_capacity?: number;
          motivation?: string | null;
          name: string;
          notes?: string | null;
          occupation?: string | null;
          origin?: string | null;
          owner_id: string;
          plots?: Json;
          pm_spent?: number;
          power_form_data?: Json;
          power_form_enabled?: boolean;
          purchased_skills?: Json;
          skill_bonus?: string | null;
          skills?: Json;
          stat_upgrades?: Json;
          stats?: Json;
          updated_at?: string;
          weapon_proficiency?: string;
          weapon_proficiency_family?: string;
          weapons?: Json;
        };
        Update: {
          abilities?: Json;
          age?: string | null;
          attributes?: Json;
          brand?: string | null;
          campaign_id?: string | null;
          condition?: string | null;
          conditions?: Json;
          created_at?: string;
          defense_items?: Json;
          description?: Json;
          dying?: number;
          equilibrium?: number;
          exposure?: number;
          fragments?: number;
          fragments_items?: Json;
          going_insane?: number;
          id?: string;
          initial_skill_degrees?: Json;
          inventory?: Json;
          inventory_capacity?: number;
          motivation?: string | null;
          name?: string;
          notes?: string | null;
          occupation?: string | null;
          origin?: string | null;
          owner_id?: string;
          plots?: Json;
          pm_spent?: number;
          power_form_data?: Json;
          power_form_enabled?: boolean;
          purchased_skills?: Json;
          skill_bonus?: string | null;
          skills?: Json;
          stat_upgrades?: Json;
          stats?: Json;
          updated_at?: string;
          weapon_proficiency?: string;
          weapon_proficiency_family?: string;
          weapons?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "character_sheets_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          description: string;
          enabled: boolean;
          key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          description?: string;
          enabled?: boolean;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          description?: string;
          enabled?: boolean;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      game_settings: {
        Row: {
          campaign_id: string | null;
          campaign_phase: string;
          campaign_title: string;
          clues: Json;
          condition_options: Json;
          folds: Json;
          id: string;
          interludes: Json;
          investigation_clues: Json;
          initiative_notes: string | null;
          initiative_order: Json;
          key: string;
          master_npcs: Json;
          monsters: Json;
          npcs: Json;
          pinned_sheet_ids: Json;
          quick_refs: string | null;
          rank_table: Json;
          reminders: string | null;
          rules_version: number;
          scene_combat: string | null;
          scene_dialogue: string | null;
          scene_investigation: string | null;
          scenes_detailed: Json;
          skill_branches: Json;
          skill_groups: Json;
          skill_training_costs: Json;
          threats: Json;
          updated_at: string;
          upgrade_costs: Json;
        };
        Insert: {
          campaign_id?: string | null;
          campaign_phase?: string;
          campaign_title?: string;
          clues?: Json;
          condition_options?: Json;
          folds?: Json;
          id?: string;
          interludes?: Json;
          investigation_clues?: Json;
          initiative_notes?: string | null;
          initiative_order?: Json;
          key?: string;
          master_npcs?: Json;
          monsters?: Json;
          npcs?: Json;
          pinned_sheet_ids?: Json;
          quick_refs?: string | null;
          rank_table?: Json;
          reminders?: string | null;
          rules_version?: number;
          scene_combat?: string | null;
          scene_dialogue?: string | null;
          scene_investigation?: string | null;
          scenes_detailed?: Json;
          skill_branches?: Json;
          skill_groups?: Json;
          skill_training_costs?: Json;
          threats?: Json;
          updated_at?: string;
          upgrade_costs?: Json;
        };
        Update: {
          campaign_id?: string | null;
          campaign_phase?: string;
          campaign_title?: string;
          clues?: Json;
          condition_options?: Json;
          folds?: Json;
          id?: string;
          interludes?: Json;
          investigation_clues?: Json;
          initiative_notes?: string | null;
          initiative_order?: Json;
          key?: string;
          master_npcs?: Json;
          monsters?: Json;
          npcs?: Json;
          pinned_sheet_ids?: Json;
          quick_refs?: string | null;
          rank_table?: Json;
          reminders?: string | null;
          rules_version?: number;
          scene_combat?: string | null;
          scene_dialogue?: string | null;
          scene_investigation?: string | null;
          scenes_detailed?: Json;
          skill_branches?: Json;
          skill_groups?: Json;
          skill_training_costs?: Json;
          threats?: Json;
          updated_at?: string;
          upgrade_costs?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "game_settings_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["workspace_role"];
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          role: Database["public"]["Enums"]["workspace_role"];
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_public_game_settings: { Args: never; Returns: Json };
      get_user_role: {
        Args: { _user_id: string };
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      project_heartbeat: { Args: never; Returns: string };
    };
    Enums: {
      app_role: "mestre" | "jogador" | "espectador";
      campaign_role: "master" | "co_master" | "player" | "observer";
      workspace_role: "owner" | "admin" | "member" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["mestre", "jogador", "espectador"],
      campaign_role: ["master", "co_master", "player", "observer"],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const;
