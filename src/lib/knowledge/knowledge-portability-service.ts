import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  assetService,
  type AssetService,
  type NexusAsset,
} from "@/lib/assets/asset-service";
import type {
  KnowledgeNodeStatus,
  KnowledgeNodeType,
  KnowledgeRelationDirection,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";
import {
  buildKnowledgeArchive,
  type KnowledgeExportAttachment,
  type KnowledgeExportPage,
  type KnowledgeExportSnapshot,
  type KnowledgeImportAttachment,
  type KnowledgeVaultPreview,
} from "@/lib/knowledge/knowledge-portability";

const knowledgeDatabase = supabase as unknown as SupabaseClient;

interface KnowledgeAliasRow {
  node_id: string;
  alias: string;
}

interface KnowledgeNodeRow {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  node_type: KnowledgeNodeType;
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  properties: Json;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  icon: string | null;
}

interface KnowledgeTagLinkRow {
  node_id: string;
  tag: { name: string } | Array<{ name: string }> | null;
}

interface KnowledgeEdgeRow {
  source_node_id: string;
  target_node_id: string;
  relation_type: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  properties: Json;
}

interface KnowledgeAssetRow {
  node_id: string;
  asset_id: string;
}

export interface KnowledgeImportConflict {
  import_key: string;
  title: string;
  slug: string;
  existing_node_id: string;
  action: "skip" | "copy";
}

export interface KnowledgeImportReport {
  dry_run: boolean;
  pages_total: number;
  pages_created: number;
  pages_skipped: number;
  aliases_created: number;
  tags_linked: number;
  mentions_created: number;
  broken_links_created: number;
  relations_created: number;
  attachments_linked: number;
  conflicts: KnowledgeImportConflict[];
  created_nodes: Array<{
    import_key: string;
    node_id: string;
    title: string;
  }>;
  warnings: string[];
}

export interface ImportProgress {
  phase: "uploading" | "database" | "rollback";
  completed: number;
  total: number;
  label: string;
}

export interface ExportProgress {
  phase: "reading" | "downloading" | "packing";
  completed: number;
  total: number;
  label: string;
}

type AssetPortability = Pick<
  AssetService,
  "createUploadTask" | "purge" | "createTemporaryAccess"
>;

function rpcErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return "KNOWLEDGE_PORTABILITY_FAILED";
}

function jsonObject(value: Json): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {};
}

function safeAttachmentName(value: string) {
  const safe = value
    .replace(/[/\\]/g, "-")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 180);
  return safe || "anexo.bin";
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function sourcePath(node: KnowledgeNodeRow) {
  const properties = jsonObject(node.properties);
  const importedPath =
    typeof properties.nexus_source_path === "string"
      ? properties.nexus_source_path
      : "";
  if (
    importedPath &&
    !importedPath.includes("..") &&
    !importedPath.startsWith("/")
  ) {
    return /\.md$/i.test(importedPath) ? importedPath : `${importedPath}.md`;
  }
  return `${node.node_type}/${node.slug}.md`;
}

function typeOfTag(value: KnowledgeTagLinkRow["tag"]): { name: string } | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function allSettledOrThrow(
  tasks: Array<() => Promise<void>>,
  concurrency = 3,
) {
  let cursor = 0;
  let failure: unknown;
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, tasks.length)) },
    async () => {
      while (!failure) {
        const current = cursor++;
        if (current >= tasks.length) return;
        try {
          await tasks[current]();
        } catch (error) {
          failure = error;
          return;
        }
      }
    },
  );
  await Promise.all(workers);
  if (failure) throw failure;
}

export class KnowledgePortabilityService {
  constructor(
    private readonly database: SupabaseClient = knowledgeDatabase,
    private readonly assets: AssetPortability = assetService,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  private databaseBundle(
    preview: KnowledgeVaultPreview,
    uploadedAssets: Array<{
      attachment: KnowledgeImportAttachment;
      asset: NexusAsset;
    }> = [],
  ) {
    return {
      format: preview.format,
      version: preview.version,
      archive_name: preview.archive_name,
      pages: preview.pages,
      relations: preview.relations,
      attachments: uploadedAssets.flatMap(({ attachment, asset }) =>
        attachment.page_keys.map((pageKey) => ({
          page_key: pageKey,
          asset_id: asset.id,
          role: "attachment",
          caption: attachment.original_name,
          archive_path: attachment.archive_path,
        })),
      ),
    };
  }

  async dryRun(
    preview: KnowledgeVaultPreview,
    options: {
      workspaceId: string;
      campaignId: string | null;
    },
  ): Promise<KnowledgeImportReport> {
    const unsupported = preview.attachments.filter(
      (attachment) => attachment.mime_type === "application/octet-stream",
    );
    const { data, error } = await this.database.rpc("import_knowledge_vault", {
      p_workspace_id: options.workspaceId,
      p_campaign_id: options.campaignId,
      p_dry_run: true,
      p_bundle: this.databaseBundle(preview),
    });
    if (error) throw new Error(rpcErrorMessage(error));
    const report = data as KnowledgeImportReport;
    return {
      ...report,
      warnings: [
        ...(report.warnings ?? []),
        ...preview.warnings,
        ...(unsupported.length
          ? [
              `${unsupported.length} anexo(s) usam formato não permitido; remova-os antes da importação.`,
            ]
          : []),
      ],
    };
  }

  async import(
    preview: KnowledgeVaultPreview,
    options: {
      workspaceId: string;
      campaignId: string | null;
      assetsEnabled: boolean;
      onProgress?: (progress: ImportProgress) => void;
    },
  ): Promise<KnowledgeImportReport> {
    const unsupported = preview.attachments.filter(
      (attachment) => attachment.mime_type === "application/octet-stream",
    );
    if (unsupported.length) {
      throw new Error("KNOWLEDGE_IMPORT_UNSUPPORTED_ATTACHMENT");
    }
    if (preview.attachments.length && !options.assetsEnabled) {
      throw new Error("KNOWLEDGE_IMPORT_ASSETS_DISABLED");
    }

    const uploaded: Array<{
      attachment: KnowledgeImportAttachment;
      asset: NexusAsset;
    }> = [];
    const rollbackUploads = async () => {
      options.onProgress?.({
        phase: "rollback",
        completed: 0,
        total: uploaded.length,
        label: "Revertendo anexos",
      });
      const failures: string[] = [];
      for (const [index, item] of [...uploaded].reverse().entries()) {
        try {
          await this.assets.purge(item.asset, true);
        } catch {
          failures.push(item.asset.id);
        }
        options.onProgress?.({
          phase: "rollback",
          completed: index + 1,
          total: uploaded.length,
          label: "Revertendo anexos",
        });
      }
      return failures;
    };

    try {
      await allSettledOrThrow(
        preview.attachments.map((attachment, index) => async () => {
          const file = new File(
            [copyToArrayBuffer(attachment.bytes)],
            attachment.original_name,
            {
              type: attachment.mime_type,
              lastModified: Date.now(),
            },
          );
          const asset = await this.assets.createUploadTask({
            workspaceId: options.workspaceId,
            campaignId: options.campaignId,
            file,
            displayName: attachment.original_name,
            visibility: options.campaignId ? "campaign" : "workspace",
            provider: "supabase",
            metadata: {
              nexus_import_archive: preview.archive_name,
              nexus_import_path: attachment.archive_path,
            },
          }).promise;
          uploaded.push({ attachment, asset });
          options.onProgress?.({
            phase: "uploading",
            completed: uploaded.length,
            total: preview.attachments.length,
            label: `Anexo ${index + 1} de ${preview.attachments.length}`,
          });
        }),
      );

      options.onProgress?.({
        phase: "database",
        completed: 0,
        total: preview.pages.length,
        label: "Aplicando importação transacional",
      });
      const { data, error } = await this.database.rpc(
        "import_knowledge_vault",
        {
          p_workspace_id: options.workspaceId,
          p_campaign_id: options.campaignId,
          p_dry_run: false,
          p_bundle: this.databaseBundle(preview, uploaded),
        },
      );
      if (error) throw new Error(rpcErrorMessage(error));
      options.onProgress?.({
        phase: "database",
        completed: preview.pages.length,
        total: preview.pages.length,
        label: "Importação concluída",
      });
      return data as KnowledgeImportReport;
    } catch (error) {
      const rollbackFailures = await rollbackUploads();
      if (rollbackFailures.length) {
        throw new Error(
          `KNOWLEDGE_IMPORT_ROLLBACK_INCOMPLETE:${rollbackFailures.join(",")}`,
          { cause: error },
        );
      }
      throw error;
    }
  }

  private async listNodes(workspaceId: string, campaignId: string | null) {
    let query = this.database
      .from("knowledge_nodes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("created_at")
      .limit(500);
    query = campaignId
      ? query.eq("campaign_id", campaignId)
      : query.is("campaign_id", null);
    const { data, error } = await query;
    if (error) throw new Error(rpcErrorMessage(error));
    return (data ?? []) as KnowledgeNodeRow[];
  }

  async export(options: {
    workspaceId: string;
    campaignId: string | null;
    includeAttachments: boolean;
    assetsEnabled: boolean;
    onProgress?: (progress: ExportProgress) => void;
  }): Promise<{ bytes: Uint8Array; snapshot: KnowledgeExportSnapshot }> {
    options.onProgress?.({
      phase: "reading",
      completed: 0,
      total: 1,
      label: "Lendo páginas e relações",
    });
    const nodes = await this.listNodes(options.workspaceId, options.campaignId);
    const nodeIds = nodes.map((node) => node.id);
    const emptyResult = { data: [] as unknown[], error: null };
    const aliasesResult = nodeIds.length
      ? await this.database
          .from("knowledge_aliases")
          .select("node_id,alias")
          .in("node_id", nodeIds)
          .order("alias")
      : emptyResult;
    const tagsResult = nodeIds.length
      ? await this.database
          .from("knowledge_node_tags")
          .select("node_id,tag:knowledge_tags(name)")
          .in("node_id", nodeIds)
      : emptyResult;
    const edgesResult = nodeIds.length
      ? await this.database
          .from("knowledge_edges")
          .select(
            "source_node_id,target_node_id,relation_type,label,direction,visibility,properties",
          )
          .in("source_node_id", nodeIds)
          .in("target_node_id", nodeIds)
          .is("deleted_at", null)
      : emptyResult;
    const linksResult =
      nodeIds.length && options.includeAttachments && options.assetsEnabled
        ? await this.database
            .from("knowledge_assets")
            .select("node_id,asset_id")
            .in("node_id", nodeIds)
            .order("sort_order")
        : emptyResult;

    const firstError =
      aliasesResult.error ??
      tagsResult.error ??
      edgesResult.error ??
      linksResult.error;
    if (firstError) throw new Error(rpcErrorMessage(firstError));

    const pathsByNode = new Map<string, string>();
    const keysByNode = new Map<string, string>();
    const usedPaths = new Set<string>();
    const exportPages: KnowledgeExportPage[] = nodes.map((node) => {
      let path = sourcePath(node);
      const root = path.replace(/\.md$/i, "");
      let suffix = 2;
      while (usedPaths.has(path)) path = `${root}-${suffix++}.md`;
      usedPaths.add(path);
      const key = path.replace(/\.md$/i, "");
      pathsByNode.set(node.id, path);
      keysByNode.set(node.id, key);
      return {
        key,
        path,
        original_id: node.id,
        title: node.title,
        summary: node.summary,
        content_markdown: node.content_markdown,
        properties: node.properties,
        node_type: node.node_type as KnowledgeNodeType,
        status: node.status as KnowledgeNodeStatus,
        visibility: node.visibility as KnowledgeVisibility,
        icon: node.icon,
        aliases: (aliasesResult.data as KnowledgeAliasRow[])
          .filter((alias) => alias.node_id === node.id)
          .map((alias) => alias.alias),
        tags: (tagsResult.data as unknown as KnowledgeTagLinkRow[])
          .filter((link) => link.node_id === node.id)
          .map((link) => typeOfTag(link.tag)?.name)
          .filter((name): name is string => Boolean(name)),
      };
    });

    const relations = (edgesResult.data as KnowledgeEdgeRow[]).flatMap(
      (edge) => {
        const sourceKey = keysByNode.get(edge.source_node_id);
        const targetKey = keysByNode.get(edge.target_node_id);
        return sourceKey && targetKey
          ? [
              {
                source_key: sourceKey,
                target_key: targetKey,
                relation_type: edge.relation_type,
                label: edge.label,
                direction: edge.direction,
                visibility: edge.visibility,
                properties: edge.properties,
              },
            ]
          : [];
      },
    );

    const links = linksResult.data as KnowledgeAssetRow[];
    const assetIds = [...new Set(links.map((link) => link.asset_id))];
    const assetsResult = assetIds.length
      ? await this.database
          .from("assets")
          .select("*")
          .in("id", assetIds)
          .eq("status", "ready")
          .is("deleted_at", null)
      : emptyResult;
    if (assetsResult.error)
      throw new Error(rpcErrorMessage(assetsResult.error));

    const exportAttachments: KnowledgeExportAttachment[] = [];
    const assetRows = (assetsResult.data ?? []) as NexusAsset[];
    await allSettledOrThrow(
      assetRows.map((asset, index) => async () => {
        const url = await this.assets.createTemporaryAccess(asset, 300);
        const response = await this.fetcher(url);
        if (!response.ok) {
          throw new Error(`KNOWLEDGE_EXPORT_ATTACHMENT_FAILED:${asset.id}`);
        }
        const pageKeys = links
          .filter((link) => link.asset_id === asset.id)
          .map((link) => keysByNode.get(link.node_id))
          .filter((key): key is string => Boolean(key));
        exportAttachments.push({
          path: `attachments/${asset.id}/${safeAttachmentName(asset.original_name)}`,
          original_asset_id: asset.id,
          page_keys: pageKeys,
          bytes: new Uint8Array(await response.arrayBuffer()),
        });
        options.onProgress?.({
          phase: "downloading",
          completed: index + 1,
          total: assetRows.length,
          label: `Anexo ${index + 1} de ${assetRows.length}`,
        });
      }),
    );

    const snapshot: KnowledgeExportSnapshot = {
      workspace_id: options.workspaceId,
      campaign_id: options.campaignId,
      pages: exportPages,
      relations,
      attachments: exportAttachments,
    };
    options.onProgress?.({
      phase: "packing",
      completed: 0,
      total: 1,
      label: "Gerando ZIP reimportável",
    });
    const bytes = buildKnowledgeArchive(snapshot);
    options.onProgress?.({
      phase: "packing",
      completed: 1,
      total: 1,
      label: "ZIP concluído",
    });
    return { bytes, snapshot };
  }
}

export const knowledgePortabilityService = new KnowledgePortabilityService();

export function downloadKnowledgeArchive(bytes: Uint8Array, filename: string) {
  const blob = new Blob([copyToArrayBuffer(bytes)], {
    type: "application/zip",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
