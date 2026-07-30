import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  KnowledgeServiceError,
  toKnowledgeServiceError,
} from "@/lib/knowledge/knowledge-errors";
import type {
  KnowledgeNodeStatus,
  KnowledgeNodeType,
  KnowledgeRelationDirection,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";

const graphDatabase = supabase as unknown as SupabaseClient;

export interface KnowledgeGraphNode {
  id: string;
  title: string;
  nodeType: KnowledgeNodeType;
  icon: string | null;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  campaignId: string | null;
  updatedAt: string;
  depth: number;
}

export interface KnowledgeGraphEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
}

export interface KnowledgeLocalGraph {
  focusNodeId: string;
  depth: number;
  limit: number;
  truncated: boolean;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface KnowledgeLocalGraphOptions {
  workspaceId: string;
  focusNodeId: string;
  campaignId?: string | null;
  includeWorkspace?: boolean;
  depth?: 1 | 2;
  limit?: number;
  nodeTypes?: KnowledgeNodeType[];
  relationTypes?: RelationType[];
  visibilities?: KnowledgeVisibility[];
}

function boundedInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value!)));
}

export class KnowledgeGraphService {
  async loadLocal(
    options: KnowledgeLocalGraphOptions,
  ): Promise<KnowledgeLocalGraph> {
    if (!options.workspaceId || !options.focusNodeId) {
      throw new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT");
    }
    const depth = boundedInteger(options.depth, 1, 1, 2) as 1 | 2;
    const limit = boundedInteger(options.limit, 120, 10, 250);
    const { data, error } = await graphDatabase.rpc(
      "get_knowledge_local_graph",
      {
        p_workspace_id: options.workspaceId,
        p_focus_node_id: options.focusNodeId,
        p_campaign_id: options.campaignId ?? null,
        p_include_workspace: options.includeWorkspace ?? true,
        p_depth: depth,
        p_limit: limit,
        p_node_types: options.nodeTypes?.length ? options.nodeTypes : null,
        p_relation_types: options.relationTypes?.length
          ? options.relationTypes
          : null,
        p_visibilities: options.visibilities?.length
          ? options.visibilities
          : null,
      },
    );
    if (error) throw toKnowledgeServiceError(error);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new KnowledgeServiceError("KNOWLEDGE_UNKNOWN");
    }
    const graph = data as unknown as KnowledgeLocalGraph;
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new KnowledgeServiceError("KNOWLEDGE_UNKNOWN");
    }
    return graph;
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();
