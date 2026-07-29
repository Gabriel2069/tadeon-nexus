import { describe, expect, it } from "vitest";
import { toAdministrativeFeatureFlags } from "@/lib/feature-flag-repository";

describe("feature flag repository normalization", () => {
  it("accepts only known expansion flags", () => {
    expect(
      toAdministrativeFeatureFlags([
        { key: "nexus_knowledge_enabled", enabled: true },
        { key: "untrusted_flag", enabled: true },
      ]),
    ).toEqual({ nexus_knowledge_enabled: true });
  });

  it("preserves explicit false values", () => {
    expect(
      toAdministrativeFeatureFlags([{ key: "nexus_tabletop_enabled", enabled: false }]),
    ).toEqual({ nexus_tabletop_enabled: false });
  });
});
