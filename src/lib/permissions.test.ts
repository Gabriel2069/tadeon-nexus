import { describe, expect, it } from "vitest";
import {
  can,
  getScenePermission,
  type PermissionContext,
} from "@/lib/permissions";

describe("central authorization", () => {
  const anonymous: PermissionContext = {};

  it("denies every protected operation without an assigned role", () => {
    expect(can("app:manage", anonymous)).toBe(false);
    expect(can("workspace:view", anonymous)).toBe(false);
    expect(can("campaign:view", anonymous)).toBe(false);
    expect(can("asset:view", anonymous)).toBe(false);
    expect(can("asset:upload", anonymous)).toBe(false);
    expect(can("knowledge:view", anonymous)).toBe(false);
    expect(can("knowledge:create", anonymous)).toBe(false);
    expect(can("character:create", anonymous)).toBe(false);
    expect(getScenePermission(anonymous)).toBeNull();
  });

  it("reuses the legacy mestre as application administrator during migration", () => {
    const administrator: PermissionContext = { appRole: "mestre" };

    expect(can("app:manage", administrator)).toBe(true);
    expect(can("feature-flags:manage", administrator)).toBe(true);
    expect(can("workspace:manage", administrator)).toBe(true);
    expect(can("campaign:manage", administrator)).toBe(true);
    expect(can("asset:manage", administrator)).toBe(true);
    expect(can("knowledge:publish", administrator)).toBe(true);
    expect(getScenePermission(administrator)).toBe("manage");
  });

  it("separates workspace ownership from campaign mastery", () => {
    expect(can("workspace:manage", { workspaceRole: "owner" })).toBe(true);
    expect(can("campaign:manage", { workspaceRole: "owner" })).toBe(true);
    expect(can("workspace:manage", { campaignRole: "master" })).toBe(false);
    expect(can("campaign:manage", { campaignRole: "master" })).toBe(true);
  });

  it("lets a co-master operate a campaign without becoming its sole master", () => {
    const coMaster: PermissionContext = { campaignRole: "co_master" };

    expect(can("campaign:co-manage", coMaster)).toBe(true);
    expect(can("campaign:manage", coMaster)).toBe(false);
    expect(can("scene:manage", coMaster)).toBe(true);
    expect(can("feature-flags:manage", coMaster)).toBe(false);
  });

  it("lets players interact while observers remain read-only", () => {
    const player: PermissionContext = { campaignRole: "player" };
    const observer: PermissionContext = { campaignRole: "observer" };

    expect(getScenePermission(player)).toBe("interact");
    expect(can("character:create", player)).toBe(true);
    expect(getScenePermission(observer)).toBe("view");
    expect(can("scene:interact", observer)).toBe(false);
    expect(can("character:create", observer)).toBe(false);
  });

  it("preserves current player sheet ownership rules", () => {
    const owner: PermissionContext = {
      appRole: "jogador",
      currentUserId: "user-a",
      resourceOwnerId: "user-a",
    };
    const spectatorOwner: PermissionContext = {
      appRole: "espectador",
      currentUserId: "user-a",
      resourceOwnerId: "user-a",
    };

    expect(can("character:view", owner)).toBe(true);
    expect(can("character:edit", owner)).toBe(true);
    expect(can("character:view", spectatorOwner)).toBe(true);
    expect(can("character:edit", spectatorOwner)).toBe(false);
  });

  it("keeps asset viewing broader than asset mutation", () => {
    const member: PermissionContext = { workspaceRole: "member" };
    const viewer: PermissionContext = { workspaceRole: "viewer" };
    const observer: PermissionContext = { campaignRole: "observer" };

    expect(can("asset:view", member)).toBe(true);
    expect(can("asset:upload", member)).toBe(true);
    expect(can("asset:manage", member)).toBe(false);
    expect(can("asset:link", member)).toBe(false);
    expect(can("asset:view", viewer)).toBe(true);
    expect(can("asset:upload", viewer)).toBe(false);
    expect(can("asset:view", observer)).toBe(true);
    expect(can("asset:upload", observer)).toBe(false);
  });

  it("lets contributors upload and only curators link shared assets", () => {
    const player: PermissionContext = { campaignRole: "player" };
    const coMaster: PermissionContext = { campaignRole: "co_master" };
    const owner: PermissionContext = {
      currentUserId: "user-a",
      resourceOwnerId: "user-a",
    };

    expect(can("asset:upload", player)).toBe(true);
    expect(can("asset:link", player)).toBe(false);
    expect(can("asset:manage", coMaster)).toBe(true);
    expect(can("asset:link", coMaster)).toBe(true);
    expect(can("asset:manage", owner)).toBe(true);
  });

  it("keeps knowledge reading, authorship and publication as separate powers", () => {
    const player: PermissionContext = {
      campaignRole: "player",
      currentUserId: "player-a",
    };
    const author: PermissionContext = {
      campaignRole: "player",
      currentUserId: "player-a",
      resourceOwnerId: "player-a",
    };
    const observer: PermissionContext = { campaignRole: "observer" };
    const coMaster: PermissionContext = { campaignRole: "co_master" };

    expect(can("knowledge:view", player)).toBe(true);
    expect(can("knowledge:create", player)).toBe(true);
    expect(can("knowledge:edit", player)).toBe(false);
    expect(can("knowledge:edit", author)).toBe(true);
    expect(can("knowledge:publish", author)).toBe(false);
    expect(can("knowledge:view", observer)).toBe(true);
    expect(can("knowledge:create", observer)).toBe(false);
    expect(can("knowledge:manage", coMaster)).toBe(true);
    expect(can("knowledge:publish", coMaster)).toBe(true);
  });
});
