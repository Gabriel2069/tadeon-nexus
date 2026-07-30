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
  KnowledgeLibraryService,
  type KnowledgeTemplate,
} from "@/lib/knowledge/knowledge-library-service";
import { knowledgeService } from "@/lib/knowledge/knowledge-service";

const OWNER_ID = "47991c61-df76-4886-8ff3-1b587b65ce97";
const WORKSPACE_ID = "5fffb105-9018-4a5b-84ef-e895d186a279";

function templateFixture(
  overrides: Partial<KnowledgeTemplate> = {},
): KnowledgeTemplate {
  return {
    id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    workspace_id: WORKSPACE_ID,
    node_type: "plot",
    name: "Trama",
    description: "",
    icon: "route",
    default_content: "# {{title}}\n\n## Premissa\n",
    default_properties: { status: "planejada" },
    required_fields: ["status", "prioridade"],
    suggested_relations: [],
    is_default: true,
    created_by: OWNER_ID,
    updated_by: OWNER_ID,
    created_at: "2026-07-30T00:00:00.000Z",
    updated_at: "2026-07-30T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("KnowledgeLibraryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { user: { id: OWNER_ID } } },
    });
  });

  it("creates a page from a template without dropping required fields", async () => {
    const create = vi
      .spyOn(knowledgeService, "create")
      .mockResolvedValue({ node: {} as never, mentionsSynchronized: true });

    await new KnowledgeLibraryService().createNodeFromTemplate({
      template: templateFixture(),
      title: "A Coroa Partida",
      campaignId: null,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: WORKSPACE_ID,
        nodeType: "plot",
        title: "A Coroa Partida",
        contentMarkdown: "# A Coroa Partida\n\n## Premissa\n",
        properties: {
          status: "planejada",
          prioridade: "",
        },
      }),
    );
  });

  it("deduplicates bulk favorites before writing", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upsert });

    await new KnowledgeLibraryService().setFavoriteBulk(
      ["node-a", "node-b", "node-a"],
      true,
    );

    expect(upsert).toHaveBeenCalledWith(
      [
        { node_id: "node-a", user_id: OWNER_ID },
        { node_id: "node-b", user_id: OWNER_ID },
      ],
      { onConflict: "user_id,node_id", ignoreDuplicates: true },
    );
  });
});
