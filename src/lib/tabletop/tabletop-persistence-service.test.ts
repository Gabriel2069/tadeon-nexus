import { describe, expect, it, vi } from "vitest";
import {
  mapTabletopScene,
  TabletopPersistenceService,
  TabletopServiceError,
} from "@/lib/tabletop/tabletop-persistence-service";

describe("tabletop persistence mapping", () => {
  it("maps numeric Postgres fields and keeps explicit links", () => {
    const scene = mapTabletopScene(
      {
        id: "scene", campaign_id: "campaign", name: "Porto", background_asset_id: null,
        width: 2400, height: 1600, grid_type: "square", grid_size: 64,
        grid_offset_x: "4", grid_offset_y: "8", grid_scale: "1.5",
        snap_enabled: true, global_illumination: "0.75", status: "active",
        order_index: 2, version: 3, created_at: "a", updated_at: "b",
      },
      [{ id: "tokens", scene_id: "scene", name: "Tokens", layer_type: "tokens", order_index: 2, visible: true, locked: false, version: 1 }],
      [{ id: "token", scene_id: "scene", layer_id: "tokens", entity_type: "token", name: "Myrova", linked_sheet_id: "sheet", linked_knowledge_node_id: "page", asset_id: "asset", x: "64", y: "128", width: "64", height: "64", rotation: "15", elevation: "2", z_index: 1, hidden: false, locked: false, owner_user_id: "owner", properties: { conditions: ["Marcado"] }, version: 4 }],
    );
    expect(scene.gridScale).toBe(1.5);
    expect(scene.entities[0]).toMatchObject({ x: 64, linkedSheetId: "sheet", linkedKnowledgeNodeId: "page", version: 4 });
  });
});

describe("TabletopPersistenceService conflicts", () => {
  it("reports a silent optimistic miss as TABLETOP_CONFLICT", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ maybeSingle }));
    const eqVersion = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqVersion }));
    const update = vi.fn(() => ({ eq: eqId }));
    const from = vi.fn(() => ({ update }));
    const auth = { getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: "owner" } } } }) };
    const service = new TabletopPersistenceService({ from } as never, auth as never);
    await expect(service.saveScene({ id: "scene", campaignId: "campaign", name: "Cena", backgroundAssetId: null, width: 2400, height: 1600, gridMode: "square", gridSize: 64, gridScale: 1, gridOffsetX: 0, gridOffsetY: 0, globalIllumination: 1, snap: true, status: "active", orderIndex: 0, version: 1, createdAt: "", updatedAt: "", layers: [], entities: [] })).rejects.toEqual(new TabletopServiceError("TABLETOP_CONFLICT"));
  });
});
