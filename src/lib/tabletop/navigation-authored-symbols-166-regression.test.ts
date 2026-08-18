import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/create-sheet-search-viewport-163.css", "utf8");

describe("navigation authored symbols 166", () => {
  it("keeps authored masks only in the canonical sidebar icon slots", () => {
    expect(css).toContain('href="/master-panel"');
    expect(css).toContain('href="/nexus-tools"');
    expect(css).toContain("-webkit-mask: center / contain no-repeat url");
    expect(css).toContain("mask: center / contain no-repeat url");
    expect(css).toContain("width: 2rem !important");
    expect(css).toContain("place-items: center !important");
    expect(css).toContain("border-radius: .66rem .22rem .66rem .22rem !important");
  });

  it("hides the Lucide anchor and ghost layer only inside authored sidebar slots", () => {
    expect(css).toContain('.tadeon-nav-item:is([href="/master-panel"], [href="/nexus-tools"]) .tadeon-nav-item__icon > svg');
    expect(css).toContain("visibility: hidden !important");
    expect(css).toContain(".tadeon-nav-item__icon::after");
    expect(css).toContain("content: none !important");
  });

  it("keeps hover and active motion on the shared icon slot instead of drifting the mask", () => {
    expect(css).toContain(':hover .tadeon-nav-item__icon');
    expect(css).toContain('[aria-current="page"] .tadeon-nav-item__icon');
    expect(css).toContain("border-color: rgb(var(--nav-accent-rgb) / 25%) !important");
    expect(css).toContain("background: currentColor !important");
    expect(css).toContain("transform: none !important");
  });

  it("restores the mobile Master item to the same real-SVG dock contract as its siblings", () => {
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain("visibility: visible !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"]::before');
    expect(css).toContain("content: none !important");
  });
});
