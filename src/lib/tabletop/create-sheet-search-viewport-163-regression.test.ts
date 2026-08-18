import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const css = readFileSync("src/styles/create-sheet-search-viewport-163.css", "utf8");

describe("create sheet/search viewport 163", () => {
  it("loads the containment authority after 162", () => {
    expect(root).toContain(
      'import createSheetSearchViewport163Css from "../styles/create-sheet-search-viewport-163.css?url"',
    );
    expect(root.indexOf("navSheetSearchPolish162Css")).toBeLessThan(
      root.indexOf("createSheetSearchViewport163Css"),
    );
    expect(root.indexOf("href: navSheetSearchPolish162Css")).toBeLessThan(
      root.indexOf("href: createSheetSearchViewport163Css"),
    );
  });

  it("anchors every mobile dialog inside safe-area bounds", () => {
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('[data-slot="dialog-content"]');
    expect(css).toContain('top: max(.65rem, env(safe-area-inset-top)) !important');
    expect(css).toContain('right: max(.65rem, env(safe-area-inset-right)) !important');
    expect(css).toContain('left: max(.65rem, env(safe-area-inset-left)) !important');
    expect(css).toContain('100dvh - max(.65rem, env(safe-area-inset-top))');
    expect(css).toContain('transform: none !important');
    expect(css).toContain('overflow-x: hidden !important');
    expect(css).toContain('overflow-y: auto !important');
  });

  it("keeps command search internally scrollable instead of widening", () => {
    expect(css).toContain('[data-slot="dialog-content"]:has(> [data-slot="command"])');
    expect(css).toContain('[data-slot="command-list"]');
    expect(css).toContain('max-width: 100% !important');
    expect(css).toContain('overflow-y: auto');
  });

  it("keeps the close control fixed inside the dialog box", () => {
    expect(css).toContain('[data-slot="dialog-content"] [data-slot="dialog-close"]');
    expect(css).toContain('top: .72rem');
    expect(css).toContain('right: .72rem');
    expect(css).toContain('animation-name: tadeon-dialog-opacity-only-163 !important');
  });
});
