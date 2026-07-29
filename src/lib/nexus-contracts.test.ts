import { describe, expect, it } from "vitest";
import {
  KNOWLEDGE_ACL_PERMISSIONS,
  KNOWLEDGE_NODE_STATUSES,
  KNOWLEDGE_NODE_TYPES,
  KNOWLEDGE_RELATION_DIRECTIONS,
  KNOWLEDGE_VISIBILITIES,
  RELATION_TYPES,
} from "@/lib/nexus-contracts";

describe("O Nexus central contracts", () => {
  it("keeps the initial page taxonomy in one shared contract", () => {
    expect(KNOWLEDGE_NODE_TYPES).toContain("rule");
    expect(KNOWLEDGE_NODE_TYPES).toContain("npc");
    expect(KNOWLEDGE_NODE_TYPES).toContain("fragment");
    expect(KNOWLEDGE_NODE_TYPES).toContain("transcendental_ability");
    expect(KNOWLEDGE_NODE_TYPES).toContain("tectonic_plate");
    expect(KNOWLEDGE_NODE_TYPES).toContain("free_note");
    expect(new Set(KNOWLEDGE_NODE_TYPES).size).toBe(
      KNOWLEDGE_NODE_TYPES.length,
    );
  });

  it("matches the canonical lifecycle and visibility vocabulary", () => {
    expect(KNOWLEDGE_NODE_STATUSES).toEqual([
      "draft",
      "review",
      "canonical",
      "deprecated",
      "archived",
    ]);
    expect(KNOWLEDGE_VISIBILITIES).toEqual([
      "author",
      "masters",
      "campaign",
      "users",
      "workspace",
      "internal_public",
    ]);
  });

  it("defines relation and per-user permission contracts", () => {
    expect(RELATION_TYPES).toContain("related_to");
    expect(RELATION_TYPES).toContain("reveals");
    expect(KNOWLEDGE_RELATION_DIRECTIONS).toEqual([
      "directed",
      "bidirectional",
    ]);
    expect(KNOWLEDGE_ACL_PERMISSIONS).toEqual(["view", "edit", "manage"]);
  });
});
