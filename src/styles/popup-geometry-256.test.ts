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

  it("centers dialogs through a bounded positioner instead of translated coordinates", () => {
    expect(dialog).toContain('data-slot="dialog-positioner"');
    expect(alertDialog).toContain('data-slot="alert-dialog-positioner"');
    expect(geometry).toContain("place-items: center");
    expect(geometry).toContain("overflow: hidden");
    expect(geometry).toContain("position: relative !important");
  });

  it("tracks the visual viewport and schedules ResizeObserver measurements", () => {
    expect(frame).toContain("window.visualViewport");
    expect(frame).toContain("window.requestAnimationFrame");
    expect(frame).toContain('"--tadeon-popup-viewport-height"');
  });
});
