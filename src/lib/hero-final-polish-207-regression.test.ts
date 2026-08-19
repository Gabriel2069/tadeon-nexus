import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/hero-final-polish-207.css", "utf8");
const loader = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");

describe("hero final polish 207", () => {
  it("loads after the previous hero color authority", () => {
    expect(loader).toContain('@import "./hero-final-polish-207.css";');
  });

  it("optically centers the six non-Nexus medallion glyphs", () => {
    expect(css).toContain("background-position: 50% calc(50% + 1px) !important");
  });

  it("restores the authored Tadeon mark in the Dashboard continuity row", () => {
    expect(css).toContain(".tadeon-dashboard-hero .mb-5.flex > svg:first-child");
    expect(css).toContain("visibility: visible !important");
  });

  it("keeps Dashboard richer while compacting the Nexus content footprint", () => {
    expect(css).toContain("0 0 0 9.4rem");
    expect(css).toContain(".tadeon-route-nexus .tadeon-nexus-commandbar");
    expect(css).toContain("padding: .8rem 1rem !important");
    expect(css).toContain("width: 2.8rem !important");
  });

  it("does not introduce new motion or behavior", () => {
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
