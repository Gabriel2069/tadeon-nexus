import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  KnowledgeAclPermission,
  KnowledgeNodeStatus,
  KnowledgeNodeType,
  KnowledgeRelationDirection,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";
import {
  KnowledgeServiceError,
  toKnowledgeServiceError,
} from "@/lib/knowledge/knowledge-errors";
import {
  extractWikilinks,
  markdownToPlainText,
  normalizeKnowledgeLookup,
  slugifyKnowledgeTitle,
  type WikilinkReference,
} from "@/lib/knowledge/wikilinks";

const knowledgeDatabase = supabase as unknown as SupabaseClient;
const DEFAULT_PAGE_SIZE = 30;

export interface KnowledgeNode {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  node_type: KnowledgeNodeType;
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  plain_text: string;
  properties: Json;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  icon: string | null;
  cover_asset_id: string | null;
  parent_node_id: string | null;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  version_sequence: number;
}

export interface KnowledgeVersion {
  id: string;
  node_id: string;
  version_number: number;
  title_snapshot: string;
  summary_snapshot: string;
  content_snapshot: string;
  properties_snapshot: Json;
  status_snapshot: KnowledgeNodeStatus;
  visibility_snapshot: KnowledgeVisibility;
  created_by: string;
  created_at: string;
  reason: string;
  automatic: boolean;
}

export interface KnowledgeEdge {
  id: string;
  workspace_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  properties: Json;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateKnowledgeNodeInput {
  workspaceId: string;
  campaignId?: string | null;
  nodeType?: KnowledgeNodeType;
  title: string;
  slug?: string;
  summary?: string;
  contentMarkdown?: string;
  properties?: Json;
  status?: KnowledgeNodeStatus;
  visibility?: KnowledgeVisibility;
  icon?: string | null;
  coverAssetId?: string | null;
  parentNodeId?: string | null;
}

export interface UpdateKnowledgeNodeInput {
  title?: string;
  slug?: string;
  summary?: string;
  contentMarkdown?: string;
  properties?: Json;
  status?: KnowledgeNodeStatus;
  visibility?: KnowledgeVisibility;
  nodeType?: KnowledgeNodeType;
  icon?: string | null;
  coverAssetId?: string | null;
  parentNodeId?: string | null;
}

export interface KnowledgeListOptions {
  workspaceId: string;
  campaignId?: string | null;
  nodeType?: KnowledgeNodeType;
  status?: KnowledgeNodeStatus;
  search?: string;
  parentNodeId?: string | null;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
}

export interface KnowledgeListResult {
  nodes: KnowledgeNode[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ResolvedWikilink {
  reference: WikilinkReference;
  node: KnowledgeNode | null;
  broken: boolean;
}

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value!)));
}

function requireText(value: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > maxLength) {
    throw new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT");
  }
  return normalized;
}

function normalizeProperties(value: Json | undefined): Json {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function escapePostgrestPattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function preferCampaignScope(
  rows: KnowledgeNode[],
  campaignId: string | null | undefined,
) {
  return [...rows].sort((left, right) => {
    const leftScore = left.campaign_id === campaignId ? 0 : 1;
    const rightScore = right.campaign_id === campaignId ? 0 : 1;
    return leftScore - rightScore || left.title.localeCompare(right.title);
  });
}

export class KnowledgeService {
  private async currentUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user.id) {
      throw new KnowledgeServiceError("KNOWLEDGE_AUTH_REQUIRED");
    }
    return session.user.id;
  }

  async create(input: CreateKnowledgeNodeInput) {
    const userId = await this.currentUserId();
    const title = requireText(input.title, 200);
    const contentMarkdown = input.contentMarkdown ?? "";
    const { data, error } = await knowledgeDatabase
      .from("knowledge_nodes")
      .insert({
        workspace_id: input.workspaceId,
        campaign_id: input.campaignId ?? null,
        node_type: input.nodeType ?? "free_note",
        title,
        slug: input.slug
          ? slugifyKnowledgeTitle(input.slug)
          : slugifyKnowledgeTitle(title),
        summary: input.summary?.trim().slice(0, 2000) ?? "",
        content_markdown: contentMarkdown,
        plain_text: markdownToPlainText(contentMarkdown),
        properties: normalizeProperties(input.properties),
        status: input.status ?? "draft",
        visibility:
          input.visibility ?? (input.campaignId ? "campaign" : "author"),
        icon: input.icon ?? null,
        cover_asset_id: input.coverAssetId ?? null,
        parent_node_id: input.parentNodeId ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw toKnowledgeServiceError(error, "KNOWLEDGE_INVALID_INPUT");
    }
    const node = data as KnowledgeNode;
    const mentionsSynchronized = await this.syncMentions(node).catch(
      () => false,
    );
    return { node, mentionsSynchronized };
  }

  async get(nodeId: string) {
    const { data, error } = await knowledgeDatabase
      .from("knowledge_nodes")
      .select("*")
      .eq("id", nodeId)
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_NOT_FOUND");
    return data as KnowledgeNode;
  }

  async list(options: KnowledgeListOptions): Promise<KnowledgeListResult> {
    const page = clampInteger(options.page, 0, 0, 100000);
    const pageSize = clampInteger(
      options.pageSize,
      DEFAULT_PAGE_SIZE,
      1,
      100,
    );
    const start = page * pageSize;
    let query = knowledgeDatabase
      .from("knowledge_nodes")
      .select("*", { count: "exact" })
      .eq("workspace_id", options.workspaceId)
      .order("updated_at", { ascending: false })
      .range(start, start + pageSize - 1);

    if (!options.includeDeleted) query = query.is("deleted_at", null);
    if (!options.includeArchived) query = query.neq("status", "archived");
    if (options.campaignId !== undefined) {
      query = options.campaignId
        ? query.eq("campaign_id", options.campaignId)
        : query.is("campaign_id", null);
    }
    if (options.nodeType) query = query.eq("node_type", options.nodeType);
    if (options.status) query = query.eq("status", options.status);
    if (options.parentNodeId !== undefined) {
      query = options.parentNodeId
        ? query.eq("parent_node_id", options.parentNodeId)
        : query.is("parent_node_id", null);
    }
    if (options.search?.trim()) {
      query = query.textSearch(
        "search_document",
        options.search.trim().slice(0, 160),
        { config: "simple", type: "websearch" },
      );
    }

    const { data, error, count } = await query;
    if (error) throw toKnowledgeServiceError(error);
    const nodes = (data ?? []) as KnowledgeNode[];
    return {
      nodes,
      count: count ?? nodes.length,
      page,
      pageSize,
      hasMore: start + nodes.length < (count ?? nodes.length),
    };
  }

  async update(
    nodeId: string,
    input: UpdateKnowledgeNodeInput,
    expectedUpdatedAt: string,
  ) {
    const userId = await this.currentUserId();
    const current = await this.get(nodeId);
    if (current.updated_at !== expectedUpdatedAt) {
      throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
    }

    const patch: Record<string, unknown> = { updated_by: userId };
    if (input.title !== undefined) patch.title = requireText(input.title, 200);
    if (input.slug !== undefined)
      patch.slug = slugifyKnowledgeTitle(input.slug);
    if (input.summary !== undefined)
      patch.summary = input.summary.trim().slice(0, 2000);
    if (input.contentMarkdown !== undefined) {
      patch.content_markdown = input.contentMarkdown;
      patch.plain_text = markdownToPlainText(input.contentMarkdown);
    }
    if (input.properties !== undefined)
      patch.properties = normalizeProperties(input.properties);
    if (input.status !== undefined) patch.status = input.status;
    if (input.visibility !== undefined) patch.visibility = input.visibility;
    if (input.nodeType !== undefined) patch.node_type = input.nodeType;
    if (input.icon !== undefined) patch.icon = input.icon;
    if (input.coverAssetId !== undefined)
      patch.cover_asset_id = input.coverAssetId;
    if (input.parentNodeId !== undefined)
      patch.parent_node_id = input.parentNodeId;

    const { data, error } = await knowledgeDatabase
      .from("knowledge_nodes")
      .update(patch)
      .eq("id", nodeId)
      .eq("updated_at", expectedUpdatedAt)
      .select("*")
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");

    const node = data as KnowledgeNode;
    const mentionsSynchronized =
      input.contentMarkdown === undefined
        ? true
        : await this.syncMentions(node).catch(() => false);
    return { node, mentionsSynchronized };
  }

  async rename(
    nodeId: string,
    title: string,
    expectedUpdatedAt: string,
    preserveOldTitleAsAlias = true,
  ) {
    const current = await this.get(nodeId);
    const result = await this.update(
      nodeId,
      { title, slug: slugifyKnowledgeTitle(title) },
      expectedUpdatedAt,
    );
    let aliasPreserved = false;
    if (
      preserveOldTitleAsAlias &&
      normalizeKnowledgeLookup(current.title) !== normalizeKnowledgeLookup(title)
    ) {
      aliasPreserved = await this.addAlias(nodeId, current.title)
        .then(() => true)
        .catch(() => false);
    }
    return { ...result, aliasPreserved };
  }

  async archive(node: KnowledgeNode) {
    return this.update(
      node.id,
      { status: "archived" },
      node.updated_at,
    );
  }

  async softDelete(node: KnowledgeNode) {
    const userId = await this.currentUserId();
    const { data, error } = await knowledgeDatabase
      .from("knowledge_nodes")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", node.id)
      .eq("updated_at", node.updated_at)
      .select("*")
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
    return data as KnowledgeNode;
  }

  async restore(node: KnowledgeNode) {
    const userId = await this.currentUserId();
    const { data, error } = await knowledgeDatabase
      .from("knowledge_nodes")
      .update({ deleted_at: null, updated_by: userId })
      .eq("id", node.id)
      .eq("updated_at", node.updated_at)
      .select("*")
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
    return data as KnowledgeNode;
  }

  async addAlias(nodeId: string, alias: string) {
    const userId = await this.currentUserId();
    const normalized = requireText(alias, 200);
    const { data, error } = await knowledgeDatabase
      .from("knowledge_aliases")
      .insert({
        node_id: nodeId,
        alias: normalized,
        normalized_alias: normalizeKnowledgeLookup(normalized),
        workspace_id: crypto.randomUUID(),
        created_by: userId,
      })
      .select("*")
      .single();
    if (error || !data) {
      throw toKnowledgeServiceError(error, "KNOWLEDGE_ALIAS_CONFLICT");
    }
    return data;
  }

  async removeAlias(aliasId: string) {
    const { error } = await knowledgeDatabase
      .from("knowledge_aliases")
      .delete()
      .eq("id", aliasId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async listAliases(nodeId: string) {
    const { data, error } = await knowledgeDatabase
      .from("knowledge_aliases")
      .select("*")
      .eq("node_id", nodeId)
      .order("alias");
    if (error) throw toKnowledgeServiceError(error);
    return data ?? [];
  }

  private scopeQuery<
    T extends {
      or: (filters: string) => T;
      is: (column: string, value: null) => T;
    },
  >(
    query: T,
    campaignId?: string | null,
  ) {
    if (!campaignId) return query.is("campaign_id", null);
    if (!isUuid(campaignId)) {
      throw new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT");
    }
    return query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`);
  }

  async resolveTarget(
    workspaceId: string,
    campaignId: string | null | undefined,
    target: string,
  ): Promise<KnowledgeNode | null> {
    const normalized = normalizeKnowledgeLookup(target);
    if (!normalized) return null;
    const slug = slugifyKnowledgeTitle(target);

    let slugQuery = knowledgeDatabase
      .from("knowledge_nodes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("slug", slug)
      .is("deleted_at", null)
      .limit(4);
    slugQuery = this.scopeQuery(slugQuery, campaignId);
    const { data: slugRows, error: slugError } = await slugQuery;
    if (slugError) throw toKnowledgeServiceError(slugError);
    if (slugRows?.length) {
      return preferCampaignScope(slugRows as KnowledgeNode[], campaignId)[0];
    }

    let titleQuery = knowledgeDatabase
      .from("knowledge_nodes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .ilike("title", escapePostgrestPattern(target.trim()))
      .is("deleted_at", null)
      .limit(4);
    titleQuery = this.scopeQuery(titleQuery, campaignId);
    const { data: titleRows, error: titleError } = await titleQuery;
    if (titleError) throw toKnowledgeServiceError(titleError);
    if (titleRows?.length) {
      return preferCampaignScope(titleRows as KnowledgeNode[], campaignId)[0];
    }

    let aliasQuery = knowledgeDatabase
      .from("knowledge_aliases")
      .select("node_id,campaign_id")
      .eq("workspace_id", workspaceId)
      .eq("normalized_alias", normalized)
      .limit(4);
    aliasQuery = this.scopeQuery(aliasQuery, campaignId);
    const { data: aliasRows, error: aliasError } = await aliasQuery;
    if (aliasError) throw toKnowledgeServiceError(aliasError);
    const orderedAliases = [...(aliasRows ?? [])].sort((left, right) => {
      const leftScore = left.campaign_id === campaignId ? 0 : 1;
      const rightScore = right.campaign_id === campaignId ? 0 : 1;
      return leftScore - rightScore;
    });
    return orderedAliases[0]?.node_id
      ? this.get(String(orderedAliases[0].node_id))
      : null;
  }

  async resolveWikilinks(node: KnowledgeNode): Promise<ResolvedWikilink[]> {
    const references = extractWikilinks(node.content_markdown).slice(0, 200);
    return Promise.all(
      references.map(async (reference) => {
        const resolved = await this.resolveTarget(
          node.workspace_id,
          node.campaign_id,
          reference.target,
        );
        return {
          reference,
          node: resolved,
          broken: !resolved,
        };
      }),
    );
  }

  async syncMentions(node: KnowledgeNode) {
    const resolved = await this.resolveWikilinks(node);
    const mentions = resolved
      .filter(
        (
          entry,
        ): entry is ResolvedWikilink & { node: KnowledgeNode } =>
          Boolean(entry.node && entry.node.id !== node.id),
      )
      .map((entry) => ({
        source_node_id: node.id,
        target_node_id: entry.node.id,
        raw_text: entry.reference.raw,
        start_position: entry.reference.start,
        end_position: entry.reference.end,
      }));

    const { error: deleteError } = await knowledgeDatabase
      .from("knowledge_mentions")
      .delete()
      .eq("source_node_id", node.id);
    if (deleteError) throw toKnowledgeServiceError(deleteError);
    if (!mentions.length) return true;

    const { error } = await knowledgeDatabase
      .from("knowledge_mentions")
      .insert(mentions);
    if (error) throw toKnowledgeServiceError(error);
    return true;
  }

  async listVersions(nodeId: string, limit = 50) {
    const { data, error } = await knowledgeDatabase
      .from("knowledge_versions")
      .select("*")
      .eq("node_id", nodeId)
      .order("version_number", { ascending: false })
      .limit(clampInteger(limit, 50, 1, 200));
    if (error) throw toKnowledgeServiceError(error);
    return (data ?? []) as KnowledgeVersion[];
  }

  async restoreVersion(node: KnowledgeNode, version: KnowledgeVersion) {
    return this.update(
      node.id,
      {
        title: version.title_snapshot,
        summary: version.summary_snapshot,
        contentMarkdown: version.content_snapshot,
        properties: version.properties_snapshot,
        status: version.status_snapshot,
        visibility: version.visibility_snapshot,
      },
      node.updated_at,
    );
  }

  async createEdge(input: {
    sourceNodeId: string;
    targetNodeId: string;
    relationType: RelationType;
    label?: string;
    direction?: KnowledgeRelationDirection;
    visibility?: KnowledgeVisibility;
    properties?: Json;
  }) {
    const userId = await this.currentUserId();
    const { data, error } = await knowledgeDatabase
      .from("knowledge_edges")
      .insert({
        workspace_id: crypto.randomUUID(),
        source_node_id: input.sourceNodeId,
        target_node_id: input.targetNodeId,
        relation_type: input.relationType,
        label: input.label?.trim().slice(0, 160) ?? "",
        direction: input.direction ?? "directed",
        visibility: input.visibility ?? "workspace",
        properties: normalizeProperties(input.properties),
        created_by: userId,
      })
      .select("*")
      .single();
    if (error || !data) throw toKnowledgeServiceError(error);
    return data as KnowledgeEdge;
  }

  async listEdges(nodeId: string) {
    if (!isUuid(nodeId)) {
      throw new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT");
    }
    const { data, error } = await knowledgeDatabase
      .from("knowledge_edges")
      .select("*")
      .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw toKnowledgeServiceError(error);
    return (data ?? []) as KnowledgeEdge[];
  }

  async removeEdge(edgeId: string) {
    const { error } = await knowledgeDatabase
      .from("knowledge_edges")
      .delete()
      .eq("id", edgeId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async setNodeAccess(
    nodeId: string,
    userId: string,
    permission: KnowledgeAclPermission,
  ) {
    const actorId = await this.currentUserId();
    const { error } = await knowledgeDatabase
      .from("knowledge_node_acl")
      .upsert(
        {
          node_id: nodeId,
          user_id: userId,
          permission,
          created_by: actorId,
        },
        { onConflict: "node_id,user_id" },
      );
    if (error) throw toKnowledgeServiceError(error);
  }

  async removeNodeAccess(nodeId: string, userId: string) {
    const { error } = await knowledgeDatabase
      .from("knowledge_node_acl")
      .delete()
      .eq("node_id", nodeId)
      .eq("user_id", userId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async attachAsset(
    nodeId: string,
    assetId: string,
    role = "attachment",
    caption = "",
    sortOrder = 0,
  ) {
    const userId = await this.currentUserId();
    const { data, error } = await knowledgeDatabase
      .from("knowledge_assets")
      .insert({
        node_id: nodeId,
        asset_id: assetId,
        asset_role: role,
        caption: caption.slice(0, 500),
        sort_order: Math.max(0, Math.trunc(sortOrder)),
        created_by: userId,
      })
      .select("*")
      .single();
    if (error || !data) throw toKnowledgeServiceError(error);
    return data;
  }

  async detachAsset(linkId: string) {
    const { error } = await knowledgeDatabase
      .from("knowledge_assets")
      .delete()
      .eq("id", linkId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async setFavorite(nodeId: string, favorite: boolean) {
    const userId = await this.currentUserId();
    const query = knowledgeDatabase.from("knowledge_favorites");
    const { error } = favorite
      ? await query.upsert(
          { node_id: nodeId, user_id: userId },
          { onConflict: "user_id,node_id" },
        )
      : await query.delete().eq("node_id", nodeId).eq("user_id", userId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async touchRecent(nodeId: string) {
    const userId = await this.currentUserId();
    const { error } = await knowledgeDatabase.from("knowledge_recent").upsert(
      {
        node_id: nodeId,
        user_id: userId,
        last_opened_at: new Date().toISOString(),
      },
      { onConflict: "user_id,node_id" },
    );
    if (error) throw toKnowledgeServiceError(error);
  }
}

export const knowledgeService = new KnowledgeService();
