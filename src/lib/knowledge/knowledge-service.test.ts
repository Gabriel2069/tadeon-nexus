import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import {
  KnowledgeService,
  type KnowledgeEdge,
  type KnowledgeNode,
} from "@/lib/knowledge/knowledge-service";

const OWNER_ID = "47991c61-df76-4886-8ff3-1b587b65ce97";
const WORKSPACE_ID = "5fffb105-9018-4a5b-84ef-e895d186a279";

function nodeFixture(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    workspace_id: WORKSPACE_ID,
    campaign_id: null,
    node_type: "free_note",
    title: "Página",
    slug: "pagina",
    summary: "",
    content_markdown: "",
    plain_text: "",
    properties: {},
    status: "draft",
    visibility: "author",
    icon: null,
    cover_asset_id: null,
    parent_node_id: null,
    created_by: OWNER_ID,
    updated_by: OWNER_ID,
    created_at: "2026-07-29T00:00:00.000Z",
    updated_at: "2026-07-29T00:00:00.000Z",
    archived_at: null,
    deleted_at: null,
    version_sequence: 0,
    ...overrides,
  };
}

describe("KnowledgeService creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: OWNER_ID } } },
    });
  });

  it("creates a node through the transactional RPC before indexing links", async () => {
    const created = nodeFixture({ title: "Myrova", slug: "myrova" });
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "create_knowledge_node"
        ? { data: created, error: null }
        : { data: null, error: null },
    );

    const result = await new KnowledgeService().create({
      workspaceId: WORKSPACE_ID,
      title: "Myrova",
    });

    expect(result.node).toEqual(created);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      1,
      "create_knowledge_node",
      expect.objectContaining({
        p_workspace_id: WORKSPACE_ID,
        p_title: "Myrova",
        p_slug: "myrova",
      }),
    );
    expect(mocks.rpc).toHaveBeenNthCalledWith(
      2,
      "replace_knowledge_link_index",
      expect.objectContaining({ p_source_node_id: created.id }),
    );
  });

  it("creates a semantic edge through the transactional RPC", async () => {
    const source = nodeFixture({
      id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      title: "Myrova",
      slug: "myrova",
      visibility: "workspace",
    });
    const target = nodeFixture({
      id: "6ba7b811-9dad-41d1-80b4-00c04fd430c8",
      title: "Lobo Alvor",
      slug: "lobo-alvor",
      visibility: "workspace",
    });
    const nodes: Record<string, KnowledgeNode> = {
      [source.id]: source,
      [target.id]: target,
    };

    mocks.from.mockImplementation(() => {
      let selectedId = "";
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          if (column === "id") selectedId = String(value);
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({
          data: nodes[selectedId] ?? null,
          error: null,
        })),
      };
      return builder;
    });

    const edge: KnowledgeEdge = {
      id: "6ba7b812-9dad-41d1-80b4-00c04fd430c8",
      workspace_id: WORKSPACE_ID,
      source_node_id: source.id,
      target_node_id: target.id,
      relation_type: "located_in",
      label: "localiza-se em",
      direction: "directed",
      visibility: "workspace",
      properties: {},
      created_by: OWNER_ID,
      created_at: "2026-07-29T00:00:00.000Z",
      updated_at: "2026-07-29T00:00:00.000Z",
      deleted_at: null,
    };
    const inverse = {
      ...edge,
      id: "6ba7b813-9dad-41d1-80b4-00c04fd430c8",
      source_node_id: target.id,
      target_node_id: source.id,
      relation_type: "contains" as const,
      label: "contém",
    };
    mocks.rpc.mockResolvedValue({ data: [edge, inverse], error: null });

    const result = await new KnowledgeService().createEdge({
      sourceNodeId: source.id,
      targetNodeId: target.id,
      relationType: "located_in",
      label: "localiza-se em",
      inverse: {
        relationType: "contains",
        label: "contém",
      },
    });

    expect(result).toEqual(edge);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "create_knowledge_relation",
      expect.objectContaining({
        p_workspace_id: WORKSPACE_ID,
        p_source_node_id: source.id,
        p_target_node_id: target.id,
        p_relation_type: "located_in",
        p_label: "localiza-se em",
        p_inverse_relation_type: "contains",
        p_inverse_label: "contém",
      }),
    );
  });
});
