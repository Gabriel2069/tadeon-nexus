import { supabase } from "@/integrations/supabase/client";
import {
  resolveFeatureFlags,
  type FeatureFlags,
  type PublicFeatureFlagEnvironment,
} from "@/lib/feature-flags";
import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "@/lib/nexus-contracts";

interface FeatureFlagRow {
  key: string;
  enabled: boolean;
}

interface UserFeatureFlagOverrideRow {
  flag_key: string;
  enabled: boolean;
}

function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEYS.some((key) => key === value);
}

export function toAdministrativeFeatureFlags(rows: FeatureFlagRow[]) {
  const flags: Partial<FeatureFlags> = {};

  for (const row of rows) {
    if (isFeatureFlagKey(row.key)) flags[row.key] = row.enabled;
  }

  return flags;
}

export function toUserFeatureFlagOverrides(rows: UserFeatureFlagOverrideRow[]) {
  const flags: Partial<FeatureFlags> = {};

  for (const row of rows) {
    if (isFeatureFlagKey(row.flag_key)) flags[row.flag_key] = row.enabled;
  }

  return flags;
}

export function getPublicFeatureFlagEnvironment(): PublicFeatureFlagEnvironment {
  return {
    VITE_NEXUS_KNOWLEDGE_ENABLED: import.meta.env.VITE_NEXUS_KNOWLEDGE_ENABLED,
    VITE_NEXUS_GRAPH_ENABLED: import.meta.env.VITE_NEXUS_GRAPH_ENABLED,
    VITE_NEXUS_ASSETS_V2_ENABLED: import.meta.env.VITE_NEXUS_ASSETS_V2_ENABLED,
    VITE_NEXUS_TABLETOP_ENABLED: import.meta.env.VITE_NEXUS_TABLETOP_ENABLED,
    VITE_NEXUS_REALTIME_ENABLED: import.meta.env.VITE_NEXUS_REALTIME_ENABLED,
    VITE_NEXUS_LIGHTING_ENABLED: import.meta.env.VITE_NEXUS_LIGHTING_ENABLED,
    VITE_NEXUS_R2_ENABLED: import.meta.env.VITE_NEXUS_R2_ENABLED,
  };
}

export async function loadFeatureFlags(authenticatedUserId?: string): Promise<FeatureFlags> {
  const environment = getPublicFeatureFlagEnvironment();
  const globalResponse = await supabase.from("feature_flags").select("key,enabled");

  if (globalResponse.error) return resolveFeatureFlags({ environment });

  let userOverrides: Partial<FeatureFlags> = {};
  let userId = authenticatedUserId;

  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id;
  }

  if (userId) {
    const { data, error } = await supabase
      .from("feature_flag_user_overrides")
      .select("flag_key,enabled")
      .eq("user_id", userId);

    if (!error) userOverrides = toUserFeatureFlagOverrides(data ?? []);
  }

  return resolveFeatureFlags({
    environment,
    administrative: toAdministrativeFeatureFlags(globalResponse.data ?? []),
    userOverrides,
  });
}

export async function updateAdministrativeFeatureFlag({
  key,
  enabled,
  userId,
}: {
  key: FeatureFlagKey;
  enabled: boolean;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("feature_flags")
    .update({ enabled, updated_by: userId })
    .eq("key", key)
    .select("key")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Não foi possível atualizar a configuração administrativa.");
  }
}
