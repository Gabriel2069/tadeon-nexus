import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final icon and route parity 174", () => {
  it("uses the exact MapPinned identity for Mesa instead of the old map glyph", () => {
    const layout = source("src/components/app-layout.tsx");
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(layout).toContain('currentSection === "Mesa Nexus"');
    expect(layout).toContain('<MapPinned className="h-8 w-8 shrink-0 text-primary" />');
    expect(css).toContain("M18 8c0 3.613-3.869 7.429-5.393 8.795");
    expect(css).not.toContain("M14.106 5.553");
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

  it("gives the mobile Master glyph its own optical size without colliding with the label", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] {');
    expect(css).toContain("gap: .31rem !important");
    expect(css).toContain("width: 1.44rem !important");
    expect(css).toContain("height: 1.44rem !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > span');
    expect(css).toContain("line-height: 1 !important");
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
