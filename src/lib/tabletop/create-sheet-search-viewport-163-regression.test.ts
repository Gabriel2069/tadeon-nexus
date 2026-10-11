import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const css = readFileSync("src/styles/create-sheet-search-viewport-163.css", "utf8");

describe("create sheet/search viewport 163", () => {
  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/routes/__root.tsx", "src/styles/nav-sheet-search-polish-162.css", "src/styles/create-sheet-search-viewport-163.css")).toBe(true);
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
