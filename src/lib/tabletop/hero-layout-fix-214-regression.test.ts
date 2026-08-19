import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("hero layout fix 214", () => {
  it("loads the final visual contract from the mounted hero bridge", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    expect(bridge).toContain('import "@/styles/hero-layout-fix-214.css";');
  });

  it("uses the rendered Backup navigation sigil and reserves the text column", () => {
    const css = read("src/styles/hero-layout-fix-214.css");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(css).toContain("padding: 1rem 1rem 1rem 5.35rem !important");
    expect(css).toContain("M21 8a2 2 0 0 0-2-2h-2V4");
    expect(css).toContain(".tadeon-page-hero-mark-host::before");
    expect(css).toContain(".tadeon-page-hero-mark-host > svg");
  });

  it("restores the Mesa BrandMark in the mobile focus header and MapPinned by the studio name", () => {
    const css = read("src/styles/hero-layout-fix-214.css");
    expect(css).toContain('[data-section="Mesa Nexus"] .tadeon-mobile-header__identity::before');
    expect(css).toContain("M75 20.5A34 34 0 1 1 38.5 14");
    expect(css).toContain(".tadeon-tabletop-studio__brand::before");
    expect(css).toContain("M18 8c0 3.613-3.869 7.429-5.393 8.795");
    expect(css).toContain(".tadeon-tabletop-brand-mark-host");
  });

  it("centers the three dashboard signals in equal columns", () => {
    const css = read("src/styles/hero-layout-fix-214.css");
    expect(css).toContain(".tadeon-dashboard-signals");
    expect(css).toContain("grid-template-columns: repeat(3, minmax(0, 1fr)) !important");
    expect(css).toContain("justify-content: center !important");
  });

  it("does not add new motion behavior", () => {
    const css = read("src/styles/hero-layout-fix-214.css");
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
