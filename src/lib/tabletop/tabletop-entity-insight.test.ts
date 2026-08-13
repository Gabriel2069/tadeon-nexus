import { describe, expect, it } from "vitest";
import {
  activeTabletopConditionNames,
  normalizeTabletopSheetSummary,
} from "./tabletop-entity-insight";

describe("resumo de ficha da Mesa", () => {
  it("reduz a ficha ao contrato operacional seguro", () => {
    const summary = normalizeTabletopSheetSummary({
      id: "00000000-0000-4000-8000-000000000001",
      name: "  Vigia de Myrova  ",
      occupation: "Batedor",
      brand: "Lobo Alvor",
      origin: "Myrova",
      exposure: 3,
      equilibrium: 8,
      condition: "Vigilante",
      stats: {
        pv_current: 18,
        pe_current: 7,
        ps_current: 9,
        pa_current: 2,
        secret_formula: 999,
      },
      conditions: {
        marcado: true,
        ferido: { active: true, label: "Ferido" },
        oculto: { active: false, label: "Oculto" },
      },
      owner_id: "não deve sair",
    });

    expect(summary).toEqual({
      sheetId: "00000000-0000-4000-8000-000000000001",
      name: "Vigia de Myrova",
      occupation: "Batedor",
      brand: "Lobo Alvor",
      origin: "Myrova",
      exposure: 3,
      equilibrium: 8,
      condition: "Vigilante",
      resources: { pv: 18, pe: 7, ps: 9, pa: 2 },
      activeConditions: ["marcado", "Ferido"],
    });
    expect(summary).not.toHaveProperty("owner_id");
    expect(summary).not.toHaveProperty("stats");
  });

  it("propaga as listas reais de condições da ficha vinculada", () => {
    expect(
      activeTabletopConditionNames({
        fisica: ["Ferido", "Sangrando"],
        mental: ["Normal", "Confuso"],
        energetica: [],
        outras: ["Marcado", "Ferido"],
      }),
    ).toEqual(["Ferido", "Sangrando", "Confuso", "Marcado"]);
  });
});
