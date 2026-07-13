import { describe, expect, it } from "vitest";
import {
  calcTotalPM,
  calculatePMSpent,
  calculateSheetMaximums,
  DEFAULT_TRAINING_COSTS,
  DEFAULT_UPGRADE_COSTS,
  getRankBase,
  SKILL_GROUPS,
  upgradeCostAt,
  type RankRow,
} from "./sheet-types";

const rankTable: RankRow[] = [
  { rank: 0, pv: 10, ps: 10, pe: 5, pa: 0, def: 10, pm: 0 },
  { rank: 5, pv: 15, ps: 15, pe: 8, pa: 1, def: 11, pm: 3 },
  { rank: 10, pv: 20, ps: 20, pe: 11, pa: 2, def: 12, pm: 6 },
];

describe("progressão da ficha", () => {
  it("usa a faixa de rank mais próxima sem ultrapassar a exposição", () => {
    expect(getRankBase(9, rankTable).rank).toBe(5);
    expect(getRankBase(10, rankTable).rank).toBe(10);
  });

  it("usa exatamente o orçamento de PM definido pela tabela de Rank", () => {
    expect(calcTotalPM(0, rankTable)).toBe(0);
    expect(calcTotalPM(5, rankTable)).toBe(3);
    expect(calcTotalPM(10, rankTable)).toBe(6);
  });

  it("aplica níveis gratuitos antes do incremento de custo", () => {
    const rule = { base: 10, freeLevels: 3, increment: 5 };
    expect(upgradeCostAt(rule, 0)).toBe(10);
    expect(upgradeCostAt(rule, 2)).toBe(10);
    expect(upgradeCostAt(rule, 3)).toBe(15);
    expect(upgradeCostAt(rule, 4)).toBe(20);
  });

  it("calcula PV, PS, PE, PA e DEF pelas fórmulas canônicas", () => {
    expect(
      calculateSheetMaximums({
        attributes: { COR: 2, MEN: 3, INS: 4, PRE: 2, ERU: 3 },
        stats: {
          pv_current: 0,
          pv_mod: 1,
          ps_current: 0,
          ps_mod: 2,
          pe_current: 0,
          pe_mod: 3,
          pa_current: 0,
          pa_mod: 4,
          def_equip: 0,
          def_mod: 5,
          pm_current: 0,
          pm_mod: 0,
        },
        upgrades: { pv: 1, ps: 1, pe: 1, def: 1 },
        rank: rankTable[1],
        armor: 2,
      }),
    ).toEqual({ pv: 25, ps: 28, pe: 16, pa: 8, def: 23 });
  });

  it("deriva os PM gastos de aprimoramentos, treinos e habilidades", () => {
    expect(
      calculatePMSpent({
        statUpgrades: { pv: 2, ps: 0, pe: 0, def: 1 },
        skills: { Atletismo: 10 },
        purchasedSkills: ["teste"],
        branches: [
          {
            id: "ramo",
            label: "Ramo",
            color: "#fff",
            nodes: [
              {
                id: "teste",
                name: "Teste",
                desc: "",
                cost: 2,
                minRank: 0,
                requires: [],
                attrReqs: [],
              },
            ],
          },
        ],
        upgradeCosts: DEFAULT_UPGRADE_COSTS,
        trainingCosts: DEFAULT_TRAINING_COSTS,
      }),
    ).toBe(10);
  });

  it("mantém as 30 perícias canônicas sem duplicatas", () => {
    const skills = SKILL_GROUPS.flatMap((group) => group.skills);
    expect(skills).toHaveLength(30);
    expect(new Set(skills)).toHaveLength(30);
  });
});
