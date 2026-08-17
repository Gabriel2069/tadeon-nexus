import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final user corrections 155", () => {
  it("fully removes the accidental page identity from the global focus header", () => {
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(css).toContain(".tadeon-desktop-toolbar::before");
    expect(css).toContain(".tadeon-mobile-header::before");
    expect(css).toContain("content: none !important");
    expect(css).toContain("padding-left: 0 !important");
    expect(css).toContain("border-left: 0 !important");
    expect(css).toContain("text-shadow: none !important");
  });

  it("targets the actual route heroes with Nexus-like marks", () => {
    const bridge = source("src/components/page-hero-parity-bridge.tsx");
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(bridge).toContain("#tadeon-main .tadeon-master-commandbar");
    expect(bridge).toContain(".tadeon-route-users > .tadeon-page-hero");
    expect(bridge).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(bridge).toContain(".tadeon-route-offline > .tadeon-page-hero");
    expect(css).toContain(".tadeon-page-hero-mark-host");
    expect(css).toContain("--hero-ring-alpha");
    expect(css).toContain("radial-gradient(circle at 7% 14%");
  });

  it("makes master navigation truly sticky by separating the horizontal scroller", () => {
    const navigation = source("src/components/master/master-panel-navigation.tsx");
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(navigation).toContain('className="tadeon-master-navigation -mx-3 px-3 pb-1');
    expect(navigation).not.toContain('tadeon-master-navigation -mx-3 overflow-x-auto');
    expect(navigation).toContain("tadeon-master-navigation__scroller overflow-x-auto");
    expect(css).toContain(".tadeon-master-navigation {");
    expect(css).toContain("position: sticky !important");
    expect(css).toContain(".tadeon-master-navigation__scroller");
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

  it("ports desktop spatial and guide depth to mobile without touching Mesa or Ficha chrome", () => {
    const css = source("src/styles/final-device-parity-154-compat.css");
    expect(css).toContain(':not([data-section="Mesa Nexus"]):not([data-section="Ficha"]) .tadeon-route-stage');
    expect(css).toContain("background-size: 64px 64px, 64px 64px");
    expect(css).toContain(".tadeon-route-master [role=\"tab\"][data-state=\"active\"]");
    expect(css).toContain("0 0 0 5.1rem rgb(var(--section-accent-rgb) / 1.5%)");
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
