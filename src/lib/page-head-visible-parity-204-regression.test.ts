import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/page-head-visible-parity-204.css", "utf8");
const loader = readFileSync("src/styles/desktop-hero-parity-202.css", "utf8");

describe("visible page head parity 204", () => {
  it("loads the final visible layer", () => {
    expect(loader).toContain('@import "./page-head-visible-parity-204.css";');
  });

  it("targets the actual authored hero symbols", () => {
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero::before");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero::before");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero::before");
    expect(css).toContain(".tadeon-master-commandbar__glow");
    expect(css).toContain("border-radius: 50% !important");
  });

  it("targets each real hero background ornament", () => {
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero::after");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero::after");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero::after");
    expect(css).toContain(".tadeon-master-commandbar::after");
  });

  it("does not alter authored motion behavior", () => {
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
