import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("master panel navigation fit 185/186", () => {
  it("loads the final fit authority after workspace polish", () => {
    const component = source("src/components/master/master-panel-navigation.tsx");
    const base = component.indexOf('import "@/styles/workspace-polish.css"');
    const fit = component.indexOf('import "@/styles/master-panel-navigation-fit-185.css"');
    expect(base).toBeGreaterThan(-1);
    expect(fit).toBeGreaterThan(base);
  });

  it("separates the stationary frame from the horizontally scrolling button rail", () => {
    const component = source("src/components/master/master-panel-navigation.tsx");
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(component).toContain('className="tadeon-master-navigation__scroller"');
    expect(component).toContain('className="tadeon-master-navigation__rail overflow-x-auto overscroll-x-contain"');
    expect(css).toContain(".tadeon-master-navigation__scroller {");
    expect(css).toContain("overflow: hidden !important");
    expect(css).toContain(".tadeon-master-navigation__rail {");
    expect(css).toContain("overflow-x: auto !important");
  });

  it("keeps desktop wrapping while compact screens slide only the internal rail", () => {
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(css).toContain("@media (min-width: 1024px)");
    expect(css).toContain("flex-wrap: wrap !important");
    expect(css).toContain("justify-content: center !important");
    expect(css).toContain("@media (max-width: 1023px)");
    expect(css).toContain("flex-wrap: nowrap !important");
    expect(css).toContain("scroll-behavior: smooth");
    expect(css).toContain("animation: tadeon-master-nav-rail-settle 240ms var(--ease-out) both");
  });

  it("preserves the existing button interaction contract and compact safe areas", () => {
    const component = source("src/components/master/master-panel-navigation.tsx");
    const css = source("src/styles/master-panel-navigation-fit-185.css");
    expect(component).toContain('className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"');
    expect(css).not.toContain("[data-slot=\"tabs-trigger\"]:active");
    expect(css).toContain("env(safe-area-inset-left)");
    expect(css).toContain("env(safe-area-inset-right)");
  });
});
