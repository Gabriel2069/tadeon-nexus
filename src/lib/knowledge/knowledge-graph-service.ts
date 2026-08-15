import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  KnowledgeServiceError,
  toKnowledgeServiceError,
} from "@/lib/knowledge/knowledge-errors";
import type {
  KnowledgeNodeType,
  KnowledgeVisibility,
  RelationType,
} from "@/lib/nexus-contracts";
import type {
  KnowledgeLocalGraph,
  KnowledgeMemoryPayload,
} from "@/lib/knowledge/knowledge-graph-memory";

export type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeLocalGraph,
  KnowledgeMemoryNode,
  KnowledgeMemoryPayload,
  KnowledgeMemorySignal,
} from "@/lib/knowledge/knowledge-graph-memory";

const graphDatabase = supabase as unknown as SupabaseClient;

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

export interface KnowledgeMemoryGraphOptions {
  workspaceId: string;
  focusNodeId: string;
  campaignId?: string | null;
  includeWorkspace?: boolean;
  candidateLimit?: number;
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

function validatePayload(data: unknown): KnowledgeMemoryPayload {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new KnowledgeServiceError("KNOWLEDGE_UNKNOWN");
  }
  const graph = data as KnowledgeMemoryPayload;
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.signals)) {
    throw new KnowledgeServiceError("KNOWLEDGE_UNKNOWN");
  }
  return graph;
}

export class KnowledgeGraphService {
  async loadMemory(
    options: KnowledgeMemoryGraphOptions,
  ): Promise<KnowledgeMemoryPayload> {
    if (!options.workspaceId || !options.focusNodeId) {
      throw new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT");
    }
    const candidateLimit = boundedInteger(options.candidateLimit, 400, 40, 500);
    const { data, error } = await graphDatabase.rpc(
      "get_knowledge_graph_memory",
      {
        p_workspace_id: options.workspaceId,
        p_focus_node_id: options.focusNodeId,
        p_campaign_id: options.campaignId ?? null,
        p_include_workspace: options.includeWorkspace ?? true,
        p_candidate_limit: candidateLimit,
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
    return validatePayload(data);
  }

  /**
   * Legacy bounded graph contract kept for older callers and rolling deploys.
   * The interactive Nexus graph now uses loadMemory + the weighted client model.
   */
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
