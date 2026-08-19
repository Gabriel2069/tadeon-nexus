import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const css = read("src/styles/hero-icons-final-212.css");
const root = read("src/routes/__root.tsx");

describe("hero icon authority 212", () => {
  it("keeps the shared Hero mark in normal grid flow", () => {
    expect(css).toContain("grid-template-columns: 3rem minmax(0, 1fr) auto !important");
    expect(css).toContain("grid-column: 1 !important");
    expect(css).toContain("align-self: center !important");
    expect(css).toContain("justify-self: center !important");
    expect(css).toContain("translate: none !important");
    expect(css).not.toContain("top: 50% !important");
    expect(css).not.toContain("transform: translateY(-50%) !important");
  });

  it("uses the exact BackupSigil source used by the authored navigation mask", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const symbols = read("src/components/section-symbols.tsx");
    expect(bridge).toContain("icon: BackupSigil");
    expect(symbols).toContain("M21 8a2 2 0 0 0-2-2h-2V4");
    expect(symbols).toContain("M9 6h6M8 12h8M8 16h5");
  });

  it("restores both Mesa identities with real React symbols", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    expect(bridge).toContain('key: "tabletop:studio"');
    expect(bridge).toContain("Icon: MapPinned");
    expect(bridge).toContain('key: "tabletop:focus:mobile"');
    expect(bridge).toContain('key: "tabletop:focus:desktop"');
    expect(bridge).toContain("Icon: BrandMark");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg");
    expect(css).not.toContain(".tadeon-tabletop-studio__brand > svg:first-child");
    expect(css).toContain(".tadeon-tabletop-focus-brand-host");
    expect(css).toContain("rgb(84 123 148)");
  });

  it("keeps the Mesa decorative ThreadField out of layout flow", () => {
    expect(css).toContain(
      ".tadeon-tabletop-studio__header > svg.pointer-events-none.absolute.inset-0",
    );
    expect(css).toContain("position: absolute !important");
    expect(css).toContain("padding-top: .75rem !important");
    expect(css).toContain("padding-bottom: .75rem !important");
  });

  it("centers the three Dashboard signals in equal cells", () => {
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr)) !important");
    expect(css).toContain(".tadeon-dashboard-signal");
    expect(css).toContain("justify-content: center !important");
  });

  it("remains the final loaded Hero authority", () => {
    expect(root).toContain("hero-icons-final-212.css?url");
    expect(root.indexOf("desktopHeroParity202Css")).toBeLessThan(
      root.indexOf("heroIconsFinal212Css"),
    );
  });
});
