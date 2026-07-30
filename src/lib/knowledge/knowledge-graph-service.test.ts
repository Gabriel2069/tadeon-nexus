import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: mocks.rpc },
}));

import { KnowledgeGraphService } from "@/lib/knowledge/knowledge-graph-service";

describe("KnowledgeGraphService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads a bounded local graph with typed filters", async () => {
    const graph = {
      focusNodeId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      depth: 2,
      limit: 60,
      truncated: false,
      nodes: [
        {
          id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
          title: "Myrova",
          nodeType: "city",
          icon: null,
          status: "canonical",
          visibility: "workspace",
          campaignId: null,
          updatedAt: "2026-07-29T00:00:00.000Z",
          depth: 0,
        },
      ],
      edges: [],
    };
    mocks.rpc.mockResolvedValue({ data: graph, error: null });

    await expect(
      new KnowledgeGraphService().loadLocal({
        workspaceId: "5fffb105-9018-4a5b-84ef-e895d186a279",
        focusNodeId: graph.focusNodeId,
        campaignId: "bf9e85a7-0403-4de8-8d93-dd4d8706bab2",
        depth: 2,
        limit: 60,
        nodeTypes: ["city"],
        relationTypes: ["located_in"],
        visibilities: ["workspace"],
      }),
    ).resolves.toEqual(graph);

    expect(mocks.rpc).toHaveBeenCalledWith("get_knowledge_local_graph", {
      p_workspace_id: "5fffb105-9018-4a5b-84ef-e895d186a279",
      p_focus_node_id: graph.focusNodeId,
      p_campaign_id: "bf9e85a7-0403-4de8-8d93-dd4d8706bab2",
      p_include_workspace: true,
      p_depth: 2,
      p_limit: 60,
      p_node_types: ["city"],
      p_relation_types: ["located_in"],
      p_visibilities: ["workspace"],
    });
  });

  it("rejects a missing focus before calling the database", async () => {
    await expect(
      new KnowledgeGraphService().loadLocal({
        workspaceId: "5fffb105-9018-4a5b-84ef-e895d186a279",
        focusNodeId: "",
      }),
    ).rejects.toMatchObject({ code: "KNOWLEDGE_INVALID_INPUT" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
