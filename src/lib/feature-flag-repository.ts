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

export async function loadFeatureFlags(): Promise<FeatureFlags> {
  const environment = getPublicFeatureFlagEnvironment();
  const { data, error } = await supabase.from("feature_flags").select("key,enabled");

  if (error) return resolveFeatureFlags({ environment });

  return resolveFeatureFlags({
    environment,
    administrative: toAdministrativeFeatureFlags(data ?? []),
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
