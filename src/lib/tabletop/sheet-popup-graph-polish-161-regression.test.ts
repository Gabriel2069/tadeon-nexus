import { readFileSync } from "node:fs";
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
  it("loads the 161 visual authority after navigation parity 160", () => {
    expect(root).toContain("sheet-popup-graph-polish-161.css?url");
    expect(root.indexOf("navigationRealSvgParity160Css")).toBeLessThan(
      root.indexOf("sheetPopupGraphPolish161Css"),
    );
    expect(root.lastIndexOf("href: sheetPopupGraphPolish161Css")).toBeGreaterThan(
      root.lastIndexOf("href: navigationRealSvgParity160Css"),
    );
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
    expect(organizer).toContain(
      'document.querySelector<HTMLElement>("#sec-inv .tadeon-sheet-section__actions")',
    );
    expect(organizer).toContain("anchor.insertBefore(host, anchor.firstChild)");
    expect(organizer).not.toContain("#sec-inv h2");
    expect(organizer).not.toContain('insertAdjacentElement("afterend"');
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
