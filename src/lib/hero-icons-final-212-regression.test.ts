import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/hero-icons-final-212.css", "utf8");
const root = readFileSync("src/routes/__root.tsx", "utf8");

describe("hero icon authority 212", () => {
  it("removes the extra Dashboard medallion", () => {
    expect(css).toContain("html body .tadeon-dashboard-hero::before");
    expect(css).toContain("content: none !important");
  });

  it("reuses the Mesa legacy icon slot for MapPinned", () => {
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg:first-child");
    expect(css).toContain("stroke='%23547b94'");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg:first-child > *");
    expect(css).toContain("opacity: 0 !important");
  });

  it("uses the canonical Wrench path for Backup and loads last", () => {
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero::before");
    expect(css).toContain("M14.7 6.3a1 1 0 0 0 0 1.4");
    expect(root).toContain("hero-icons-final-212.css?url");
    expect(root.indexOf("heroMedallionAuthority211Css")).toBeLessThan(
      root.indexOf("heroIconsFinal212Css"),
    );
  });
});
