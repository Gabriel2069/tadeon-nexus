import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("src/lib/tabletop/entity-renderer.ts", "utf8");
const workspace = readFileSync(
  "src/components/tabletop/tabletop-workspace.tsx",
  "utf8",
);
const css = readFileSync("src/styles/tabletop-editor.css", "utf8");

describe("token image and base color parity", () => {
  it("does not repaint the legacy colored 2D plate behind an image", () => {
    expect(renderer).toContain(
      "shape.visible = !entity.assetUrl && !fallbackStandee",
    );
    expect(renderer).toContain(
      "outline.visible = !fallbackStandee && (!entity.assetUrl || selected)",
    );
  });

  it("offers quick swatches and a free color picker in the primary inspector", () => {
    expect(workspace).toContain("TOKEN_BASE_COLORS");
    expect(workspace).toContain("Cor-base do token");
    expect(workspace).toContain('type="color"');
    expect(workspace).toContain('"Alterar cor-base do token"');
    expect(css).toContain(".tadeon-tabletop-token-color__swatches");
    expect(css).toContain('[aria-pressed="true"]');
  });
});
