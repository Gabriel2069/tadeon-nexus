import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("final visual contract 217", () => {
  it("uses the exact Wrench symbol for Backup like the menu", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const symbols = read("src/components/section-symbols.tsx");

    expect(bridge).toContain("Wrench,");
    expect(bridge).toContain('icon: Wrench');
    expect(bridge).not.toContain('import { BackupSigil }');
    expect(symbols).toContain('if (section === "tools") return <Wrench');
  });

  it("keeps the Backup mark separated from its text column", () => {
    const css = read("src/styles/hero-structure-final-215.css");

    expect(css).toContain('data-tadeon-page-hero="tools"');
    expect(css).toContain("padding: 1rem 1rem 1rem 5.35rem !important");
    expect(css).toContain("top: 50% !important");
    expect(css).toContain("transform: translateY(-50%) !important");
  });

  it("renders the Tadeon mark in both Mesa focus headers", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const css = read("src/styles/hero-structure-final-215.css");

    expect(bridge).toContain('".tadeon-mobile-header__identity"');
    expect(bridge).toContain('".tadeon-desktop-toolbar"');
    expect(bridge).toContain('key: "tabletop:focus:mobile"');
    expect(bridge).toContain('key: "tabletop:focus:desktop"');
    expect(css).toContain("rgb(84 123 148)");
  });

  it("puts the real MapPinned medallion in the Mesa brand slot without growing the header", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const css = read("src/styles/hero-structure-final-215.css");

    expect(bridge).toContain('key: "tabletop:studio"');
    expect(bridge).toContain("Icon: MapPinned");
    expect(css).toContain(".tadeon-tabletop-brand-mark-host");
    expect(css).toContain("flex: 0 0 2.5rem !important");
    expect(css).toContain("min-height: 0 !important");
  });

  it("centers the three Dashboard signals in equal columns", () => {
    const css = read("src/styles/hero-structure-final-215.css");

    expect(css).toContain(".tadeon-dashboard-signals");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr)) !important");
    expect(css).toContain("justify-content: center !important");
  });

  it("does not add new motion behavior", () => {
    const css = read("src/styles/hero-structure-final-215.css");

    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
