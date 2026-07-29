import type { AppRole, CampaignRole, ScenePermission, WorkspaceRole } from "@/lib/nexus-contracts";

export type Permission =
  | "app:manage"
  | "feature-flags:manage"
  | "workspace:view"
  | "workspace:manage"
  | "campaign:view"
  | "campaign:co-manage"
  | "campaign:manage"
  | "character:create"
  | "character:view"
  | "character:edit"
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

const WORKSPACE_VIEWERS = new Set<WorkspaceRole>(["owner", "admin", "member", "viewer"]);
const WORKSPACE_MANAGERS = new Set<WorkspaceRole>(["owner", "admin"]);
const CAMPAIGN_VIEWERS = new Set<CampaignRole>(["master", "co_master", "player", "observer"]);
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
  const workspaceManager = workspaceRole ? WORKSPACE_MANAGERS.has(workspaceRole) : false;
  const campaignCoManager = campaignRole ? CAMPAIGN_CO_MANAGERS.has(campaignRole) : false;

  switch (permission) {
    case "app:manage":
    case "feature-flags:manage":
      return false;
    case "workspace:view":
      return workspaceRole ? WORKSPACE_VIEWERS.has(workspaceRole) : false;
    case "workspace:manage":
      return workspaceManager;
    case "campaign:view":
      return workspaceManager || (campaignRole ? CAMPAIGN_VIEWERS.has(campaignRole) : false);
    case "campaign:co-manage":
      return workspaceManager || campaignCoManager;
    case "campaign:manage":
      return workspaceManager || campaignRole === "master";
    case "character:create":
      return (
        context.appRole === "jogador" ||
        campaignRole === "master" ||
        campaignRole === "co_master" ||
        campaignRole === "player"
      );
    case "character:view":
      return (
        isResourceOwner(context) ||
        workspaceManager ||
        (campaignRole ? CAMPAIGN_VIEWERS.has(campaignRole) : false)
      );
    case "character:edit":
      return (
        workspaceManager ||
        campaignCoManager ||
        (isResourceOwner(context) && (context.appRole === "jogador" || campaignRole === "player"))
      );
    case "scene:view":
      return workspaceManager || (campaignRole ? CAMPAIGN_VIEWERS.has(campaignRole) : false);
    case "scene:interact":
      return workspaceManager || campaignCoManager || campaignRole === "player";
    case "scene:edit":
    case "scene:manage":
      return workspaceManager || campaignCoManager;
  }
}

export function getScenePermission(context: PermissionContext): ScenePermission | null {
  if (can("scene:manage", context)) return "manage";
  if (can("scene:edit", context)) return "edit";
  if (can("scene:interact", context)) return "interact";
  if (can("scene:view", context)) return "view";
  return null;
}
