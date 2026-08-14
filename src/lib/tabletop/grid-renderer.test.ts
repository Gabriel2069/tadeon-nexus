import { describe, expect, it } from "vitest";
import { snapPointToGrid } from "./grid-renderer";

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("snapPointToGrid", () => {
  it("mantém grade desligada sem alterar o ponto", () => {
    expect(snapPointToGrid({ x: 37, y: 91 }, "none", 64)).toEqual({ x: 37, y: 91 });
  });

  it("encaixa grade quadrada", () => {
    expect(snapPointToGrid({ x: 70, y: 120 }, "square", 64)).toEqual({ x: 64, y: 128 });
  });

  it.each(["hex_pointy", "hex_flat", "isometric"] as const)(
    "produz ponto finito e estável para %s",
    (mode) => {
      const first = snapPointToGrid({ x: 173, y: 241 }, mode, 64);
      const second = snapPointToGrid(first, mode, 64);
      expect(Number.isFinite(first.x)).toBe(true);
      expect(Number.isFinite(first.y)).toBe(true);
      expect(distance(first, second)).toBeLessThan(0.001);
    },
  );
});
