import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final user corrections 172", () => {
  it("makes the corner control minimize only reliability chrome", () => {
    const bridge = source("src/components/tabletop/tabletop-urgent-reconciliation-bridge.tsx");
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(bridge).toContain('const RELIABILITY_KEY = "tadeon.tabletop.reliability.collapsed"');
    expect(bridge).toContain("reliabilityCollapsed");
    expect(bridge).toContain("tadeonTabletopReliability");
    expect(bridge).not.toContain("topRailCollapsed");
    expect(css).toContain('html[data-tadeon-tabletop-reliability="collapsed"] .tadeon-tabletop-reliability-strip');
    expect(css).toContain("html[data-tadeon-tabletop-reliability] .tadeon-tabletop-toolbar");
    expect(css).toContain("visibility: visible !important");
  });

  it("keeps the folded creative Dock above the final stage status strip", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain('.tadeon-creative-dock[data-open="false"]');
    expect(css).toContain("--tadeon-tabletop-stage-bottom");
    expect(css).toContain("+ 4.35rem");
    expect(css).toContain("z-index: 52 !important");
  });

  it("puts Mesa identity and its popout action in the correct headers", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    const popout = source("src/components/tabletop/tabletop-workspace-popout-bridge.tsx");
    expect(css).toContain('.tadeon-shell[data-section="Mesa Nexus"] .tadeon-mobile-header__identity > svg');
    expect(css).toContain(".tadeon-tabletop-studio__brand::before");
    expect(css).toContain("mask: center / 1.28rem 1.28rem no-repeat url");
    expect(popout).toContain('".tadeon-desktop-toolbar > div:last-child"');
    expect(popout).toContain("Nova janela");
    expect(popout).not.toContain('".tadeon-tabletop-reliability-strip"');
  });

  it("restores Nexus ornament and substantially opens the force graph", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    const graph = source("src/components/knowledge/nexus-graph-declutter-bridge.tsx");
    expect(css).toContain(".tadeon-nexus-header::before");
    expect(css).toContain("conic-gradient(from 18deg");
    expect(graph).toContain('setRange("Distância-base", 250)');
    expect(graph).toContain('setRange("Repulsão", 2.3)');
    expect(graph).toContain('setRange("Centro", 0.38)');
    expect(graph).toContain('setRange("Agrupamento por domínio", 0.15)');
  });

  it("centers the lateral navigation and removes master-menu dead side space", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    const layout = source("src/components/app-layout.tsx");
    expect(css).toContain(".tadeon-primary-nav .tadeon-nav-item__icon");
    expect(css).toContain("place-items: center;");
    expect(layout).toContain('mini ? "justify-center px-2" : ""');
    expect(css).toContain(".tadeon-master-navigation__scroller");
    expect(css).toContain("width: fit-content;");
    expect(css).toContain('> [data-slot="tabs-list"]');
    expect(css).toContain("width: max-content;");
  });

  it("contains the global search popup across the tablet range", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain("@media (min-width: 641px) and (max-width: 1180px)");
    expect(css).toContain('[data-slot="dialog-content"]:has(> [data-slot="command"])');
    expect(css).toContain("width: min(42rem, calc(100vw - 2rem)) !important");
    expect(css).toContain("transform: translate(-50%, -50%) !important");
  });
});
