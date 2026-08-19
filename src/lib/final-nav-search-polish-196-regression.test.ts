import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final navigation and search polish 196", () => {
  it("keeps breathing room below master navigation", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(css).toContain(".tadeon-master-navigation-slot");
    expect(css).toContain("margin-bottom:");
  });

  it("makes the 2D/3D control resolve to the same outline variant without special inline styling", () => {
    const button = source("src/components/ui/button.tsx");
    expect(button).toContain('ariaLabel === "Ativar projeção espacial 3D"');
    expect(button).toContain('ariaLabel === "Voltar à planta 2D"');
    expect(button).toContain('const effectiveVariant = isProjectionToggle ? "outline" : variant');
    expect(button).toContain('"aria-pressed": undefined');
    expect(button).not.toContain("projectionStyle");
    expect(button).not.toContain("projectionActive");
    expect(button).not.toContain("data-projection-toggle");
  });

  it("changes only the sidebar svg on hover and inherits the canonical route accent", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    const routeCss = source("src/styles/nav-sheet-search-polish-162.css");
    expect(css).toContain(".tadeon-nav-item:hover .tadeon-nav-item__icon > svg");
    expect(css).toContain("color: var(--nav-accent, currentColor)");
    expect(css).toContain("var(--nav-accent-rgb, 217 215 164)");
    expect(routeCss).toContain('.tadeon-nav-item[href="/tabletop"] { --nav-accent: rgb(84 123 148)');
    expect(routeCss).toContain('.tadeon-nav-item[href="/manage-users"] { --nav-accent: rgb(183 129 77)');
  });

  it("uses native Dialog centering on desktop and visualViewport only on compact screens", () => {
    const search = source("src/components/global-search.tsx");
    const dialog = source("src/components/ui/dialog.tsx");
    const css = source("src/styles/final-nav-search-polish-196.css");

    expect(search).toContain("window.visualViewport");
    expect(search).toContain('contentClassName="tadeon-global-search-dialog"');
    expect(dialog).toContain("fixed left-[50%] top-[50%]");
    expect(dialog).toContain("translate-x-[-50%] translate-y-[-50%]");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("--tadeon-search-vv-height");
    expect(css).toContain("transform: none !important");
    expect(css).not.toContain('@import "./runtime-ui-repair-198.css"');
    expect(css).not.toContain("@media (min-width: 768px) and (min-height: 521px)");
    expect(css).toContain(".tadeon-global-search-command .tadeon-command-footer");
  });
});
