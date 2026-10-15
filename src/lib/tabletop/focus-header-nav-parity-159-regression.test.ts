import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("focus header + navigation parity 159", () => {
  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/routes/__root.tsx", "src/styles/mobile-popup-master-head-158.css", "src/styles/focus-header-nav-parity-159.css")).toBe(true);
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


});
