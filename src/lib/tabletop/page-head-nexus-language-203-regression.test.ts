import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("page head canonical layout", () => {
  it("mounts the real hero identity bridge and the final authority layer", () => {
    const root = read("src/routes/__root.tsx");
    expect(root).toContain("PageHeroParityBridge");
    expect(root).toContain("<PageHeroParityBridge />");
    expect(root).toContain("hero-icons-final-212.css?url");
    expect(root).not.toContain("hero-medallion-authority-211.css?url");
  });

  it("uses the same canonical Lucide icons as primary navigation", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    expect(bridge).toContain("icon: Lightbulb");
    expect(bridge).toContain("icon: Users");
    expect(bridge).toContain("icon: Wrench");
    expect(bridge).toContain("icon: CloudOff");
    expect(bridge).toContain("icon: MapPinned");
    expect(bridge).toContain('kind: "master"');
    expect(bridge).toContain('kind: "users"');
    expect(bridge).toContain('kind: "tools"');
    expect(bridge).toContain('kind: "offline"');
  });

  it("uses real icon hosts instead of drawing hero glyphs in pseudo-elements", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const css = read("src/styles/hero-icons-final-212.css");
    expect(bridge).toContain("tadeon-page-hero-mark-host");
    expect(bridge).toContain("tadeon-tabletop-brand-mark-host");
    expect(css).toContain("> .tadeon-page-hero-mark-host");
    expect(css).toContain(".tadeon-page-hero-mark-icon");
    expect(css).toContain("background-image: none !important");
    expect(css).not.toContain("data:image/svg+xml");
  });

  it("shares one mark and title geometry across Nexus and sibling page heroes", () => {
    const css = read("src/styles/hero-icons-final-212.css");
    expect(css).toContain("top: 50% !important");
    expect(css).toContain("width: 3rem !important");
    expect(css).toContain("height: 3rem !important");
    expect(css).toContain("width: 1.4rem !important");
    expect(css).toContain("font-size: 1.5rem !important");
    expect(css).toContain(".tadeon-route-nexus .tadeon-nexus-identity__mark");
  });

  it("keeps Dashboard unique and Mesa limited to its original brand slot", () => {
    const bridge = read("src/components/page-hero-parity-bridge.tsx");
    const css = read("src/styles/hero-icons-final-212.css");
    expect(css).toContain(".tadeon-dashboard-hero::before");
    expect(bridge).toContain('selector: "#tadeon-main .tadeon-tabletop-studio__brand"');
    expect(bridge).toContain('"tadeon-tabletop-brand-mark-host",\n        "after-first"');
    expect(css).toContain(".tadeon-tabletop-brand-mark-host");
    expect(css).toContain(".tadeon-tabletop-studio__brand > svg:first-child");
    expect(css).toContain("flex: 0 0 0 !important");
  });

  it("does not introduce or replace motion behavior", () => {
    const css = read("src/styles/hero-icons-final-212.css");
    expect(css).not.toMatch(/@keyframes\b/);
    expect(css).not.toMatch(/\banimation\s*:/);
    expect(css).not.toMatch(/\btransition\s*:/);
  });
});
