import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("mobile popup + master head 158", () => {
  it("loads the 158 authority after the complete 157 visual system", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain(
      'import mobilePopupMasterHead158Css from "../styles/mobile-popup-master-head-158.css?url"',
    );
    expect(root.lastIndexOf("href: finalVisualSystem157Css")).toBeLessThan(
      root.lastIndexOf("href: mobilePopupMasterHead158Css"),
    );
  });

  it("anchors centered mobile dialogs inside both safe-area edges", () => {
    const css = source("src/styles/mobile-popup-master-head-158.css");
    expect(css).toContain("--tadeon-popup-top: max(.6rem, env(safe-area-inset-top))");
    expect(css).toContain("--tadeon-popup-bottom: max(.6rem, env(safe-area-inset-bottom))");
    expect(css).toContain("top: var(--tadeon-popup-top) !important");
    expect(css).toContain("bottom: var(--tadeon-popup-bottom) !important");
    expect(css).toContain("height: max-content !important");
    expect(css).toContain("min(100dvh, 100svh)");
    expect(css).toContain("transform: translateX(-50%) !important");
    expect(css).toContain("@keyframes tadeon-mobile-popup-safe-in-158");
    expect(css).toContain("--radix-popover-content-available-height");
    expect(css).toContain("--radix-dropdown-menu-content-available-height");
    expect(css).toContain("--radix-select-content-available-height");
  });

  it("uses the same master tab metadata for tabs and the active head symbol", () => {
    const nav = source("src/components/master/master-panel-navigation.tsx");
    expect(nav).toContain("export const MASTER_TAB_META");
    expect(nav).toContain('value: "dashboard", label: "Visão Geral", icon: Activity');
    expect(nav).toContain('value: "scenes", label: "Cenas", icon: Map');
    expect(nav).toContain('value: "initiative", label: "Iniciativa", icon: ListChecks');
    expect(nav).toContain('value: "threats", label: "Ameaças", icon: ShieldAlert');
    expect(nav).toContain('value: "investigation", label: "Investigação", icon: BrainCircuit');
    expect(nav).toContain('value: "data", label: "Dados & Fórmulas", icon: Database');
    expect(nav).toContain("createPortal");
    expect(nav).toContain("tadeon-master-commandbar__glow");
    expect(nav).toContain("data-master-head-tab");
    expect(nav).toContain("observer.observe(slot");
    expect(nav).not.toContain("observer.observe(document.body");
  });

  it("gives the master a permanent sigil and removes the old generic head glyph", () => {
    const symbols = source("src/components/section-symbols.tsx");
    const css = source("src/styles/mobile-popup-master-head-158.css");
    expect(symbols).toContain("export function MasterSigil");
    expect(symbols).toContain('data-section-symbol={section}');
    expect(css).toContain(".tadeon-master-commandbar__master-sigil");
    expect(css).toContain(".tadeon-master-commandbar__active-icon");
    expect(css).toContain(".tadeon-master-commandbar h1 > svg");
    expect(css).toContain('.tadeon-nav-item[href="/master-panel"]');
  });

  it("brings utility heads back to the compact Nexus commandbar cadence", () => {
    const css = source("src/styles/mobile-popup-master-head-158.css");
    expect(css).toContain("min-height: 5.75rem !important");
    expect(css).toContain("padding: 1rem 1.1rem 1rem 5.1rem !important");
    expect(css).toContain("width: 3rem !important");
    expect(css).toContain("height: 3rem !important");
    expect(css).toContain("font-size: clamp(1.55rem, 2.6vw, 2.2rem) !important");
    expect(css).toContain("max-height: none !important");
  });
});
