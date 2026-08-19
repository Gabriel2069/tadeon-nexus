import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");

describe("hero icon unification 208", () => {
  it("centers encoded hero glyphs without moving their rings", () => {
    expect(css).toContain("background-position: 50% calc(50% + 2.5px) !important");
  });

  it("restores the Dashboard Tadeon BrandMark and removes the legacy Mesa mark footprint", () => {
    expect(css).toContain(".tadeon-dashboard-hero .mb-5.flex > svg:first-child");
    expect(css).toContain("display: block !important");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg:first-child");
    expect(css).toContain("flex: 0 0 0 !important");
  });

  it("compacts the Mesa command header without padding the whole row", () => {
    expect(css).toContain("padding-top: .55rem !important");
    expect(css).toContain("padding-left: 0 !important");
    expect(css).toContain("padding-left: 4.75rem !important");
  });

  it("gives the real Nexus LibraryBig glyph the same circular medallion language", () => {
    expect(css).toContain(".tadeon-route-nexus .tadeon-nexus-identity__mark > svg");
    expect(css).toContain("place-items: center !important");
    expect(css).toContain("transform: translateY(1.5px) !important");
  });
});
