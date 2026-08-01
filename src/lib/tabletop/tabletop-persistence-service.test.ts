import { describe, expect, it, vi } from "vitest";
import {
  buildTabletopSavePayload,
  fitTabletopAssetSize,
  mapTabletopScene,
  TabletopPersistenceService,
  TabletopServiceError,
} from "@/lib/tabletop/tabletop-persistence-service";

describe("tabletop persistence mapping", () => {
  it("fits large assets without distorting their ratio", () => {
    expect(fitTabletopAssetSize(4000, 2000)).toEqual({
      width: 256,
      height: 128,
    });
    expect(fitTabletopAssetSize(null, null)).toEqual({
      width: 128,
      height: 96,
    });
  });

  it("maps numeric Postgres fields and keeps explicit links", () => {
    const scene = mapTabletopScene(
      {
        id: "scene",
        campaign_id: "campaign",
        name: "Porto",
        background_asset_id: null,
        width: 2400,
        height: 1600,
        grid_type: "square",
        grid_size: 64,
        grid_offset_x: "4",
        grid_offset_y: "8",
        grid_scale: "1.5",
        snap_enabled: true,
        global_illumination: "0.75",
        status: "active",
        order_index: 2,
        version: 3,
        created_at: "a",
        updated_at: "b",
      },
      [
        {
          id: "tokens",
          scene_id: "scene",
          name: "Tokens",
          layer_type: "tokens",
          order_index: 2,
          visible: true,
          locked: false,
          version: 1,
        },
      ],
      [
        {
          id: "token",
          scene_id: "scene",
          layer_id: "tokens",
          entity_type: "token",
          name: "Myrova",
          linked_sheet_id: "sheet",
          linked_knowledge_node_id: "page",
          asset_id: "asset",
          x: "64",
          y: "128",
          width: "64",
          height: "64",
          rotation: "15",
          elevation: "2",
          z_index: 1,
          hidden: false,
          locked: false,
          owner_user_id: "owner",
          properties: { conditions: ["Marcado"] },
          version: 4,
        },
      ],
    );
    expect(scene.gridScale).toBe(1.5);
    expect(scene.entities[0]).toMatchObject({
      x: 64,
      linkedSheetId: "sheet",
      linkedKnowledgeNodeId: "page",
      version: 4,
    });
  });

  it("builds one optimistic payload for layers, new entities and deletions", () => {
    const original = mapTabletopScene(
      {
        id: "scene",
        campaign_id: "campaign",
        name: "Porto",
        background_asset_id: null,
        width: 2400,
        height: 1600,
        grid_type: "square",
        grid_size: 64,
        grid_offset_x: 0,
        grid_offset_y: 0,
        grid_scale: 1,
        snap_enabled: true,
        global_illumination: 1,
        status: "active",
        order_index: 0,
        version: 7,
        created_at: "a",
        updated_at: "b",
      },
      [
        {
          id: "tokens",
          scene_id: "scene",
          name: "Tokens",
          layer_type: "tokens",
          order_index: 2,
          visible: true,
          locked: false,
          version: 3,
        },
      ],
      [
        {
          id: "old",
          scene_id: "scene",
          layer_id: "tokens",
          entity_type: "token",
          name: "Antigo",
          linked_sheet_id: null,
          linked_knowledge_node_id: null,
          asset_id: null,
          x: 0,
          y: 0,
          width: 64,
          height: 64,
          rotation: 0,
          elevation: 0,
          z_index: 1,
          hidden: false,
          locked: false,
          owner_user_id: null,
          properties: {},
          version: 5,
        },
      ],
    );
    const payload = buildTabletopSavePayload(original, {
      ...original,
      layers: [{ ...original.layers[0], visible: false }],
      entities: [
        {
          id: "new",
          layerId: "tokens",
          type: "token",
          label: "Novo",
          x: 64,
          y: 64,
          width: 64,
          height: 64,
          rotation: 0,
          zIndex: 2,
          hidden: false,
          locked: false,
          color: 0x8d3152,
        },
      ],
    });

    expect(payload.layerDocuments[0]).toMatchObject({
      version: 3,
      visible: false,
    });
    expect(payload.entityDocuments[0]).toMatchObject({ id: "new", version: 0 });
    expect(payload.deletedEntityDocuments[0]).toEqual({
      id: "old",
      version: 5,
    });
    expect(payload.sceneDocument).toMatchObject({
      name: "Porto",
      status: "active",
    });
  });

  it("keeps an explicit null when a persisted link is removed", () => {
    const original = mapTabletopScene(
      {
        id: "scene",
        campaign_id: "campaign",
        name: "Porto",
        background_asset_id: null,
        width: 2400,
        height: 1600,
        grid_type: "square",
        grid_size: 64,
        grid_offset_x: 0,
        grid_offset_y: 0,
        grid_scale: 1,
        snap_enabled: true,
        global_illumination: 1,
        status: "active",
        order_index: 0,
        version: 2,
        created_at: "a",
        updated_at: "b",
      },
      [
        {
          id: "tokens",
          scene_id: "scene",
          name: "Tokens",
          layer_type: "tokens",
          order_index: 2,
          visible: true,
          locked: false,
          version: 1,
        },
      ],
      [
        {
          id: "token",
          scene_id: "scene",
          layer_id: "tokens",
          entity_type: "token",
          name: "Myrova",
          linked_sheet_id: "sheet",
          linked_knowledge_node_id: "page",
          asset_id: null,
          x: 0,
          y: 0,
          width: 64,
          height: 64,
          rotation: 0,
          elevation: 0,
          z_index: 1,
          hidden: false,
          locked: false,
          owner_user_id: null,
          properties: {},
          version: 4,
        },
      ],
    );
    const payload = buildTabletopSavePayload(original, {
      ...original,
      entities: [{ ...original.entities[0], linkedSheetId: null }],
    });

    expect(payload.entityDocuments[0]).toMatchObject({
      id: "token",
      linked_sheet_id: null,
      linked_knowledge_node_id: "page",
      version: 4,
    });
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
    const auth = {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: "owner" } } } }),
    };
    const service = new TabletopPersistenceService(
      { from } as never,
      auth as never,
    );
    await expect(
      service.saveScene({
        id: "scene",
        campaignId: "campaign",
        name: "Cena",
        backgroundAssetId: null,
        width: 2400,
        height: 1600,
        gridMode: "square",
        gridSize: 64,
        gridScale: 1,
        gridOffsetX: 0,
        gridOffsetY: 0,
        globalIllumination: 1,
        snap: true,
        status: "active",
        orderIndex: 0,
        version: 1,
        createdAt: "",
        updatedAt: "",
        layers: [],
        entities: [],
      }),
    ).rejects.toEqual(new TabletopServiceError("TABLETOP_CONFLICT"));
  });
});
