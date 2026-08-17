import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("navigation real SVG parity 160", () => {
  it("loads the real SVG authority after the 159 repair layer", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain(
      'import navigationRealSvgParity160Css from "../styles/navigation-real-svg-parity-160.css?url"',
    );
    expect(root.lastIndexOf("href: focusHeaderNavParity159Css")).toBeLessThan(
      root.lastIndexOf("href: navigationRealSvgParity160Css"),
    );
  });

  it("keeps real React SVGs in AppLayout for Master and Backup", () => {
    const layout = source("src/components/app-layout.tsx");
    expect(layout).toContain('to="/master-panel"');
    expect(layout).toContain('<Lightbulb className="w-4 h-4" />');
    expect(layout).toContain('<Lightbulb className="h-5 w-5" />');
    expect(layout).toContain('to="/nexus-tools"');
    expect(layout).toContain('<Wrench className="w-4 h-4" />');
  });

  it("disables pseudo masks and always shows the lateral SVGs", () => {
    const css = source("src/styles/navigation-real-svg-parity-160.css");
    expect(css).toContain('.tadeon-nav-item[href="/master-panel"] .tadeon-nav-item__icon::before');
    expect(css).toContain('.tadeon-nav-item[href="/nexus-tools"] .tadeon-nav-item__icon::before');
    expect(css).toContain("content: none !important");
    expect(css).toContain("-webkit-mask: none !important");
    expect(css).toContain("mask: none !important");
    expect(css).toContain('.tadeon-nav-item[href="/master-panel"] .tadeon-nav-item__icon > svg');
    expect(css).toContain('.tadeon-nav-item[href="/nexus-tools"] .tadeon-nav-item__icon > svg');
    expect(css).toContain("display: block !important");
    expect(css).toContain("opacity: 1 !important");
  });

  it("uses the same real SVG state contract in the mobile dock", () => {
    const css = source("src/styles/navigation-real-svg-parity-160.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"]::before');
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"][aria-current="page"] > svg');
    expect(css).toContain("width: 1.25rem !important");
    expect(css).toContain("height: 1.25rem !important");
    expect(css).toContain("color: var(--section-accent) !important");
  });
});
