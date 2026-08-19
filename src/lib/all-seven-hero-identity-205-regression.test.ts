import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/page-head-visible-parity-204.css", "utf8");

describe("all seven hero identity 205", () => {
  it("targets every non-Nexus main hero directly while leaving Nexus as reference", () => {
    expect(css).toContain(".tadeon-dashboard-hero");
    expect(css).toContain(".tadeon-tabletop-studio__header");
    expect(css).toContain(".tadeon-master-commandbar");
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero");
    expect(css).not.toContain(".tadeon-route-nexus");
  });

  it("keeps the canonical colors of the six sibling tabs", () => {
    for (const rgb of [
      "217 215 164",
      "84 123 148",
      "116 36 45",
      "183 129 77",
      "122 129 135",
      "113 107 123",
    ]) expect(css).toContain(rgb);
  });

  it("uses the matching navigation symbols in circular medallions", () => {
    expect(css).toContain("border-radius: 50% !important");
    expect(css).toContain("Dashboard / Home");
    expect(css).toContain("Mesa Nexus / MapPinned");
    expect(css).toContain("Painel do Mestre / Lightbulb");
    expect(css).toContain("Gerenciar Usuários / Users");
    expect(css).toContain("Backup & Diagnóstico / Wrench");
    expect(css).toContain("Consulta Offline / CloudOff");
  });

  it("does not introduce motion or behavior changes", () => {
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
