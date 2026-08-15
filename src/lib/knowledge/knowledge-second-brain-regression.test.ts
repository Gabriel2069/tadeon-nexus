import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Nexus second-brain graph architecture", () => {
  it("routes the canonical graph component through the weighted workspace", () => {
    const wrapper = source("src/components/knowledge/knowledge-graph.tsx");
    const graph = source(
      "src/components/knowledge/knowledge-graph-second-brain.tsx",
    );

    expect(wrapper).toContain("knowledge-graph-second-brain");
    expect(graph).toContain("knowledgeGraphService.loadMemory");
    expect(graph).toContain("buildKnowledgeGraph");
    expect(graph).toContain("computeKnowledgeForceLayout");
    expect(graph).toContain('mode === "global"');
    expect(graph).toContain("includeSemantic");
    expect(graph).toContain("semanticThreshold");
    expect(graph).toContain("minimumStrength");
    expect(graph).toContain("pinnedPositions");
  });

  it("keeps relation evidence, backlinks, hierarchy and content affinity in the model", () => {
    const model = source("src/lib/knowledge/knowledge-graph-memory.ts");

    for (const kind of ["explicit", "mention", "hierarchy", "semantic"]) {
      expect(model).toContain(`"${kind}"`);
    }
    expect(model).toContain("incomingMentions");
    expect(model).toContain("weightedDegree");
    expect(model).toContain("graphLinkDistance");
    expect(model).toContain('"bidirectional"');
    expect(model).not.toContain('"undirected"');
  });

  it("builds memory from RLS-scoped content without privileged bypass", () => {
    const migration = source(
      "supabase/migrations/20260815231500_nexus_second_brain_graph.sql",
    );

    expect(migration).toContain(
      "create or replace function public.get_knowledge_graph_memory",
    );
    expect(migration).toContain("public.knowledge_mentions");
    expect(migration).toContain("public.knowledge_node_tags");
    expect(migration).toContain("candidate.plain_text");
    expect(migration).toContain("candidate.parent_node_id");
    expect(migration).not.toMatch(/security\s+definer/i);
    expect(migration).toContain(
      "revoke all on function public.get_knowledge_graph_memory",
    );
    expect(migration).toContain("to authenticated");
  });

  it("uses opaque theme surfaces for graph chrome", () => {
    const css = source("src/styles/nexus-second-brain.css");

    expect(css).toContain("--brain-surface:");
    expect(css).toContain("var(--card)");
    expect(css).toContain("background: var(--brain-surface)");
    expect(css).not.toContain("background: transparent !important");
  });
});
