import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("popup viewport containment", () => {
  it("mantém wrappers inertes fora do tablet e estruturais no tablet", () => {
    const dialog = source("src/components/ui/dialog.tsx");
    const alertDialog = source("src/components/ui/alert-dialog.tsx");
    const css = source("src/styles/tablet-popup-viewport-237.css");

    expect(dialog).toContain('data-slot="dialog-viewport"');
    expect(alertDialog).toContain('data-slot="alert-dialog-viewport"');
    expect(css).toContain('[data-slot="dialog-viewport"]');
    expect(css).toContain('[data-slot="alert-dialog-viewport"]');
    expect(css).toContain("position: relative !important");
    expect(css).toContain("max-height: 100% !important");
    expect(css).toContain("pointer-events: none !important");
    expect(css).toContain("pointer-events: auto !important");
  });

  it("detecta iPad em split view e neutraliza offset residual do Safari", () => {
    const bridge = source("src/components/visual-viewport-popup-bridge.tsx");

    expect(bridge).toContain("iPadLike");
    expect(bridge).toContain("coarseTouch");
    expect(bridge).toContain("heightLoss");
    expect(bridge).toContain("keyboardThreshold");
    expect(bridge).toContain("const top = keyboardOpen || zoomed ? rawTop : 0");
    expect(bridge).toContain('window.visualViewport?.addEventListener("scrollend", schedule');
  });
});
