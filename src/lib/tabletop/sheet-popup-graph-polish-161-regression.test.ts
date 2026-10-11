import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const css = readFileSync("src/styles/sheet-popup-graph-polish-161.css", "utf8");
const organizer = readFileSync(
  "src/components/sheet/sheet-inventory-organizer.tsx",
  "utf8",
);
const graph = readFileSync(
  "src/lib/knowledge/knowledge-graph-memory-spaced.ts",
  "utf8",
);

describe("sheet popup graph polish 161", () => {
  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/routes/__root.tsx", "src/styles/navigation-real-svg-parity-160.css", "src/styles/sheet-popup-graph-polish-161.css")).toBe(true);
  });

  it("keeps authored Master and Backup marks while preserving real SVG geometry", () => {
    expect(css).toContain('.tadeon-nav-item[href="/master-panel"] .tadeon-nav-item__icon > svg');
    expect(css).toContain('.tadeon-nav-item[href="/nexus-tools"] .tadeon-nav-item__icon > svg');
    expect(css).toContain("opacity: 0 !important");
    expect(css).toContain("background: currentColor !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain("width: 1.25rem !important");
  });

  it("locks mobile dialogs to safe inline edges without animated scaling", () => {
    expect(css).toContain(':has(#sheet-name)');
    expect(css).toContain("--tadeon-popup-inline-start");
    expect(css).toContain("--tadeon-popup-inline-end");
    expect(css).toContain("right: var(--tadeon-popup-inline-end) !important");
    expect(css).toContain("left: var(--tadeon-popup-inline-start) !important");
    expect(css).toContain("width: auto !important");
    expect(css).toContain("@keyframes tadeon-popup-stable-in-161");
    expect(css).not.toContain("scale(.975)");
    expect(css).not.toContain("scale(.985)");
  });

  it("covers the reported sheet visual regressions", () => {
    expect(css).toContain("#sec-info .tadeon-identity-lead");
    expect(css).toContain(".tadeon-attributes-panel .tadeon-attribute-radar");
    expect(css).toContain("@keyframes tadeon-equilibrium-sheen-161");
    expect(css).toContain("#exposicao .tadeon-sheet-section__title-group");
    expect(css).toContain(".tadeon-conditions-panel .tadeon-condition-card::after");
  });

  it("mounts the inventory organizer in the action rail, never beside the title", () => {
    // The rendered placement is exercised by sheet-ui.test.tsx. No DOM attachment remains.
    expect(organizer).not.toContain("MutationObserver");
    expect(organizer).not.toContain("insertBefore");
    expect(organizer).not.toContain("createPortal");
  });

  it("uses an organic force web with post-layout collision instead of concentric rings", () => {
    expect(graph).toContain("legacyForceLayout(");
    expect(graph).toContain("function relaxWeb(");
    expect(graph).toContain("Hard collision pass");
    expect(graph).toContain("final uncompromising separation pass");
    expect(graph).not.toContain("ringRadius");
    expect(graph).not.toContain("chunks(");
  });
});
