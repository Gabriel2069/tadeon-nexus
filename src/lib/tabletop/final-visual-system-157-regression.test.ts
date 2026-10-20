import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("final visual system 157", () => {
  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/routes/__root.tsx", "src/styles/user-visible-repair-156.css", "src/styles/final-visual-system-157.css")).toBe(true);
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

  // NEX-026: shared PageHeader/explicit action behavior is verified at runtime.


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
      expect(css).toContain(`[data-slot="${slot}"]`);
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
    const routeTree = source("src/routeTree.gen.ts");
    const lab = source("src/components/visual-audit/responsive-audit-lab.tsx");
    const gallery = source("src/components/visual-audit/popup-gallery.tsx");
    for (const viewport of ["390", "430", "768", "820", "1024", "1366", "1440", "1920"]) {
      expect(lab).toContain(`width: ${viewport}`);
    }
    expect(lab).toContain("getBoundingClientRect");
    expect(lab).toContain("scrollWidth");
    expect(lab).toContain("const minTarget = viewportWidth <= 1024 ? 42 : 36");
    expect(lab).toContain("intersectionRatio");
    expect(lab).toContain('kind: "collision"');
    expect(lab).toContain('kind: "clipping"');
    expect(lab).toContain('kind: "motion"');
    expect(lab).toContain('kind: "blocker"');
    expect(lab).toContain("<iframe");
    expect(lab).toContain('"/visual-audit?gallery=1"');
    expect(route).toContain('<ProtectedShell requireRole="mestre">');
    expect(route).toContain('createFileRoute("/visual-audit")');
    expect(routeTree).toContain("VisualAuditRouteImport");
    expect(routeTree).toContain("'/visual-audit': typeof VisualAuditRoute");
    expect(gallery).toContain("<Dialog");
    expect(gallery).toContain("<AlertDialog");
    expect(gallery).toContain("<Sheet");
    expect(gallery).toContain("<Popover>");
    expect(gallery).toContain("<Select");
  });
});
