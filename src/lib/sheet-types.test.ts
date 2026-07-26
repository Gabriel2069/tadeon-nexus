import { describe, expect, it } from "vitest";
import {
  attributePointBudget,
  attributeValueCap,
  calcTotalPM,
  calculatePMSpent,
  calculateSheetMaximums,
  CANONICAL_RANK_TABLE,
  DEFAULT_TRAINING_COSTS,
  DEFAULT_UPGRADE_COSTS,
  getRankBase,
  normalizeConditions,
  skillNodeRequirementFailure,
  SKILL_GROUPS,
  totalTrainingSpend,
  upgradeCostAt,
  weaponProficiencySpend,
  type RankRow,
  type SkillNode,
} from "./sheet-types";
import { FINAL_SKILL_BRANCHES } from "./final-skill-branches";

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

  it("mantém o marco final de Rank 100 da versão definitiva", () => {
    expect(CANONICAL_RANK_TABLE.at(-1)).toEqual({
      rank: 100,
      pv: 45,
      ps: 33,
      pe: 15,
      pa: 5,
      def: 14,
      pm: 170,
    });
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
    ).toBe(16);
  });

  it("mantém as 30 perícias canônicas sem duplicatas", () => {
    const skills = SKILL_GROUPS.flatMap((group) => group.skills);
    expect(skills).toHaveLength(30);
    expect(new Set(skills)).toHaveLength(30);
  });

  it("limita o orçamento e o teto de Atributos pelos quatro marcos", () => {
    expect(attributePointBudget(0)).toBe(9);
    expect(attributePointBudget(25)).toBe(10);
    expect(attributePointBudget(100)).toBe(13);
    expect(attributeValueCap(0)).toBe(3);
    expect(attributeValueCap(25)).toBe(4);
    expect(attributeValueCap(50)).toBe(5);
  });

  it("preserva exatamente os sete graus gratuitos escolhidos na criação", () => {
    expect(
      totalTrainingSpend({ Atletismo: 6, Luta: 3, Percepção: 9 }, DEFAULT_TRAINING_COSTS, {
        Atletismo: 2,
        Percepção: 2,
      }),
    ).toBe(4);
  });

  it("cobra Proficiência III e IV cumulativamente", () => {
    expect(weaponProficiencySpend("operador")).toBe(0);
    expect(weaponProficiencySpend("combatente")).toBe(2);
    expect(weaponProficiencySpend("armígero")).toBe(5);
  });

  it("valida requisitos de Atributo alternativo, Perícia e Equilíbrio", () => {
    const node: SkillNode = {
      id: "teste",
      name: "Teste",
      desc: "",
      cost: 4,
      minRank: 75,
      requires: [],
      attrReqs: [],
      requirementsText: "MEN 2 ou ERU 2, Percepção Iniciada, Equilíbrio +5 ou maior",
    };
    const context = {
      attributes: { COR: 1, MEN: 1, INS: 1, PRE: 1, ERU: 2 },
      skills: { Percepção: 0 },
      equilibrium: 5,
      weaponProficiency: "operador" as const,
      purchasedSkills: [],
      branches: [{ id: "ramo", label: "Ramo", color: "#fff", nodes: [node] }],
    };
    expect(skillNodeRequirementFailure(node, context)).toBe("Requer Percepção Iniciada");
    expect(
      skillNodeRequirementFailure(node, {
        ...context,
        skills: { Percepção: 3 },
        equilibrium: 4,
      }),
    ).toBe("Requer Equilíbrio +5 ou maior");
    expect(
      skillNodeRequirementFailure(node, {
        ...context,
        skills: { Percepção: 3 },
      }),
    ).toBeNull();
  });

  it("normaliza condições antigas e preserva condições simultâneas", () => {
    expect(
      normalizeConditions({
        fisica: ["Ferido", "Sangrando", "Ferido"],
        mental: "Normal",
        energetica: "Fadigado",
      }),
    ).toEqual({
      fisica: ["Ferido", "Sangrando"],
      mental: [],
      energetica: ["Fadigado"],
      outras: [],
    });
  });

  it("aceita as 96 habilidades canônicas quando todos os requisitos são atendidos", () => {
    const purchasedSkills = FINAL_SKILL_BRANCHES.flatMap((branch) =>
      branch.nodes.map((node) => node.id),
    );
    const skills = Object.fromEntries(
      SKILL_GROUPS.flatMap((group) => group.skills).map((skill) => [skill, 9]),
    );

    for (const node of FINAL_SKILL_BRANCHES.flatMap((branch) => branch.nodes)) {
      const requirements = node.requirementsText ?? "";
      const equilibrium = requirements.includes("ou menor")
        ? -10
        : requirements.includes("ou maior")
          ? 10
          : 0;
      expect(
        skillNodeRequirementFailure(node, {
          attributes: { COR: 5, MEN: 5, INS: 5, PRE: 5, ERU: 5 },
          skills,
          equilibrium,
          weaponProficiency: "armígero",
          purchasedSkills,
          branches: FINAL_SKILL_BRANCHES,
        }),
        node.name,
      ).toBeNull();
    }
  });
});
