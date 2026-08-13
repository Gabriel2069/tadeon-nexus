import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  assetService,
  type NexusAsset,
} from "@/lib/assets/asset-service";
import { knowledgeService } from "@/lib/knowledge/knowledge-service";
import type {
  TabletopParticipantHandout,
  TabletopParticipantHandoutAttachment,
} from "@/lib/tabletop/tabletop-participant-service";

const tabletopMasterHandoutDatabase = supabase as unknown as SupabaseClient;

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedSize(value: unknown) {
  const size = Number(value);
  return Number.isFinite(size)
    ? Math.max(0, Math.min(100 * 1024 * 1024, Math.trunc(size)))
    : 0;
}

export class TabletopMasterHandoutService {
  async load(nodeId: string): Promise<TabletopParticipantHandout> {
    const [node, links] = await Promise.all([
      knowledgeService.get(nodeId),
      knowledgeService.listNodeAssets(nodeId),
    ]);
    const assetIds = [
      ...new Set(
        [node.cover_asset_id, ...links.map((link) => link.asset_id)].filter(
          (value): value is string => typeof value === "string" && value.length > 0,
        ),
      ),
    ];

    let assets: NexusAsset[] = [];
    if (assetIds.length > 0) {
      const { data, error } = await tabletopMasterHandoutDatabase
        .from("assets")
        .select("*")
        .in("id", assetIds)
        .eq("status", "ready")
        .is("deleted_at", null);
      if (error) throw error;
      assets = (data ?? []) as NexusAsset[];
    }

    const signedUrls = new Map<string, string>();
    await Promise.all(
      assets.map(async (asset) => {
        const url = await assetService
          .createTemporaryAccess(asset, 300)
          .catch(() => undefined);
        if (url) signedUrls.set(asset.id, url);
      }),
    );
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const attachments: TabletopParticipantHandoutAttachment[] = links
      .slice(0, 16)
      .flatMap((link) => {
        const asset = assetsById.get(link.asset_id);
        const url = signedUrls.get(link.asset_id);
        if (!asset || !url) return [];
        return [
          {
            assetId: asset.id,
            name:
              boundedText(asset.display_name, 240) ||
              boundedText(asset.original_name, 240) ||
              "Arquivo",
            mimeType:
              boundedText(asset.mime_type, 160) || "application/octet-stream",
            sizeBytes: boundedSize(asset.size_bytes),
            role: boundedText(link.asset_role, 80),
            caption: boundedText(link.caption, 500),
            url,
          },
        ];
      });

    const coverUrl = node.cover_asset_id
      ? signedUrls.get(node.cover_asset_id)
      : undefined;
    return {
      nodeId: node.id,
      title: boundedText(node.title, 160) || "Arquivo de O Nexus",
      summary: boundedText(node.summary, 600),
      nodeType: boundedText(node.node_type, 80) || "document",
      ...(coverUrl ? { coverUrl } : {}),
      attachments,
    };
  }
}

export const tabletopMasterHandoutService =
  new TabletopMasterHandoutService();
