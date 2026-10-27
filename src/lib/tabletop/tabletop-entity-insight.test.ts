import { newTdvCharacter } from "@/lib/tdv2";
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

describe("TdV II authorized summaries", () => {
  it("exposes current resources and development without narrative secrets or legacy points", () => {
    const c = newTdvCharacter();
    c.face.occupation = "Registradora";
    c.face.origin = "Cais";
    c.notes = "SEGREDO PRIVADO";
    c.face.links[0].demand = "DÍVIDA PRIVADA";
    const summary = normalizeTabletopSheetSummary({
      id: "00000000-0000-4000-8000-000000000001",
      name: "Iria",
      rules_version: 2,
      tdv2_data: c,
      stats: { ps_current: 99, pa_current: 88 },
    });
    expect(summary).toMatchObject({
      rulesVersion: 2,
      resources: { pv: 10, pi: 11, pe: 10 },
      guard: 12,
      exposure: 0,
      occupation: "Registradora",
    });
    expect(summary.resources).not.toHaveProperty("ps");
    expect(summary.resources).not.toHaveProperty("pa");
    expect(JSON.stringify(summary)).not.toContain("PRIVAD");
  });
});
