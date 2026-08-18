import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/create-sheet-search-viewport-163.css", "utf8");

describe("navigation authored symbols 166", () => {
  it("restores masks after the 160/162 cascade conflict", () => {
    expect(css).toContain('href="/master-panel"');
    expect(css).toContain('href="/nexus-tools"');
    expect(css).toContain("display: block !important");
    expect(css).toContain("-webkit-mask: center / contain no-repeat url");
    expect(css).toContain("mask: center / contain no-repeat url");
    expect(css).toContain("background: currentColor !important");
  });

  it("keeps the old svg and ghost layer hidden", () => {
    expect(css).toContain("visibility: hidden !important");
    expect(css).toContain(".tadeon-nav-item__icon::after");
    expect(css).toContain("content: none !important");
  });

  it("keeps authored symbols on the same accent motion contract", () => {
    expect(css).toContain("scale(1.08) rotate(-2deg)");
    expect(css).toContain("background: var(--nav-accent) !important");
    expect(css).toContain("drop-shadow(0 0 9px rgb(var(--nav-accent-rgb) / 38%))");
  });
});
