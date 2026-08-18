import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final navigation and search polish 196/199", () => {
  it("keeps breathing room below master navigation", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(css).toContain(".tadeon-master-navigation-slot");
    expect(css).toContain("margin-bottom:");
  });

  it("keeps the 2D/3D border on the rendered Button instead of a stylesheet override", () => {
    const button = source("src/components/ui/button.tsx");
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(button).toContain('ariaLabel === "Ativar projeção espacial 3D"');
    expect(button).toContain('ariaLabel === "Voltar à planta 2D"');
    expect(button).toContain("data-projection-toggle");
    expect(button).toContain("border: `1px solid");
    expect(button).toContain("projectionActive");
    expect(css).not.toContain('.tadeon-tabletop-toolbar__group button:is(');
  });

  it("does not recolor the sidebar after the requested full revert", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    const runtimeCss = source("src/styles/runtime-ui-repair-198.css");
    expect(css).not.toContain("--tadeon-nav-hover-rgb");
    expect(css).not.toContain('.tadeon-nav-item[href^="/master-panel"]');
    expect(runtimeCss).not.toContain(".tadeon-nav-item");
  });

  it("binds the global search to the live visual viewport and keeps only the list scrollable", () => {
    const search = source("src/components/global-search.tsx");
    const command = source("src/components/ui/command.tsx");
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(search).toContain("window.visualViewport");
    expect(search).toContain('contentClassName="tadeon-global-search-dialog"');
    expect(search).toContain('commandClassName="tadeon-global-search-command"');
    expect(command).toContain("contentClassName?: string");
    expect(command).toContain("min-h-0 flex-1");
    expect(css).toContain("--tadeon-search-vv-height");
    expect(css).toContain("overflow: hidden !important");
    expect(css).toContain(".tadeon-global-search-command .tadeon-command-footer");
  });
});
