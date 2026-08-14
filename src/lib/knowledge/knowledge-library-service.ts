import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  knowledgeService,
  type KnowledgeNode,
} from "@/lib/knowledge/knowledge-service";
import {
  KnowledgeServiceError,
  toKnowledgeServiceError,
} from "@/lib/knowledge/knowledge-errors";
import type {
  KnowledgeNodeType,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";

const libraryDatabase = supabase as unknown as SupabaseClient;

export interface KnowledgeTemplateRelation {
  relation_type: RelationType;
  label?: string;
}

export interface KnowledgeTemplate {
  id: string;
  workspace_id: string;
  node_type: KnowledgeNodeType;
  name: string;
  description: string;
  icon: string | null;
  default_content: string;
  default_properties: Json;
  required_fields: string[];
  suggested_relations: Json;
  is_default: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface KnowledgeTemplateInput {
  workspaceId: string;
  nodeType: KnowledgeNodeType;
  name: string;
  description?: string;
  icon?: string | null;
  defaultContent?: string;
  defaultProperties?: Json;
  requiredFields?: string[];
  suggestedRelations?: KnowledgeTemplateRelation[];
}

export interface KnowledgeSheetOption {
  id: string;
  name: string;
  campaign_id: string;
  campaign_name: string;
}

export type KnowledgeSheetSlot =
  | "reference"
  | "plot"
  | "ability"
  | "fragment"
  | "weapon"
  | "inventory"
  | "note";

function requireText(value: string, maxLength: number) {
  const normalized = value.trim();
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

function normalizeRequiredFields(values: string[] | undefined) {
  return Array.from(
    new Set(
      (values ?? []).map((value) => value.trim().slice(0, 80)).filter(Boolean),
    ),
  ).slice(0, 40);
}

function normalizeRelations(values: KnowledgeTemplateRelation[] | undefined) {
  return (values ?? []).slice(0, 20).map((value) => ({
    relation_type: value.relation_type,
    label: value.label?.trim().slice(0, 160) ?? "",
  })) as unknown as Json;
}

function withRequiredDefaults(template: KnowledgeTemplate) {
  const source = normalizeProperties(template.default_properties);
  const properties = { ...(source as Record<string, Json | undefined>) };
  for (const field of template.required_fields) {
    if (!(field in properties)) properties[field] = "";
  }
  return properties as Json;
}

export class KnowledgeLibraryService {
  private async currentUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user.id) {
      throw new KnowledgeServiceError("KNOWLEDGE_AUTH_REQUIRED");
    }
    return session.user.id;
  }

  async canManageWorkspace(workspaceId: string) {
    const userId = await this.currentUserId();
    const [{ data: membership, error: membershipError }, { data: workspace }] =
      await Promise.all([
        libraryDatabase
          .from("workspace_members")
          .select("role")
          .eq("workspace_id", workspaceId)
          .eq("user_id", userId)
          .maybeSingle(),
        libraryDatabase
          .from("workspaces")
          .select("owner_id")
          .eq("id", workspaceId)
          .maybeSingle(),
      ]);
    if (membershipError) throw toKnowledgeServiceError(membershipError);
    return (
      String(workspace?.owner_id ?? "") === userId ||
      ["owner", "admin"].includes(String(membership?.role ?? ""))
    );
  }

  async ensureDefaultTemplates(workspaceId: string) {
    const { data, error } = await libraryDatabase.rpc(
      "ensure_default_knowledge_templates",
      { p_workspace_id: workspaceId },
    );
    if (error) throw toKnowledgeServiceError(error);
    return Number(data ?? 0);
  }

  async listTemplates(workspaceId: string) {
    const { data, error } = await libraryDatabase
      .from("knowledge_templates")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .order("node_type")
      .order("name");
    if (error) throw toKnowledgeServiceError(error);
    return (data ?? []) as KnowledgeTemplate[];
  }

  async createTemplate(input: KnowledgeTemplateInput) {
    const userId = await this.currentUserId();
    const { data, error } = await libraryDatabase
      .from("knowledge_templates")
      .insert({
        workspace_id: input.workspaceId,
        node_type: input.nodeType,
        name: requireText(input.name, 120),
        description: input.description?.trim().slice(0, 600) ?? "",
        icon: input.icon?.trim().slice(0, 80) || null,
        default_content: input.defaultContent?.slice(0, 200_000) ?? "",
        default_properties: normalizeProperties(input.defaultProperties),
        required_fields: normalizeRequiredFields(input.requiredFields),
        suggested_relations: normalizeRelations(input.suggestedRelations),
        is_default: false,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error || !data) throw toKnowledgeServiceError(error);
    return data as KnowledgeTemplate;
  }

  async updateTemplate(
    template: KnowledgeTemplate,
    input: Omit<KnowledgeTemplateInput, "workspaceId">,
  ) {
    const userId = await this.currentUserId();
    const { data, error } = await libraryDatabase
      .from("knowledge_templates")
      .update({
        node_type: input.nodeType,
        name: requireText(input.name, 120),
        description: input.description?.trim().slice(0, 600) ?? "",
        icon: input.icon?.trim().slice(0, 80) || null,
        default_content: input.defaultContent?.slice(0, 200_000) ?? "",
        default_properties: normalizeProperties(input.defaultProperties),
        required_fields: normalizeRequiredFields(input.requiredFields),
        suggested_relations: normalizeRelations(input.suggestedRelations),
        updated_by: userId,
      })
      .eq("id", template.id)
      .eq("updated_at", template.updated_at)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
    return data as KnowledgeTemplate;
  }

  async duplicateTemplate(template: KnowledgeTemplate) {
    const suggested = Array.isArray(template.suggested_relations)
      ? (template.suggested_relations as unknown as KnowledgeTemplateRelation[])
      : [];
    return this.createTemplate({
      workspaceId: template.workspace_id,
      nodeType: template.node_type,
      name: `${template.name} ~ cópia`,
      description: template.description,
      icon: template.icon,
      defaultContent: template.default_content,
      defaultProperties: template.default_properties,
      requiredFields: template.required_fields,
      suggestedRelations: suggested,
    });
  }

  async softDeleteTemplate(template: KnowledgeTemplate) {
    const userId = await this.currentUserId();
    const { data, error } = await libraryDatabase
      .from("knowledge_templates")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", template.id)
      .eq("updated_at", template.updated_at)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw toKnowledgeServiceError(error);
    if (!data) throw new KnowledgeServiceError("KNOWLEDGE_CONFLICT");
  }

  async createNodeFromTemplate({
    template,
    title,
    campaignId,
    visibility,
  }: {
    template: KnowledgeTemplate;
    title: string;
    campaignId: string | null;
    visibility?: KnowledgeVisibility;
  }) {
    const normalizedTitle = requireText(title, 200);
    return knowledgeService.create({
      workspaceId: template.workspace_id,
      campaignId,
      nodeType: template.node_type,
      title: normalizedTitle,
      visibility: visibility ?? (campaignId ? "campaign" : "author"),
      contentMarkdown: template.default_content.replaceAll(
        "{{title}}",
        normalizedTitle,
      ),
      properties: withRequiredDefaults(template),
      icon: template.icon,
    });
  }

  async setFavoriteBulk(nodeIds: string[], favorite: boolean) {
    const userId = await this.currentUserId();
    const ids = Array.from(new Set(nodeIds)).slice(0, 100);
    if (!ids.length) return;
    const query = libraryDatabase.from("knowledge_favorites");
    const { error } = favorite
      ? await query.upsert(
          ids.map((nodeId) => ({ node_id: nodeId, user_id: userId })),
          { onConflict: "user_id,node_id", ignoreDuplicates: true },
        )
      : await query.delete().eq("user_id", userId).in("node_id", ids);
    if (error) throw toKnowledgeServiceError(error);
  }

  async linkNodesToCampaign(nodeIds: string[], campaignId: string) {
    const userId = await this.currentUserId();
    const ids = Array.from(new Set(nodeIds)).slice(0, 100);
    if (!ids.length) return;
    const { error } = await libraryDatabase
      .from("knowledge_campaign_links")
      .upsert(
        ids.map((nodeId) => ({
          node_id: nodeId,
          campaign_id: campaignId,
          created_by: userId,
        })),
        { onConflict: "node_id,campaign_id", ignoreDuplicates: true },
      );
    if (error) throw toKnowledgeServiceError(error);
  }

  async unlinkNodeFromCampaign(nodeId: string, campaignId: string) {
    const { error } = await libraryDatabase
      .from("knowledge_campaign_links")
      .delete()
      .eq("node_id", nodeId)
      .eq("campaign_id", campaignId);
    if (error) throw toKnowledgeServiceError(error);
  }

  async listSheets(workspaceId: string): Promise<KnowledgeSheetOption[]> {
    const { data, error } = await libraryDatabase
      .from("character_sheets")
      .select("id,name,campaign_id,campaigns!inner(workspace_id,name)")
      .eq("campaigns.workspace_id", workspaceId)
      .order("name");
    if (error) throw toKnowledgeServiceError(error);
    return (data ?? []).flatMap((row) => {
      const campaign = Array.isArray(row.campaigns)
        ? row.campaigns[0]
        : row.campaigns;
      return row.campaign_id && campaign
        ? [
            {
              id: String(row.id),
              name: String(row.name),
              campaign_id: String(row.campaign_id),
              campaign_name: String(campaign.name),
            },
          ]
        : [];
    });
  }

  async linkNodesToSheet(
    nodeIds: string[],
    sheetId: string,
    targetSlot: KnowledgeSheetSlot = "reference",
  ) {
    const userId = await this.currentUserId();
    const ids = Array.from(new Set(nodeIds)).slice(0, 100);
    if (!ids.length) return;
    const { error } = await libraryDatabase
      .from("knowledge_sheet_links")
      .upsert(
        ids.map((nodeId) => ({
          node_id: nodeId,
          sheet_id: sheetId,
          target_slot: targetSlot,
          created_by: userId,
        })),
        {
          onConflict: "node_id,sheet_id,target_slot",
          ignoreDuplicates: true,
        },
      );
    if (error) throw toKnowledgeServiceError(error);
  }

  async unlinkNodeFromSheet(
    nodeId: string,
    sheetId: string,
    targetSlot: KnowledgeSheetSlot = "reference",
  ) {
    const { error } = await libraryDatabase
      .from("knowledge_sheet_links")
      .delete()
      .eq("node_id", nodeId)
      .eq("sheet_id", sheetId)
      .eq("target_slot", targetSlot);
    if (error) throw toKnowledgeServiceError(error);
  }

  async listCampaignLinks(nodeId: string) {
    const { data, error } = await libraryDatabase
      .from("knowledge_campaign_links")
      .select("campaign_id,created_at")
      .eq("node_id", nodeId);
    if (error) throw toKnowledgeServiceError(error);
    return data ?? [];
  }

  async listSheetLinks(nodeId: string) {
    const { data, error } = await libraryDatabase
      .from("knowledge_sheet_links")
      .select("sheet_id,target_slot,created_at")
      .eq("node_id", nodeId);
    if (error) throw toKnowledgeServiceError(error);
    return data ?? [];
  }
}

export const knowledgeLibraryService = new KnowledgeLibraryService();

export function libraryNodeKey(node: Pick<KnowledgeNode, "id">) {
  return node.id;
}
