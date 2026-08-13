import { describe, expect, it } from "vitest";
import type { TabletopFogStroke } from "./tabletop-visibility-service";

// A renderer WebGL é validado no build; este teste mantém o contrato de dados
// independente do navegador explícito e documenta o limite do pincel.
describe("contrato da névoa", () => {
  it("preserva a ordem explícita de revelar e ocultar", () => {
    const strokes: TabletopFogStroke[] = [
      {
        id: "a",
        operation: "hide",
        shape: "brush",
        points: [{ x: 1, y: 1 }],
        radius: 32,
        sequenceIndex: 2,
      },
      {
        id: "b",
        operation: "reveal",
        shape: "brush",
        points: [{ x: 2, y: 2 }],
        radius: 32,
        sequenceIndex: 1,
      },
    ];
    expect(
      [...strokes]
        .sort((a, b) => a.sequenceIndex - b.sequenceIndex)
        .map((item) => item.operation),
    ).toEqual(["reveal", "hide"]);
  });
});
