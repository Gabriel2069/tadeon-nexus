import { describe, expect, it } from "vitest";
import {
  parseTabletopParticipantView,
  TabletopParticipantError,
} from "./tabletop-participant-service";

const id = (suffix: string) => `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

function validView() {
  return {
    session: {
      id: id("1"),
      name: "Sessão do Eclipse",
      campaignId: id("2"),
      currentSceneId: id("3"),
      version: 4,
      joinLocked: false,
    },
    participant: { role: "player", canInteract: true },
    visibility: {
      version: 1,
      globalIllumination: 0.2,
      fogEnabled: true,
      fogOpacity: 0.92,
      walls: [],
      lights: [],
      fogStrokes: [{
        id: id("6"),
        operation: "reveal",
        points: [{ x: 120, y: 160 }],
        radius: 96,
        sequenceIndex: 0,
      }],
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
          controllable: true,
          properties: { status: "alerta" },
        },
      ],
    },
  };
}

describe("projeção segura da Mesa para participantes", () => {
  it("aceita apenas o contrato público mínimo", () => {
    const parsed = parseTabletopParticipantView(validView());
    expect(parsed.scene?.entities[0].controllable).toBe(true);
  });

  it("rejeita geometria privada de paredes", () => {
    const input = validView();
    input.visibility.walls = [{
      id: id("7"),
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    }] as never[];
    expect(() => parseTabletopParticipantView(input)).toThrow(TabletopParticipantError);
  });

  it("rejeita camada do mestre", () => {
    const input = validView();
    input.scene.layers[0].layerType = "master" as "tokens";
    expect(() => parseTabletopParticipantView(input)).toThrow(TabletopParticipantError);
  });

  it("rejeita entidade oculta e campos privados extras", () => {
    const input = validView();
    Object.assign(input.scene.entities[0], {
      hidden: true,
      ownerUserId: id("9"),
      linkedKnowledgeNodeId: id("10"),
    });
    expect(() => parseTabletopParticipantView(input)).toThrow(TabletopParticipantError);
  });
});
