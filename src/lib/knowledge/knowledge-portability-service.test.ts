import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { AssetService, NexusAsset } from "@/lib/assets/asset-service";
import type { KnowledgeVaultPreview } from "@/lib/knowledge/knowledge-portability";
import { KnowledgePortabilityService } from "@/lib/knowledge/knowledge-portability-service";

function preview(): KnowledgeVaultPreview {
  return {
    format: "markdown-vault",
    version: 0,
    archive_name: "teste.zip",
    source_types: ["free_note"],
    warnings: [],
    pages: [
      {
        import_key: "pagina",
        source_path: "pagina.md",
        title: "Página",
        slug: "pagina",
        summary: "",
        content_markdown: "",
        plain_text: "",
        properties: {},
        node_type: "free_note",
        source_type: "free_note",
        status: "draft",
        visibility: "workspace",
        icon: null,
        aliases: [],
        tags: [],
        conflict_action: "skip",
        links: [],
        headings: [],
      },
    ],
    relations: [],
    attachments: [
      {
        archive_path: "anexos/mapa.png",
        original_name: "mapa.png",
        mime_type: "image/png",
        size_bytes: 4,
        page_keys: ["pagina"],
        bytes: new Uint8Array([137, 80, 78, 71]),
      },
    ],
  };
}

function asset(): NexusAsset {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    workspace_id: "22222222-2222-4222-8222-222222222222",
    campaign_id: null,
    provider: "supabase",
    bucket: "nexus-assets",
    object_key: "objeto.png",
    original_name: "mapa.png",
    display_name: "mapa",
    mime_type: "image/png",
    extension: "png",
    size_bytes: 4,
    checksum: null,
    width: null,
    height: null,
    duration_seconds: null,
    thumbnail_asset_id: null,
    visibility: "workspace",
    status: "ready",
    created_by: "33333333-3333-4333-8333-333333333333",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    deleted_at: null,
    metadata: {},
  };
}

describe("KnowledgePortabilityService", () => {
  it("does not upload files during dry-run", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        dry_run: true,
        pages_total: 1,
        pages_created: 1,
        pages_skipped: 0,
        aliases_created: 0,
        tags_linked: 0,
        mentions_created: 0,
        broken_links_created: 0,
        relations_created: 0,
        attachments_linked: 0,
        conflicts: [],
        created_nodes: [],
        warnings: [],
      },
      error: null,
    });
    const createUploadTask = vi.fn();
    const service = new KnowledgePortabilityService(
      { rpc } as unknown as SupabaseClient,
      {
        createUploadTask,
        purge: vi.fn(),
        createTemporaryAccess: vi.fn(),
      } as unknown as AssetService,
    );

    const result = await service.dryRun(preview(), {
      workspaceId: "22222222-2222-4222-8222-222222222222",
      campaignId: null,
    });

    expect(result.dry_run).toBe(true);
    expect(createUploadTask).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      "import_knowledge_vault",
      expect.objectContaining({ p_dry_run: true }),
    );
  });

  it("purges every uploaded asset when the database transaction fails", async () => {
    const uploaded = asset();
    const purge = vi.fn().mockResolvedValue(undefined);
    const service = new KnowledgePortabilityService(
      {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "transaction failed" },
        }),
      } as unknown as SupabaseClient,
      {
        createUploadTask: vi.fn().mockReturnValue({
          promise: Promise.resolve(uploaded),
          cancel: vi.fn(),
        }),
        purge,
        createTemporaryAccess: vi.fn(),
      } as unknown as AssetService,
    );

    await expect(
      service.import(preview(), {
        workspaceId: uploaded.workspace_id,
        campaignId: null,
        assetsEnabled: true,
      }),
    ).rejects.toThrow("transaction failed");

    expect(purge).toHaveBeenCalledWith(uploaded, true);
  });
});
