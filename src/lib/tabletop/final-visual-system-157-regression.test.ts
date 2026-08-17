import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final visual system 157", () => {
  it("loads the final visual authority after all previous repair layers", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain('import finalVisualSystem157Css from "../styles/final-visual-system-157.css?url"');
    expect(root.lastIndexOf("href: userVisibleRepair156Css")).toBeLessThan(
      root.lastIndexOf("href: finalVisualSystem157Css"),
    );
  });

  it("forces the repaired shell headers back to a single canonical row", () => {
    const css = source("src/styles/final-visual-system-157.css");
    expect(css).toContain("height: 4.65rem !important");
    expect(css).toContain("flex-flow: row nowrap !important");
    expect(css).toContain("grid-template-rows: 1fr !important");
    expect(css).toContain(".tadeon-mobile-header__thread");
    expect(css).toContain(".tadeon-desktop-toolbar::before");
    expect(css).toContain("content: none !important");
  });

  it("gives every utility hero the Nexus visual grammar", () => {
    const css = source("src/styles/final-visual-system-157.css");
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero");
    expect(css).toContain(".tadeon-master-commandbar");
    expect(css).toContain("border-radius: 1rem .32rem 1rem .32rem !important");
    expect(css).toContain("font-size: clamp(1.55rem, 2.6vw, 2.2rem) !important");
    expect(css).toContain("background-size: auto, auto, 48px 48px, 48px 48px, auto !important");
  });

  it("textures shared cards, popup primitives and ad-hoc bordered panels", () => {
    const css = source("src/styles/final-visual-system-157.css");
    for (const slot of [
      "card",
      "dialog-content",
      "alert-dialog-content",
      "sheet-content",
      "drawer-content",
      "popover-content",
      "dropdown-menu-content",
      "select-content",
      "command",
      "tabs-list",
    ]) {
      expect(css).toContain(`[data-slot=\"${slot}\"]`);
    }
    expect(css).toContain("background-size: auto, auto, 42px 42px, 42px 42px !important");
    expect(css).toContain(".rounded-lg, .rounded-xl, .rounded-2xl");
    expect(css).toContain(".tadeon-route-stage .tadeon-surface");
  });

  it("raises mobile motion while preserving reduced motion", () => {
    const css = source("src/styles/final-visual-system-157.css");
    expect(css).toContain("@keyframes tadeon-mobile-hero-enter-157");
    expect(css).toContain("@keyframes tadeon-mobile-surface-enter-157");
    expect(css).toContain("@keyframes tadeon-mobile-popup-enter-157");
    expect(css).toContain("@keyframes tadeon-mobile-dock-enter-157");
    expect(css).toContain("430ms");
    expect(css).toContain("390ms");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("ships a resizable same-origin audit lab covering phone tablet desktop and overlays", () => {
    const route = source("src/routes/visual-audit.tsx");
    const gallery = source("src/components/visual-audit/popup-gallery.tsx");
    for (const viewport of ["390", "430", "768", "820", "1024", "1366", "1440", "1920"]) {
      expect(route).toContain(`width: ${viewport}`);
    }
    expect(route).toContain("getBoundingClientRect");
    expect(route).toContain("scrollWidth");
    expect(route).toContain("rect.width < 40 || rect.height < 40");
    expect(route).toContain("<iframe");
    expect(route).toContain('"/visual-audit?gallery=1"');
    expect(route).toContain('<ProtectedShell requireRole="mestre">');
    expect(gallery).toContain("<Dialog");
    expect(gallery).toContain("<AlertDialog");
    expect(gallery).toContain("<Sheet");
    expect(gallery).toContain("<Popover>");
    expect(gallery).toContain("<Select");
  });
});
