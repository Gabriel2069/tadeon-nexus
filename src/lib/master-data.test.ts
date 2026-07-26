import { describe, expect, it } from "vitest";
import {
  calculateEncounterBalance,
  createEmptyThreat,
  getThreatBase,
  threatStats,
} from "./master-data";

describe("ferramentas do mestre", () => {
  it("usa os valores canônicos de Magnitude", () => {
    expect(getThreatBase(1)).toEqual({ magnitude: 1, pp: 15, def: 15, reactions: 0, cp: 8 });
    expect(getThreatBase(20)).toEqual({
      magnitude: 20,
      pp: 263,
      def: 23,
      reactions: 4,
      cp: 158,
    });
  });

  it("calcula o orçamento de construção da ameaça", () => {
    const threat = {
      ...createEmptyThreat(),
      magnitude: 5,
      ppPurchases: 2,
      defPurchases: 1,
      rdPurchases: 1,
      reactionPurchases: 1,
      movementPurchases: 1,
    };
    expect(threatStats(threat)).toMatchObject({
      pp: 50,
      def: 18,
      rd: 1,
      reactions: 2,
      movement: 9,
      cp: 18,
      spent: 15,
    });
  });

  it("classifica um encontro sem executar rolagens", () => {
    expect(calculateEncounterBalance(25, 4, 6).reading).toBe("Equilibrado");
    expect(calculateEncounterBalance(25, 4, 8).reading).toBe("Extremo");
  });
});
