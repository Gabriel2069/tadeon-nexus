import { FEATURE_FLAG_KEYS, type FeatureFlagKey } from "@/lib/nexus-contracts";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export interface PublicFeatureFlagEnvironment {
  VITE_NEXUS_KNOWLEDGE_ENABLED?: string;
  VITE_NEXUS_GRAPH_ENABLED?: string;
  VITE_NEXUS_ASSETS_V2_ENABLED?: string;
  VITE_NEXUS_TABLETOP_ENABLED?: string;
  VITE_NEXUS_REALTIME_ENABLED?: string;
  VITE_NEXUS_LIGHTING_ENABLED?: string;
  VITE_NEXUS_R2_ENABLED?: string;
}

const ENVIRONMENT_KEYS: Record<FeatureFlagKey, keyof PublicFeatureFlagEnvironment> = {
  nexus_knowledge_enabled: "VITE_NEXUS_KNOWLEDGE_ENABLED",
  nexus_graph_enabled: "VITE_NEXUS_GRAPH_ENABLED",
  nexus_assets_v2_enabled: "VITE_NEXUS_ASSETS_V2_ENABLED",
  nexus_tabletop_enabled: "VITE_NEXUS_TABLETOP_ENABLED",
  nexus_realtime_enabled: "VITE_NEXUS_REALTIME_ENABLED",
  nexus_lighting_enabled: "VITE_NEXUS_LIGHTING_ENABLED",
  nexus_r2_enabled: "VITE_NEXUS_R2_ENABLED",
};

export const DEFAULT_FEATURE_FLAGS = Object.freeze(
  Object.fromEntries(FEATURE_FLAG_KEYS.map((key) => [key, false])) as FeatureFlags,
);

function parseBoolean(value: string | undefined) {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

export function resolveFeatureFlags({
  environment = {},
  administrative = {},
  userOverrides = {},
}: {
  environment?: PublicFeatureFlagEnvironment;
  administrative?: Partial<FeatureFlags>;
  userOverrides?: Partial<FeatureFlags>;
} = {}): FeatureFlags {
  const resolved = { ...DEFAULT_FEATURE_FLAGS };

  for (const key of FEATURE_FLAG_KEYS) {
    const environmentValue = parseBoolean(environment[ENVIRONMENT_KEYS[key]]);
    if (environmentValue !== undefined) resolved[key] = environmentValue;
  }

  for (const key of FEATURE_FLAG_KEYS) {
    const administrativeValue = administrative[key];
    if (typeof administrativeValue === "boolean") resolved[key] = administrativeValue;
  }

  for (const key of FEATURE_FLAG_KEYS) {
    const overrideValue = userOverrides[key];
    if (typeof overrideValue === "boolean") resolved[key] = overrideValue;
  }

  return resolved;
}

export function isFeatureEnabled(flags: FeatureFlags, key: FeatureFlagKey) {
  return flags[key] === true;
}
