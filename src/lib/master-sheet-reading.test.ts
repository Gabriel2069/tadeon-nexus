import { expect, it } from "vitest";
import { campaignSheetReading } from "./master-sheet-reading";
it("campaign and session cards read PI and development without exposing historical PS/PA as current rules", () => {
  const sheet = {
    rules_version: 2,
    exposure: 15,
    stats: { pv_current: 10, pi_current: 8, pe_current: 4, ps_current: 99, pa_current: 88 },
  };
  expect(campaignSheetReading(sheet)).toEqual({
    progress: "Desenvolvimento 15%",
    resources: [
      ["PV", 10],
      ["PI", 8],
      ["PE", 4],
    ],
  });
  expect(campaignSheetReading({ ...sheet, rules_version: 1 })).toEqual({
    progress: "Edição anterior · Exposição 15",
    resources: [
      ["PV", 10],
      ["PS", 99],
      ["PE", 4],
      ["PA", 88],
    ],
  });
});
