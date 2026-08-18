import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = readFileSync("src/routes/__root.tsx", "utf8");
const css = readFileSync("src/styles/dialog-monitor-fix-163.css", "utf8");
const monitor = readFileSync("src/lib/client-error-monitor.ts", "utf8");
const grid = readFileSync("src/lib/tabletop/grid-renderer.ts", "utf8");
const pixiSafety = readFileSync("src/lib/tabletop/pixi-destroy-safety.ts", "utf8");

describe("dialog and monitoring fix 163", () => {
  it("loads the create-sheet containment after visual authority 162", () => {
    expect(root).toContain(
      'import dialogMonitorFix163Css from "../styles/dialog-monitor-fix-163.css?url"',
    );
    expect(root.indexOf("navSheetSearchPolish162Css")).toBeLessThan(
      root.indexOf("dialogMonitorFix163Css"),
    );
    expect(root.indexOf("href: navSheetSearchPolish162Css")).toBeLessThan(
      root.indexOf("href: dialogMonitorFix163Css"),
    );
  });

  it("locks only the create-sheet dialog to safe viewport geometry", () => {
    expect(css).toContain('[data-slot="dialog-content"]:has(#sheet-name)');
    expect(css).toContain("top: 50dvh !important");
    expect(css).toContain("right: var(--tadeon-create-inline-end) !important");
    expect(css).toContain("left: var(--tadeon-create-inline-start) !important");
    expect(css).toContain("transform: translateY(-50%) !important");
    expect(css).toContain("overflow-y: auto !important");
    expect(css).not.toContain(':has(> [data-slot="command"])');
  });

  it("adds actionable diagnostics without changing the error table schema", () => {
    expect(monitor).toContain("sanitizeClientErrorStack");
    expect(monitor).toContain("...(stack ? { stack } : {})");
    expect(monitor).toContain("VITE_APP_COMMIT_SHA");
    expect(monitor).toContain("devicePixelRatio");
    expect(monitor).toContain("navigator.userAgent");
    expect(monitor).toContain('context: {');
  });

  it("prevents recursive Pixi Graphics context destruction", () => {
    expect(grid).toContain('import "./pixi-destroy-safety"');
    expect(grid).toContain("this.view.removeFromParent()");
    expect(pixiSafety).toContain("if (this.destroyed) return");
    expect(pixiSafety).toContain("destroyGraphics.apply(this, args)");
    expect(pixiSafety).toContain("__tadeonDestroyGuardInstalled");
  });
});
