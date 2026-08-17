import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("focus header + navigation parity 159", () => {
  it("loads the parity authority after the 158 repair", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain(
      'import focusHeaderNavParity159Css from "../styles/focus-header-nav-parity-159.css?url"',
    );
    expect(root.lastIndexOf("href: mobilePopupMasterHead158Css")).toBeLessThan(
      root.lastIndexOf("href: focusHeaderNavParity159Css"),
    );
  });

  it("uses one global focus-header contract instead of four route exceptions", () => {
    const css = source("src/styles/focus-header-nav-parity-159.css");
    expect(css).toContain(".tadeon-shell .tadeon-desktop-toolbar");
    expect(css).toContain(".tadeon-shell .tadeon-mobile-header");
    expect(css).toContain("height: auto !important");
    expect(css).toContain("max-height: none !important");
    expect(css).toContain("isolation: auto !important");
    expect(css).toContain("grid-auto-flow: row !important");
    expect(css).not.toContain('data-section="Painel do Mestre"');
    expect(css).not.toContain('data-section="Usuários"');
    expect(css).not.toContain('data-section="Saúde do arquivo"');
    expect(css).not.toContain('data-section="Consulta offline"');
  });

  it("makes authored master and backup symbols inherit navigation color", () => {
    const css = source("src/styles/focus-header-nav-parity-159.css");
    expect(css).toContain('.tadeon-nav-item[href="/master-panel"] .tadeon-nav-item__icon::before');
    expect(css).toContain('.tadeon-nav-item[href="/nexus-tools"] .tadeon-nav-item__icon::before');
    expect(css).toContain("background-color: currentColor !important");
    expect(css).toContain("background-image: none !important");
    expect(css).toContain("background-color: var(--section-accent) !important");
    expect(css).toContain("mask: center / contain no-repeat");
  });

  it("fits the master dock symbol into the same 20px slot as peer icons", () => {
    const css = source("src/styles/focus-header-nav-parity-159.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"]::before');
    expect(css).toContain("width: 1.25rem !important");
    expect(css).toContain("height: 1.25rem !important");
    expect(css).toContain("transform: translateY(-1px) !important");
  });
});
