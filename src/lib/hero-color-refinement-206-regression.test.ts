import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/hero-color-refinement-206.css", "utf8");
const loader = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");

describe("hero color refinement 206", () => {
  it("loads after the shared hero identity layer", () => {
    expect(loader).toContain('@import "./hero-color-refinement-206.css";');
  });

  it("pins every sibling head to its canonical color", () => {
    for (const rgb of [
      "217 215 164",
      "84 123 148",
      "116 36 45",
      "183 129 77",
      "122 129 135",
      "113 107 123",
    ]) expect(css).toContain(rgb);
  });

  it("makes dashboard richer and tabletop quieter", () => {
    expect(css).toContain(".tadeon-dashboard-hero::after");
    expect(css).toContain("0 0 0 7.2rem");
    expect(css).toContain(".tadeon-tabletop-studio__header::after");
    expect(css).toContain("opacity: .72 !important");
  });

  it("does not alter motion or behavior", () => {
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
