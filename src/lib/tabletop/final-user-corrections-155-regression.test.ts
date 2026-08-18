import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final user corrections 155", () => {
  it("fully restores the global focus header to its pre-153 shell contract", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    expect(css).toContain(".tadeon-desktop-toolbar::before");
    expect(css).toContain(".tadeon-mobile-header::before");
    expect(css).toContain("content: none !important");
    expect(css).toContain("padding-left: 0 !important");
    expect(css).toContain("border-left: 0 !important");
    expect(css).toContain("text-shadow: none !important");
    expect(css).toContain("rgb(8 10 14 / 82%) !important");
    expect(css).toContain("rgb(8 10 14 / 88%) !important");
  });

  it("targets actual utility route heroes without runtime DOM injection", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    const root = source("src/routes/__root.tsx");
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero::before");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero::before");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero::before");
    expect(css).toContain("background-image: url(\"data:image/svg+xml");
    expect(css).toContain("radial-gradient(circle at 88% -18%");
    expect(root).not.toContain("PageHeroParityBridge");
  });

  it("makes master navigation genuinely viewport-fixed and preserves layout space", () => {
    const navigation = source("src/components/master/master-panel-navigation.tsx");
    const css = source("src/styles/user-visible-repair-156.css");
    expect(navigation).toContain("tadeon-master-navigation-slot");
    expect(navigation).toContain('className="tadeon-master-navigation"');
    expect(navigation).toContain('className="tadeon-master-navigation__scroller"');
    expect(navigation).toContain("tadeon-master-navigation__rail overflow-x-auto");
    expect(css).toContain(".tadeon-master-navigation-slot");
    expect(css).toContain("position: fixed !important");
    expect(css).toContain("left: 16rem !important");
    expect(css).toContain('data-mini="true"');
    expect(css).toContain("left: 5.5rem !important");
  });

  it("renders dying and collapsing dots as a horizontal row over a full-width track", () => {
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(css).toContain("grid-auto-flow: column !important");
    expect(css).toContain("grid-auto-columns: 1.75rem !important");
    expect(css).toContain(".tadeon-condition-counter-dots::before");
    expect(css).toContain("right: 0 !important");
    expect(css).toContain(".tadeon-condition-counter-dots::after");
    expect(css).toContain("width: var(--condition-fill, 0%) !important");
  });

  it("restores the original mobile spatial field and adds real utility-card texture", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    expect(css).toContain("rgb(255 255 255 / .7%) 1px");
    expect(css).toContain("background-size: 64px 64px, 64px 64px, auto !important");
    expect(css).toContain('.tadeon-route-users [data-slot="card"]');
    expect(css).toContain('.tadeon-route-tools [data-slot="card"]');
    expect(css).toContain('.tadeon-route-offline [data-slot="card"]');
    expect(css).toContain("0 0 0 1.6rem rgb(var(--section-accent-rgb) / 2.2%)");
  });

  it("keeps at least a 2x canvas in economy and full 3x on capable displays", () => {
    const performance = source("src/lib/tabletop/tabletop-adaptive-performance.ts");
    const bridge = source("src/components/tabletop/tabletop-adaptive-performance-bridge.tsx");
    const director = source("src/components/tabletop/tabletop-director-entry.tsx");
    const native = source("src/components/tabletop/tabletop-native-model-bridge.tsx");
    expect(performance).toContain('tier: "cinematic",\n    maxResolution: 3');
    expect(performance).toContain('tier: "high",\n    maxResolution: 3');
    expect(performance).toContain('tier: "balanced",\n    maxResolution: 2.5');
    expect(performance).toContain('tier: "economy",\n    maxResolution: 2');
    expect(bridge).toContain("syncImmediateDensity");
    expect(bridge).toContain("profileForCurrentDevice");
    expect(director).toContain("<TabletopAdaptivePerformanceBridge />");
    expect(native).toContain("installNativeDensityContract");
    expect(native).toContain("--tadeon-tabletop-quality-resolution");
    expect(native).toContain("prototype.ensureCanvasSize = function ensureHighDensityNativeCanvas");
  });
});
