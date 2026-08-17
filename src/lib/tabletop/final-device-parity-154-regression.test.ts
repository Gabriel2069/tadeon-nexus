import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final device parity 154", () => {
  it("restores global focus headers and moves visual identity to internal page heroes", () => {
    const css = source("src/styles/final-device-parity-154.css");
    const bridge = source("src/components/page-hero-parity-bridge.tsx");

    expect(css).toContain(".tadeon-desktop-toolbar");
    expect(css).toContain("position: sticky !important");
    expect(css).toContain(".tadeon-mobile-header__identity::before");
    expect(css).toContain("content: none !important");
    expect(css).toContain('.tadeon-page-header[data-tadeon-page-hero="master"]');
    expect(css).toContain('.tadeon-page-header[data-tadeon-page-hero="users"]');
    expect(css).toContain('.tadeon-page-header[data-tadeon-page-hero="tools"]');
    expect(css).toContain('.tadeon-page-header[data-tadeon-page-hero="offline"]');
    expect(bridge).toContain('#tadeon-main .tadeon-page-header');
    expect(bridge).toContain("BookKey");
    expect(bridge).toContain("ShieldCheck");
    expect(bridge).toContain("ArchiveRestore");
    expect(bridge).toContain("WifiOff");
  });

  it("keeps every sheet header action on one mobile rail and centers the real condition dot row", () => {
    const css = source("src/styles/final-device-parity-154.css");
    const bridge = source("src/components/user-repair-152-bridge.tsx");

    expect(css).toContain(".tadeon-sheet-commandbar__actions");
    expect(css).toContain("flex-wrap: nowrap !important");
    expect(css).toContain("#tadeon-sheet-experience-actions");
    expect(css).toContain("overflow-x: auto !important");
    expect(bridge).toContain('classList.add("tadeon-condition-counter-host")');
    expect(bridge).toContain('classList.add("tadeon-condition-counter-dots")');
    expect(css).toContain(".tadeon-condition-counter-dots");
    expect(css).toContain("justify-self: center !important");
  });

  it("protects portrait and landscape tablet sidebar geometry", () => {
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(css).toContain("@media (min-width: 768px) and (max-width: 1180px)");
    expect(css).toContain("#tadeon-desktop-sidebar");
    expect(css).toContain("overflow: visible !important");
    expect(css).toContain('button[aria-controls="tadeon-desktop-sidebar"]');
    expect(css).toContain("right: -.8rem !important");
  });

  it("preserves tabletop high-DPI fidelity while keeping adaptive degradation", () => {
    const performance = source("src/lib/tabletop/tabletop-adaptive-performance.ts");
    const textures = source("src/lib/tabletop/texture-manager.ts");
    const css = source("src/styles/final-device-parity-154.css");

    expect(performance).toContain("maxResolution: 2.5");
    expect(performance).toContain("maxResolution: 2,");
    expect(performance).toContain("maxResolution: 1.6");
    expect(performance).toContain("maxResolution: 1.25");
    expect(textures).toContain('texture.source.scaleMode = "linear"');
    expect(textures).toContain("texture.source.maxAnisotropy = 8");
    expect(css).toContain("image-rendering: auto !important");
  });

  it("gives the Edit button explicit contrast while the sheet is in Game mode", () => {
    const css = source("src/styles/final-device-parity-154.css");
    expect(css).toContain('.tadeon-sheet-game-button[data-state="active"]');
    expect(css).toContain('html[data-tadeon-sheet-mode="game"] .tadeon-sheet-game-button');
    expect(css).toContain("color: #090b0f !important");
  });

  it("retains richer card and tab depth throughout the mobile application", () => {
    const css = source("src/styles/final-device-parity-154.css");
    expect(css).toContain(".tadeon-route-stage .tadeon-page:not(.tadeon-sheet-page)");
    expect(css).toContain('[role="tab"][data-state="active"]');
    expect(css).toContain("--mobile-panel-rgb");
    expect(css).toContain("radial-gradient(circle at 94% -6%");
  });

  it("loads final parity and compatibility authorities after repair 153", () => {
    const root = source("src/routes/__root.tsx");
    expect(root.indexOf("mobileProductRepair153Css")).toBeLessThan(
      root.indexOf("finalDeviceParity154Css"),
    );
    expect(root.indexOf("finalDeviceParity154Css")).toBeLessThan(
      root.indexOf("finalDeviceParity154CompatCss"),
    );
    expect(root.lastIndexOf("href: mobileProductRepair153Css")).toBeLessThan(
      root.lastIndexOf("href: finalDeviceParity154Css"),
    );
    expect(root.lastIndexOf("href: finalDeviceParity154Css")).toBeLessThan(
      root.lastIndexOf("href: finalDeviceParity154CompatCss"),
    );
    expect(root).toContain("<PageHeroParityBridge />");
  });
});
