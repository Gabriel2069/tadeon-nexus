export const APP_ROLES = ["mestre", "jogador", "espectador"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const WORKSPACE_ROLES = ["owner", "admin", "member", "viewer"] as const;
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export const CAMPAIGN_ROLES = ["master", "co_master", "player", "observer"] as const;
export type CampaignRole = (typeof CAMPAIGN_ROLES)[number];

export const ASSET_PROVIDERS = ["supabase", "r2"] as const;
export type AssetProvider = (typeof ASSET_PROVIDERS)[number];

export const ASSET_VISIBILITIES = ["private", "workspace", "campaign"] as const;
export type AssetVisibility = (typeof ASSET_VISIBILITIES)[number];

export const KNOWLEDGE_NODE_TYPES = [
  "page",
  "character",
  "location",
  "organization",
  "event",
  "item",
  "creature",
  "concept",
] as const;
export type KnowledgeNodeType = (typeof KNOWLEDGE_NODE_TYPES)[number];

export const KNOWLEDGE_NODE_STATUSES = ["draft", "active", "archived"] as const;
export type KnowledgeNodeStatus = (typeof KNOWLEDGE_NODE_STATUSES)[number];

export const KNOWLEDGE_VISIBILITIES = ["private", "masters", "campaign", "workspace"] as const;
export type KnowledgeVisibility = (typeof KNOWLEDGE_VISIBILITIES)[number];

export const RELATION_TYPES = [
  "related_to",
  "part_of",
  "located_in",
  "member_of",
  "owns",
  "created_by",
  "allied_with",
  "opposes",
  "parent_of",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const SCENE_ENTITY_TYPES = [
  "token",
  "object",
  "drawing",
  "wall",
  "light",
  "handout",
] as const;
export type SceneEntityType = (typeof SCENE_ENTITY_TYPES)[number];

export const SCENE_PERMISSIONS = ["manage", "edit", "interact", "view"] as const;
export type ScenePermission = (typeof SCENE_PERMISSIONS)[number];

export const TABLETOP_ROLES = ["master", "co_master", "player", "observer"] as const;
export type TabletopRole = (typeof TABLETOP_ROLES)[number];

export const FEATURE_FLAG_KEYS = [
  "nexus_knowledge_enabled",
  "nexus_graph_enabled",
  "nexus_assets_v2_enabled",
  "nexus_tabletop_enabled",
  "nexus_realtime_enabled",
  "nexus_lighting_enabled",
  "nexus_r2_enabled",
] as const;
export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];
