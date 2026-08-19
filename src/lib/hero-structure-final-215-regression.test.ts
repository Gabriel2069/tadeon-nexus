import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("hero structure final 215", () => {
  it("uses real React symbols for Backup and both Mesa identities", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    expect(bridge).toContain("BackupSigil");
    expect(bridge).toContain("Icon: MapPinned");
    expect(bridge).toContain("Icon: BrandMark");
    expect(bridge).toContain("tadeon-tabletop-brand-mark-host");
    expect(bridge).toContain("tadeon-tabletop-focus-brand-host");
    expect(bridge).toContain('import "@/styles/hero-structure-final-215.css";');
    expect(bridge).not.toContain("hero-layout-fix-214.css");
  });

  it("defines the same Backup sigil geometry used by navigation", () => {
    const symbols = read("src/components/section-symbols.tsx");
    expect(symbols).toContain("export function BackupSigil");
    expect(symbols).toContain("M21 8a2 2 0 0 0-2-2h-2V4");
    expect(symbols).toContain('section === "tools"');
    expect(symbols).toContain("<BackupSigil");
  });

  it("keeps the Backup text clear of the medallion", () => {
    const css = read("src/styles/hero-structure-final-215.css");
    expect(css).toContain('data-tadeon-page-hero="tools"');
    expect(css).toContain("padding: 1rem 1rem 1rem 5.35rem !important");
    expect(css).toContain("top: 50% !important");
    expect(css).toContain("transform: translateY(-50%) !important");
  });

  it("shows a real blue Tadeon mark in Area em foco and a real MapPinned by Mesa Nexus", () => {
    const css = read("src/styles/hero-structure-final-215.css");
    expect(css).toContain(".tadeon-tabletop-focus-brand-host");
    expect(css).toContain(".tadeon-tabletop-focus-brand-icon");
    expect(css).toContain(".tadeon-tabletop-brand-mark-host");
    expect(css).toContain(".tadeon-tabletop-brand-mark-icon");
    expect(css).toContain("rgb(84 123 148)");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg");
  });

  it("centers all three dashboard signal groups inside equal thirds", () => {
    const css = read("src/styles/hero-structure-final-215.css");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr)) !important");
    expect(css).toContain("grid-template-columns: auto minmax(0, auto) !important");
    expect(css).toContain("justify-content: center !important");
  });
});
