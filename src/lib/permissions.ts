import type {
  AppRole,
  CampaignRole,
  ScenePermission,
  WorkspaceRole,
} from "@/lib/nexus-contracts";

export type Permission =
  | "app:manage"
  | "feature-flags:manage"
  | "workspace:view"
  | "workspace:manage"
  | "campaign:view"
  | "campaign:co-manage"
  | "campaign:manage"
  | "asset:view"
  | "asset:upload"
  | "asset:manage"
  | "asset:link"
  | "knowledge:view"
  | "knowledge:create"
  | "knowledge:edit"
  | "knowledge:manage"
  | "knowledge:publish"
  | "character:create"
  | "character:view"
  | "character:edit"
  | "character:delete"
  | "scene:view"
  | "scene:interact"
  | "scene:edit"
  | "scene:manage";

export interface PermissionContext {
  appRole?: AppRole | null;
  workspaceRole?: WorkspaceRole | null;
  campaignRole?: CampaignRole | null;
  currentUserId?: string | null;
  resourceOwnerId?: string | null;
}

const WORKSPACE_VIEWERS = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "member",
  "viewer",
]);
const WORKSPACE_CONTRIBUTORS = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "member",
]);
const WORKSPACE_MANAGERS = new Set<WorkspaceRole>(["owner", "admin"]);
const CAMPAIGN_VIEWERS = new Set<CampaignRole>([
  "master",
  "co_master",
  "player",
  "observer",
]);
const CAMPAIGN_CONTRIBUTORS = new Set<CampaignRole>([
  "master",
  "co_master",
  "player",
]);
const CAMPAIGN_CO_MANAGERS = new Set<CampaignRole>(["master", "co_master"]);

export function isApplicationAdministrator(context: PermissionContext) {
  return context.appRole === "mestre";
}

export function isResourceOwner(context: PermissionContext) {
  return Boolean(
    context.currentUserId &&
    context.resourceOwnerId &&
    context.currentUserId === context.resourceOwnerId,
  );
}

export function can(permission: Permission, context: PermissionContext) {
  if (isApplicationAdministrator(context)) return true;

  const workspaceRole = context.workspaceRole ?? null;
  const campaignRole = context.campaignRole ?? null;
  const workspaceViewer = workspaceRole
    ? WORKSPACE_VIEWERS.has(workspaceRole)
    : false;
  const workspaceContributor = workspaceRole
    ? WORKSPACE_CONTRIBUTORS.has(workspaceRole)
    : false;
  const workspaceManager = workspaceRole
    ? WORKSPACE_MANAGERS.has(workspaceRole)
    : false;
  const campaignViewer = campaignRole
    ? CAMPAIGN_VIEWERS.has(campaignRole)
    : false;
  const campaignContributor = campaignRole
    ? CAMPAIGN_CONTRIBUTORS.has(campaignRole)
    : false;
  const campaignCoManager = campaignRole
    ? CAMPAIGN_CO_MANAGERS.has(campaignRole)
    : false;

  switch (permission) {
    case "app:manage":
    case "feature-flags:manage":
      return false;
    case "workspace:view":
      return workspaceViewer;
    case "workspace:manage":
      return workspaceManager;
    case "campaign:view":
      return workspaceManager || campaignViewer;
    case "campaign:co-manage":
      return workspaceManager || campaignCoManager;
    case "campaign:manage":
      return workspaceManager || campaignRole === "master";
    case "asset:view":
      return isResourceOwner(context) || workspaceViewer || campaignViewer;
    case "asset:upload":
      return workspaceContributor || campaignContributor;
    case "asset:manage":
      return isResourceOwner(context) || workspaceManager || campaignCoManager;
    case "asset:link":
      return workspaceManager || campaignCoManager;
    case "knowledge:view":
      return isResourceOwner(context) || workspaceViewer || campaignViewer;
    case "knowledge:create":
      return workspaceContributor || campaignContributor;
    case "knowledge:edit":
      return isResourceOwner(context) || workspaceManager || campaignCoManager;
    case "knowledge:manage":
    case "knowledge:publish":
      return workspaceManager || campaignCoManager;
    case "character:create":
      return (
        context.appRole === "jogador" ||
        campaignRole === "master" ||
        campaignRole === "co_master" ||
        campaignRole === "player"
      );
    case "character:view":
      return isResourceOwner(context) || workspaceManager || campaignViewer;
    case "character:edit":
      return (
        workspaceManager ||
        campaignCoManager ||
        (isResourceOwner(context) &&
          (context.appRole === "jogador" || campaignRole === "player"))
      );
    case "character:delete":
      return (
        workspaceManager ||
        campaignCoManager ||
        (isResourceOwner(context) &&
          (context.appRole === "jogador" || campaignRole === "player"))
      );
    case "scene:view":
      return workspaceManager || campaignViewer;
    case "scene:interact":
      return workspaceManager || campaignCoManager || campaignRole === "player";
    case "scene:edit":
    case "scene:manage":
      return workspaceManager || campaignCoManager;
  }
}

export function getScenePermission(
  context: PermissionContext,
): ScenePermission | null {
  if (can("scene:manage", context)) return "manage";
  if (can("scene:edit", context)) return "edit";
  if (can("scene:interact", context)) return "interact";
  if (can("scene:view", context)) return "view";
  return null;
}
