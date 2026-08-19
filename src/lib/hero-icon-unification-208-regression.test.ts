import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");
const finalCss = readFileSync("src/styles/hero-final-polish-207.css", "utf8");

describe("hero icon unification 208", () => {
  it("keeps the encoded hero glyph contract available", () => {
    expect(css).toContain("background-position: 50% calc(50% + 2.5px) !important");
  });

  it("restores the Dashboard Tadeon BrandMark and removes the legacy Mesa mark footprint", () => {
    expect(css).toContain(".tadeon-dashboard-hero .mb-5.flex > svg:first-child");
    expect(css).toContain("display: block !important");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg:first-child");
  });

  it("keeps the real Nexus LibraryBig glyph in the circular medallion language", () => {
    expect(css).toContain(".tadeon-route-nexus .tadeon-nexus-identity__mark > svg");
    expect(css).toContain("place-items: center !important");
  });
});

describe("hero root-cause repair 210", () => {
  it("keeps the Mesa ThreadField absolutely positioned so it cannot inflate the header", () => {
    expect(finalCss).toContain(
      ".tadeon-tabletop-studio__header > svg.pointer-events-none.absolute.inset-0",
    );
    expect(finalCss).toContain("position: absolute !important");
    expect(finalCss).toContain("height: 100% !important");
  });

  it("centers the hero medallions themselves rather than shifting only their glyph paint", () => {
    expect(finalCss).toContain("html body .tadeon-dashboard-hero::before");
    expect(finalCss).toContain("top: 50% !important");
    expect(finalCss).toContain("translate: 0 -50% !important");
    expect(finalCss).toContain("background-position: center !important");
  });

  it("forces the Nexus identity glyph to the canonical green", () => {
    expect(finalCss).toContain("color: rgb(79 110 93) !important");
    expect(finalCss).toContain("stroke: rgb(79 110 93) !important");
    expect(finalCss).toContain("transform: none !important");
  });

  it("restores the Mesa's original spacing contract while preserving the replacement icon slot", () => {
    expect(finalCss).toContain("padding-top: .75rem !important");
    expect(finalCss).toContain("padding-bottom: .75rem !important");
    expect(finalCss).toContain("gap: .625rem !important");
    expect(finalCss).toContain("flex: 0 0 2.5rem !important");
  });
});
