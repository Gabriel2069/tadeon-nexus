import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("resíduos visuais de seleção e navegação", () => {

  // NEX-024: collapsed rail geometry is exercised in verify-dashboard-design.mjs.


  it("mantém o brilho diagonal dentro da caixa física do botão", () => {
    const css = source("src/styles/viewport-fit-final.css");

    expect(css).toContain("@keyframes tadeon-button-sheen");
    expect(css).toContain("top: 1px !important");
    expect(css).toContain("right: 1px !important");
    expect(css).toContain("bottom: 1px !important");
    expect(css).toContain("left: 1px !important");
    expect(css).toContain("background-size: 240% 100% !important");
    expect(css).toContain(
      "animation: tadeon-button-sheen 620ms var(--ease-out) both !important",
    );
  });
});
