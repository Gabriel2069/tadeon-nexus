import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final user corrections 172", () => {

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

  it("retains Nexus ornament and manually controlled force layout", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    const graph = source("src/components/knowledge/knowledge-graph-second-brain.tsx");
    expect(css).toContain(".tadeon-nexus-header::before");
    expect(css).toContain("conic-gradient(from 18deg");
    // NEX-006 intentionally revises density; behavior is covered by knowledge-graph-controls.
    expect(graph).toContain('computeKnowledgeForceLayout');
    expect(graph).toContain('pinnedPositions');
  });

  it("preserves Panel/Backup icon accents and mini labels", () => {
    const nav = source("src/styles/navigation-real-svg-parity-160.css");
    const layout = source("src/components/app-layout.tsx");
    // NEX-024: real centering/visibility/targets are measured by the browser verifier.
    expect(layout).toContain('data-mini={mini ? "true" : "false"}');
    expect(layout).toContain('mini ? "justify-center px-2" : ""');
    expect(nav).toContain("--nav-accent-rgb: var(--section-accent-rgb, 217 215 164)");
    expect(nav).toContain("--nav-accent-rgb: 116 36 45");
    expect(nav).toContain("--nav-accent-rgb: 122 129 135");
  });

  it("contains the global search popup across the tablet range", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain("@media (min-width: 641px) and (max-width: 1180px)");
    expect(css).toContain('[data-slot="dialog-content"]:has(> [data-slot="command"])');
    expect(css).toContain("width: min(42rem, calc(100vw - 2rem)) !important");
    expect(css).toContain("transform: translate(-50%, -50%) !important");
  });
});
