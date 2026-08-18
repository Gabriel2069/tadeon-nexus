import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile navigation and dialog viewport 180", () => {
  it("projects canonical navigation glyphs into the mobile More radial", () => {
    const bridge = source("src/components/mobile-more-radial-bridge.tsx");
    const css = source("src/styles/mobile-navigation-final-180.css");

    expect(bridge).toContain('data-nav-target={item.to}');
    expect(bridge).toContain('className="tadeon-mobile-more-radial__nav-icon"');
    expect(css).toContain('.tadeon-mobile-more-radial__item[data-nav-target="/nexus-tools"]');
    expect(css).toContain('mask: center / contain no-repeat url("data:image/svg+xml');
  });

  it("keeps the authored Master glyph inside the canonical dock geometry", () => {
    const css = source("src/styles/mobile-navigation-final-180.css");

    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] {');
    expect(css).toContain('gap: .24rem !important');
    expect(css).toContain('min-height: 3.7rem !important');
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"][aria-current="page"]::after');
    expect(css).toContain('transform: translateX(-50%) !important');
  });

  it("binds every shared dialog to the visual viewport used above mobile keyboards", () => {
    const dialog = source("src/components/ui/dialog.tsx");
    const css = source("src/styles/dialog-visual-viewport-180.css");

    expect(dialog).toContain('window.visualViewport');
    expect(dialog).toContain('viewport?.addEventListener("resize", sync)');
    expect(dialog).toContain('active.scrollIntoView({ block: "nearest", inline: "nearest" })');
    expect(dialog).toContain('"--tadeon-vv-height"');
    expect(css).toContain('var(--tadeon-vv-height, 100dvh)');
    expect(css).toContain('var(--tadeon-vv-width, 100vw)');
    expect(css).toContain('[data-slot="dialog-content"] [data-slot="dialog-close"]');
  });
});
