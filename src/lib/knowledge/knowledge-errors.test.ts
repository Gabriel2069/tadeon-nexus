import { describe, expect, it } from "vitest";
import {
  KnowledgeServiceError,
  toKnowledgeServiceError,
} from "@/lib/knowledge/knowledge-errors";

describe("knowledge errors", () => {
  it("never exposes raw database messages to the user", () => {
    const raw = {
      code: "42501",
      message:
        'new row violates row-level security policy for table "knowledge_nodes"',
      details: "private data from the database",
    };
    const normalized = toKnowledgeServiceError(raw);

    expect(normalized.code).toBe("KNOWLEDGE_FORBIDDEN");
    expect(normalized.userMessage).toBe(
      "Você não tem permissão para realizar esta ação.",
    );
    expect(normalized.userMessage).not.toContain("knowledge_nodes");
    expect(normalized.userMessage).not.toContain("private data");
  });

  it("maps scoped uniqueness failures to actionable safe errors", () => {
    expect(
      toKnowledgeServiceError({
        message:
          "duplicate key knowledge_aliases_campaign_scope_key contains secret",
      }).code,
    ).toBe("KNOWLEDGE_ALIAS_CONFLICT");
    expect(
      toKnowledgeServiceError({
        message: "duplicate key knowledge_nodes_workspace_slug_active_key",
      }).code,
    ).toBe("KNOWLEDGE_SLUG_CONFLICT");
  });

  it("maps exact semantic relation duplicates safely", () => {
    expect(
      toKnowledgeServiceError({
        code: "23505",
        message: "duplicate key knowledge_edges_active_key",
      }).code,
    ).toBe("KNOWLEDGE_RELATION_CONFLICT");
  });

  it("preserves already normalized errors", () => {
    const error = new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
    expect(toKnowledgeServiceError(error)).toBe(error);
  });
});
