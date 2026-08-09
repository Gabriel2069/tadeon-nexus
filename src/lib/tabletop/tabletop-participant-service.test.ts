import { describe, expect, it } from "vitest";
import {
  parseTabletopParticipantView,
  TabletopParticipantError,
} from "./tabletop-participant-service";

const id = (suffix: string) =>
  `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

function validView() {
  return {
    session: {
      id: id("1"),
      name: "Sessão do Eclipse",
      campaignId: id("2"),
      currentSceneId: id("3"),
      version: 4,
      joinLocked: false,
      directorState: {
        mode: "scene",
        title: "",
        subtitle: "",
        showGrid: true,
        showHud: false,
        camera: {
          mode: "fit",
          x: 0,
          y: 0,
          zoom: 1,
          projection: "plan",
          levelId: null,
        },
      },
    },
    participant: { role: "player", canInteract: true },
    visibility: {
      version: 1,
      globalIllumination: 0.2,
      fogEnabled: true,
      fogOpacity: 0.92,
      walls: [],
      lights: [],
      fogStrokes: [
        {
          id: id("6"),
          levelId: id("13"),
          operation: "reveal",
          points: [{ x: 120, y: 160 }],
          radius: 96,
          sequenceIndex: 0,
        },
      ],
    },
    scene: {
      id: id("3"),
      name: "Ruínas",
      width: 2400,
      height: 1600,
      gridMode: "square",
      gridSize: 64,
      gridScale: 1,
      snap: true,
      activeLevelId: id("13"),
      levels: [
        {
          id: id("13"),
          name: "Térreo",
          order: 0,
          baseElevation: 0,
          height: 192,
          visible: true,
          locked: false,
          version: 1,
        },
      ],
      layers: [
        {
          id: id("4"),
          name: "Tokens",
          order: 2,
          visible: true,
          locked: false,
          layerType: "tokens",
        },
      ],
      entities: [
        {
          id: id("5"),
          layerId: id("4"),
          type: "character",
          label: "Vigia",
          x: 64,
          y: 128,
          width: 64,
          height: 64,
          rotation: 0,
          zIndex: 1,
          hidden: false,
          locked: false,
          color: 0x8d3152,
          levelId: id("13"),
          controllable: true,
          properties: { status: "alerta" },
          sheetSummary: {
            sheetId: id("14"),
            name: "Vigia de Myrova",
            occupation: "Batedor",
            brand: "Lobo Alvor",
            origin: "Myrova",
            exposure: 3,
            equilibrium: 8,
            condition: "Vigilante",
            resources: { pv: 18, pe: 7, ps: 9, pa: 2 },
            activeConditions: ["Marcado"],
          },
          handout: {
            nodeId: id("8"),
            title: "Carta selada",
            summary: "Documento compartilhado para esta sessão.",
            nodeType: "document",
            attachments: [
              {
                assetId: id("11"),
                name: "Carta selada.pdf",
                mimeType: "application/pdf",
                sizeBytes: 2048,
                role: "attachment",
                caption: "Documento encontrado nas ruínas.",
                url: "https://example.supabase.co/carta.pdf?token=temporario",
              },
              {
                assetId: id("12"),
                name: "Selo.webp",
                mimeType: "image/webp",
                sizeBytes: 1024,
                role: "illustration",
                caption: "",
                url: "https://example.supabase.co/selo.webp?token=temporario",
              },
            ],
          },
        },
      ],
    },
  };
}

describe("projeção segura da Mesa para participantes", () => {
  it("aceita apenas o contrato público mínimo", () => {
    const parsed = parseTabletopParticipantView(validView());
    expect(parsed.scene?.entities[0].controllable).toBe(true);
    expect(parsed.scene?.entities[0].handout?.title).toBe("Carta selada");
    expect(parsed.scene?.entities[0].handout?.attachments).toHaveLength(2);
    expect(parsed.scene?.entities[0].handout?.attachments[0].mimeType).toBe(
      "application/pdf",
    );
    expect(parsed.scene?.entities[0].sheetSummary).toMatchObject({
      name: "Vigia de Myrova",
      resources: { pv: 18, pe: 7, ps: 9, pa: 2 },
    });
  });

  it("rejeita anexos além do limite seguro", () => {
    const input = validView();
    const attachment = input.scene.entities[0].handout.attachments[0];
    input.scene.entities[0].handout.attachments = Array.from(
      { length: 17 },
      (_, index) => ({
        ...attachment,
        assetId: id(String(100 + index)),
      }),
    );
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });

  it("rejeita conteúdo integral indevido no handout", () => {
    const input = validView();
    Object.assign(input.scene.entities[0].handout, {
      contentMarkdown: "conteúdo que não pertence ao contrato resumido",
    });
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });

  it("rejeita JSON bruto e identidade privada no resumo da ficha", () => {
    const input = validView();
    Object.assign(input.scene.entities[0].sheetSummary, {
      stats: { pv_current: 18, segredo: 99 },
      conditions: { segredo: true },
      ownerId: id("15"),
    });
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });

  it("rejeita geometria privada de paredes", () => {
    const input = validView();
    input.visibility.walls = [
      {
        id: id("7"),
        x1: 0,
        y1: 0,
        x2: 10,
        y2: 10,
      },
    ] as never[];
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });

  it("aceita somente uma porta explicitamente acionável pelo jogador", () => {
    const input = validView();
    input.visibility.walls = [
      {
        id: id("7"),
        levelId: id("13"),
        x1: 0,
        y1: 0,
        x2: 64,
        y2: 0,
        wallType: "door_closed",
        blocksVision: true,
        blocksMovement: true,
        baseElevation: 0,
        height: 160,
        thickness: 8,
        playerOperable: true,
        version: 3,
      },
    ] as never[];
    const parsed = parseTabletopParticipantView(input);
    expect(parsed.visibility?.walls[0]).toMatchObject({
      wallType: "door_closed",
      playerOperable: true,
      version: 3,
    });
  });

  it("rejeita camada do mestre", () => {
    const input = validView();
    input.scene.layers[0].layerType = "master" as "tokens";
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });

  it("rejeita entidade oculta e campos privados extras", () => {
    const input = validView();
    Object.assign(input.scene.entities[0], {
      hidden: true,
      ownerUserId: id("9"),
      linkedKnowledgeNodeId: id("10"),
    });
    expect(() => parseTabletopParticipantView(input)).toThrow(
      TabletopParticipantError,
    );
  });
});
