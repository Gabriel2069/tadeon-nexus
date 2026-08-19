import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/hero-medallion-authority-211.css", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");

describe("hero medallion authority 211", () => {
  it("loads the live authority after the accumulated hero stylesheet", () => {
    expect(root).toContain("hero-medallion-authority-211.css?url");
    expect(root.indexOf("desktopHeroParity202Css")).toBeLessThan(
      root.indexOf("heroMedallionAuthority211Css"),
    );
  });

  it("replaces the Mesa brand mark in its original flex slot", () => {
    expect(css).toContain(".tadeon-tabletop-studio__brand::before");
    expect(css).toContain("flex: 0 0 2.5rem !important");
    expect(css).toContain(".tadeon-tabletop-studio__header::before");
    expect(css).toContain("content: none !important");
  });

  it("restores the original Mesa header footprint", () => {
    expect(css).toContain("padding-top: .75rem !important");
    expect(css).toContain("padding-bottom: .75rem !important");
    expect(css).toContain("padding-left: 0 !important");
    expect(css).toContain("position: absolute !important");
  });

  it("uses a canonical wrench silhouette for Backup and optical centering", () => {
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero::before");
    expect(css).toContain("stroke-width='1.65'");
    expect(css).toContain("background-position: 50% calc(50% + 4px) !important");
  });
});
