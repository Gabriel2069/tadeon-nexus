import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("master panel navigation fit 185", () => {
  it("loads the final fit authority after workspace polish", () => {
    const component = source("src/components/master/master-panel-navigation.tsx");
    const base = component.indexOf('import "@/styles/workspace-polish.css"');
    const fit = component.indexOf('import "@/styles/master-panel-navigation-fit-185.css"');
    expect(base).toBeGreaterThan(-1);
    expect(fit).toBeGreaterThan(base);
  });

  it("keeps the navigation inside the workspace instead of sizing the scroller to its contents", () => {
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(css).toContain(".tadeon-master-navigation-slot");
    expect(css).toContain("width: 100% !important");
    expect(css).toContain("max-width: 100% !important");
    expect(css).toContain("overflow-x: auto !important");
  });

  it("uses complete wrapped groups on desktop and a padded horizontal rail on compact screens", () => {
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("flex-wrap: wrap !important");
    expect(css).toContain("justify-content: center !important");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("flex-wrap: nowrap !important");
    expect(css).toContain("scroll-snap-align: start");
  });

  it("preserves safe-area breathing room so edge groups are not visually clipped", () => {
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
    expect(css).toContain("padding-right: max(.8rem, env(safe-area-inset-right))");
    expect(css).toContain("padding-left: max(.8rem, env(safe-area-inset-left))");
  });
});
