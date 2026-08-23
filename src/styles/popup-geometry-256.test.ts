import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("route-contained popup geometry", () => {
  const dialog = read("src/components/ui/dialog.tsx");
  const alertDialog = read("src/components/ui/alert-dialog.tsx");
  const frame = read("src/components/ui/route-popup-frame.ts");
  const geometry = read("src/styles/popup-geometry-256.css");
  const globalCss = read("src/styles.css");

  it("centers dialogs through a bounded positioner instead of translated coordinates", () => {
    expect(dialog).toContain('data-slot="dialog-positioner"');
    expect(alertDialog).toContain('data-slot="alert-dialog-positioner"');
    expect(geometry).toContain("align-items: center");
    expect(geometry).toContain("justify-items: center");
    expect(geometry).toContain("overflow: hidden");
    expect(geometry).toContain("position: relative !important");
    expect(geometry).toContain("--tadeon-popup-zero-translate: 0px");
    expect(geometry).toContain("var(--tadeon-popup-zero-translate) !important");
    expect(geometry).toContain("z-index: 120");
    expect(geometry).toContain("z-index: 80 !important");
    expect(geometry).toContain("z-index: 110 !important");
    expect(alertDialog).toContain('"fixed inset-0 z-50');
  });

  it("tracks the visual viewport and schedules ResizeObserver measurements", () => {
    expect(frame).toContain("window.visualViewport");
    expect(frame).toContain("window.requestAnimationFrame");
    expect(frame).toContain('"--tadeon-popup-viewport-height"');
  });

  it("keeps legacy translate centering away from contained dialogs", () => {
    expect(globalCss).toContain(
      '[data-slot="dialog-content"]:not([data-popup-contained="true"])',
    );
    expect(globalCss).toContain(
      '[data-slot="alert-dialog-content"]:not([data-popup-contained="true"])',
    );
  });
});
