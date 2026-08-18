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

  it("gives the 2D/3D control the outline border and a distinct pressed state", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(css).toContain('[aria-label="Ativar projeção espacial 3D"]');
    expect(css).toContain('[aria-label="Voltar à planta 2D"]');
    expect(css).toContain("border: 1px solid hsl(var(--input)) !important");
    expect(css).toContain('[aria-pressed="true"]');
    expect(css).toContain("border-color: hsl(var(--primary) / .78) !important");
  });

  it("uses route-specific sidebar hover accents instead of one generic glow", () => {
    const css = source("src/styles/final-nav-search-polish-196.css");
    expect(css).toContain('.tadeon-nav-item[href^="/nexus"]');
    expect(css).toContain('.tadeon-nav-item[href^="/tabletop"]');
    expect(css).toContain('.tadeon-nav-item[href^="/master-panel"]');
    expect(css).toContain("--tadeon-nav-hover-rgb");
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
