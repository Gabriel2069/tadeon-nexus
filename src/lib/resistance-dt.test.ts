import { describe, expect, it } from "vitest";
import { calculateResistanceDt } from "@/lib/resistance-dt";

describe("calculateResistanceDt", () => {
  it("uses the final rulebook formula", () => {
    expect(
      calculateResistanceDt({
        attribute: 3,
        grade: "apurado",
        intensity: "tracao",
      }),
    ).toBe(19);
  });

  it("applies all grade and intensity boundaries", () => {
    expect(
      calculateResistanceDt({
        attribute: 0,
        grade: "destreinado",
        intensity: "repuxo",
      }),
    ).toBe(10);
    expect(
      calculateResistanceDt({
        attribute: 5,
        grade: "versado",
        intensity: "estiramento",
      }),
    ).toBe(25);
  });

  it("clamps accidental extreme values", () => {
    expect(
      calculateResistanceDt({
        attribute: 99,
        grade: "versado",
        intensity: "estiramento",
        modifier: 99,
      }),
    ).toBe(40);
  });
});
