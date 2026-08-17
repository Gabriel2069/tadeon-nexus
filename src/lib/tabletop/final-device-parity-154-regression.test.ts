import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final device parity 154", () => {
  it("keeps the pre-153 global focus header while utility identity lives on real route heroes", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    const root = source("src/routes/__root.tsx");

    expect(css).toContain(".tadeon-desktop-toolbar::before");
    expect(css).toContain(".tadeon-mobile-header::before");
    expect(css).toContain("content: none !important");
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero");
    expect(css).toContain(".tadeon-master-commandbar");
    expect(root).not.toContain("PageHeroParityBridge");
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

    expect(performance).toContain("maxResolution: 3");
    expect(performance).toContain("maxResolution: 2.5");
    expect(performance).toContain("maxResolution: 2");
    expect(textures).toContain('texture.source.scaleMode = "linear"');
    expect(textures).toContain("texture.source.maxAnisotropy = 16");
    expect(css).toContain("image-rendering: auto !important");
  });

  it("gives the Edit button explicit contrast while the sheet is in Game mode", () => {
    const css = source("src/styles/final-device-parity-154.css");
    expect(css).toContain('.tadeon-sheet-game-button[data-state="active"]');
    expect(css).toContain('html[data-tadeon-sheet-mode="game"] .tadeon-sheet-game-button');
    expect(css).toContain("color: #090b0f !important");
  });

  it("retains richer card and tab depth throughout the mobile utility routes", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    expect(css).toContain("background-size: 64px 64px, 64px 64px, auto !important");
    expect(css).toContain('.tadeon-route-tools [data-slot="tabs-trigger"][data-state="active"]');
    expect(css).toContain('.tadeon-route-offline [data-slot="tabs-trigger"][data-state="active"]');
    expect(css).toContain('.tadeon-route-users [data-slot="card"]::before');
  });

  it("loads the field-visible repair after all older visual authorities", () => {
    const root = source("src/routes/__root.tsx");
    expect(root.indexOf("mobileProductRepair153Css")).toBeLessThan(
      root.indexOf("finalDeviceParity154Css"),
    );
    expect(root.indexOf("finalDeviceParity154Css")).toBeLessThan(
      root.indexOf("finalDeviceParity154CompatCss"),
    );
    expect(root.indexOf("finalDeviceParity154CompatCss")).toBeLessThan(
      root.indexOf("userVisibleRepair156Css"),
    );
    expect(root.lastIndexOf("href: finalDeviceParity154CompatCss")).toBeLessThan(
      root.lastIndexOf("href: userVisibleRepair156Css"),
    );
    expect(root).not.toContain("PageHeroParityBridge");
  });
});
