import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");

describe("hero corrections 209", () => {
  it("moves encoded hero glyph paint down without moving the ring", () => {
    expect(css).toContain("background-position: 50% calc(50% + 4px) !important");
  });

  it("pins the Nexus medallion and glyph to the canonical green", () => {
    expect(css).toContain("color: rgb(79 110 93) !important");
    expect(css).toContain("stroke: currentColor !important");
    expect(css).toContain("transform: translateY(2.5px) !important");
  });

  it("restores the original Mesa row footprint while preserving the replacement icon slot", () => {
    expect(css).toContain("padding-top: .75rem !important");
    expect(css).toContain("padding-bottom: .75rem !important");
    expect(css).toContain("gap: .625rem !important");
    expect(css).toContain("flex: 0 0 2.5rem !important");
    expect(css).toContain("background-size: 1.15rem 1.15rem !important");
  });
});
