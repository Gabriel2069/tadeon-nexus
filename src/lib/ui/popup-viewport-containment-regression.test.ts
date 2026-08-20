import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("popup viewport containment", () => {
  it("mantém Dialog/AlertDialog como filhos diretos do Portal e acima do overlay", () => {
    const dialog = source("src/components/ui/dialog.tsx");
    const alertDialog = source("src/components/ui/alert-dialog.tsx");
    const css = source("src/styles/tablet-popup-viewport-237.css");

    expect(dialog).not.toContain('data-slot="dialog-viewport"');
    expect(alertDialog).not.toContain('data-slot="alert-dialog-viewport"');
    expect(css).toContain('html[data-tadeon-popup-viewport="true"]');
    expect(css).toContain('z-index: 50 !important');
    expect(css).toContain('z-index: 60 !important');
    expect(css).toContain('z-index: 80 !important');
    expect(css).toContain('z-index: 90 !important');
    expect(css).toContain('backdrop-filter: none !important');
    expect(css).not.toContain('[data-slot="dialog-viewport"]');
    expect(css).not.toContain('[data-slot="alert-dialog-viewport"]');
  });

  it("centraliza o próprio Content na visualViewport e preserva rolagem", () => {
    const css = source("src/styles/tablet-popup-viewport-237.css");

    expect(css).toContain('top: var(--tadeon-vv-center-y) !important');
    expect(css).toContain('left: var(--tadeon-vv-center-x) !important');
    expect(css).toContain('transform: translate(-50%, -50%) !important');
    expect(css).toContain('var(--tadeon-vv-height) - var(--tadeon-popup-vv-gap-top)');
    expect(css).toContain('overflow-y: auto !important');
    expect(css).toContain('filter: none !important');
    expect(css).toContain('tadeon-popup-stable-in-251');
    expect(css).not.toContain('position: relative !important');
  });

  it("acompanha teclado/visualViewport e mantém o campo focado no scroller interno", () => {
    const bridge = source("src/components/visual-viewport-popup-bridge.tsx");

    expect(bridge).toContain('root.dataset.tadeonPopupViewport = "true"');
    expect(bridge).toContain("activeEditableInModal");
    expect(bridge).toContain("scrollContainerFor");
    expect(bridge).toContain("keepFocusedFieldVisible");
    expect(bridge).toContain("followVisualOffsets");
    expect(bridge).toContain("rawTop > 1");
    expect(bridge).toContain("for (const delay of [60, 140, 260, 420, 650, 900])");
    expect(bridge).toContain('window.visualViewport?.addEventListener("resize", schedule');
    expect(bridge).toContain('window.visualViewport?.addEventListener("scrollend", schedule');
    expect(bridge).toContain('document.addEventListener("focusin", settleAfterFocusChange');
    expect(bridge).not.toContain("isTabletViewport");
  });
});
