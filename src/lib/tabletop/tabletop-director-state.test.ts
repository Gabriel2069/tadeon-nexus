import { describe, expect, it } from "vitest";
import {
  DEFAULT_TABLETOP_DIRECTOR_STATE,
  parseTabletopDirectorState,
  tabletopDirectorStateSchema,
} from "./tabletop-director-state";

describe("estado da Câmera do Diretor", () => {
  it("aceita somente o contrato compacto e limitado", () => {
    expect(
      tabletopDirectorStateSchema.parse({
        mode: "scene",
        title: "Confronto no Lobo Alvor",
        subtitle: "A tempestade se aproxima",
        showGrid: false,
        showHud: true,
        camera: {
          mode: "manual",
          x: 720,
          y: 480,
          zoom: 1.25,
          projection: "isometric",
          levelId: "00000000-0000-4000-8000-000000000001",
        },
      }).camera,
    ).toMatchObject({ mode: "manual", zoom: 1.25 });
  });

  it("recusa campos ocultos e volta ao padrão para estado inválido", () => {
    expect(
      tabletopDirectorStateSchema.safeParse({
        ...DEFAULT_TABLETOP_DIRECTOR_STATE,
        secret: "não pertence ao contrato",
      }).success,
    ).toBe(false);
    expect(parseTabletopDirectorState({ mode: "invalid" })).toEqual(
      DEFAULT_TABLETOP_DIRECTOR_STATE,
    );
  });
});
