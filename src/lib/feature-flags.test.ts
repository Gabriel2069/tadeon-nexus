import { describe, expect, it } from "vitest";
import { DEFAULT_FEATURE_FLAGS, isFeatureEnabled, resolveFeatureFlags } from "@/lib/feature-flags";

describe("feature flags", () => {
  it("keeps every expansion feature disabled by default", () => {
    expect(Object.values(DEFAULT_FEATURE_FLAGS).every((enabled) => !enabled)).toBe(true);
    expect(resolveFeatureFlags()).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("accepts explicit public build defaults without treating arbitrary text as true", () => {
    const flags = resolveFeatureFlags({
      environment: {
        VITE_NEXUS_KNOWLEDGE_ENABLED: "true",
        VITE_NEXUS_GRAPH_ENABLED: "enabled",
        VITE_NEXUS_TABLETOP_ENABLED: "1",
      },
    });

    expect(flags.nexus_knowledge_enabled).toBe(true);
    expect(flags.nexus_graph_enabled).toBe(false);
    expect(flags.nexus_tabletop_enabled).toBe(true);
  });

  it("lets a secure administrative value override the environment default", () => {
    const flags = resolveFeatureFlags({
      environment: {
        VITE_NEXUS_REALTIME_ENABLED: "true",
        VITE_NEXUS_LIGHTING_ENABLED: "false",
      },
      administrative: {
        nexus_realtime_enabled: false,
        nexus_lighting_enabled: true,
      },
    });

    expect(isFeatureEnabled(flags, "nexus_realtime_enabled")).toBe(false);
    expect(isFeatureEnabled(flags, "nexus_lighting_enabled")).toBe(true);
  });
});
