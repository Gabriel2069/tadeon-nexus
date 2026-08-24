import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final icon and route parity 174/176", () => {
  it("uses the exact route favicon identity for Mesa on every navigation surface", () => {
    const layout = source("src/components/app-layout.tsx");
    const symbols = source("src/components/section-symbols.tsx");
    const favicon = source("public/favicons/tabletop.svg");
    expect(layout).toContain('currentSection === "Mesa Nexus"');
    expect(layout).toContain('<SectionSymbol section="tabletop"');
    expect(layout).not.toContain("MapPinned");
    expect(symbols).toContain("export function TabletopSigil");
    expect(symbols).toContain("M18 28 38 20l20 8 20-8v48l-20 8-20-8-20 8Z");
    expect(favicon).toContain("M18 28 38 20l20 8 20-8v48l-20 8-20-8-20 8Z");
  });

  it("pins authored Panel and Backup glyphs to the geometric center of the shared square", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain('href="/master-panel"], [href="/nexus-tools"]');
    expect(css).toContain("top: 50% !important");
    expect(css).toContain("left: 50% !important");
    expect(css).toContain("width: 1.22rem !important");
    expect(css).toContain("height: 1.22rem !important");
    expect(css).toContain("transform: translate(-50%, -50%) !important");
  });

  it("returns the mobile Master button to the exact dock geometry of its siblings", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain("/* #176:");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] {');
    expect(css).toContain("gap: .24rem !important");
    expect(css).toContain("width: 1.25rem !important");
    expect(css).toContain("height: 1.25rem !important");
    expect(css).toContain("flex: 0 0 auto !important");
    expect(css).toContain("margin: 0 !important");
    expect(css).not.toContain("gap: .31rem !important");
    expect(css).not.toContain("width: 1.44rem !important");
    expect(css).not.toContain("height: 1.44rem !important");
  });

  it("restores the same active underline and motion contract to the mobile Master button", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"][aria-current="page"]::before');
    expect(css).toContain("transform: translateY(-1px) !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"][aria-current="page"]::after');
    expect(css).toContain("bottom: .2rem !important");
    expect(css).toContain("width: 1rem !important");
    expect(css).toContain("height: 2px !important");
    expect(css).toContain("background: var(--section-accent) !important");
  });

  it("does not treat Backup as a Nexus child route in either navigation surface", () => {
    const layout = source("src/components/app-layout.tsx");
    expect(layout).toContain('const isNexusRoute = path === "/nexus" || path.startsWith("/nexus/")');
    expect(layout).toContain("const knowledgeEnabled = navigationFlags.knowledge || isNexusRoute");
    expect(layout).toContain("active={isNexusRoute}");
    expect(layout).toContain('aria-current={isNexusRoute ? "page" : undefined}');
    expect(layout).not.toContain('active={path.startsWith("/nexus")}');
    expect(layout).not.toContain('aria-current={path.startsWith("/nexus") ? "page" : undefined}');
  });
});
