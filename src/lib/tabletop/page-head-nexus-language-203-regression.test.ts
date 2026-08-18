import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("page head Nexus language 203", () => {
  it("loads the visual-only parity layer through the existing hero authority", () => {
    const css = read("src/styles/desktop-hero-parity-202.css");
    expect(css).toContain('@import "./page-head-nexus-language-203.css";');
  });

  it("keeps the existing page-specific icons and route bindings untouched", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    expect(bridge).toContain("icon: BookKey");
    expect(bridge).toContain("icon: ShieldCheck");
    expect(bridge).toContain("icon: ArchiveRestore");
    expect(bridge).toContain("icon: WifiOff");
    expect(bridge).toContain('kind: "master"');
    expect(bridge).toContain('kind: "users"');
    expect(bridge).toContain('kind: "tools"');
    expect(bridge).toContain('kind: "offline"');
  });

  it("gives every authored section head Nexus-style icon framing and distinct orbital variants", () => {
    const css = read("src/styles/page-head-nexus-language-203.css");
    expect(css).toContain("> .tadeon-page-hero-mark-host");
    expect(css).toContain(".tadeon-page-hero-mark-icon");
    for (const kind of ["master", "users", "tools", "offline"]) {
      expect(css).toContain(`data-tadeon-page-hero="${kind}"`);
    }
    expect(css).toContain("--hero-rgb");
    expect(css).toContain("--hero-secondary-rgb");
  });

  it("does not introduce or replace motion behavior", () => {
    const css = read("src/styles/page-head-nexus-language-203.css");
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
