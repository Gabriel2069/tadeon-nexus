import { describe, expect, it } from "vitest";
import { calcTotalPM, getRankBase, upgradeCostAt, type RankRow } from "./sheet-types";

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

  it("calcula os PM totais com o bônus progressivo", () => {
    expect(calcTotalPM(0, rankTable)).toBe(0);
    expect(calcTotalPM(5, rankTable)).toBe(5);
    expect(calcTotalPM(10, rankTable)).toBe(10);
  });

  it("aplica níveis gratuitos antes do incremento de custo", () => {
    const rule = { base: 10, freeLevels: 3, increment: 5 };
    expect(upgradeCostAt(rule, 0)).toBe(10);
    expect(upgradeCostAt(rule, 2)).toBe(10);
    expect(upgradeCostAt(rule, 3)).toBe(15);
    expect(upgradeCostAt(rule, 4)).toBe(20);
  });
});
