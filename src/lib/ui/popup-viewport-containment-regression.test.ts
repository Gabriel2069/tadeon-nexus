import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("popup viewport containment", () => {
  it("centraliza Dialog e AlertDialog dentro da visual viewport em qualquer aparelho", () => {
    const dialog = source("src/components/ui/dialog.tsx");
    const alertDialog = source("src/components/ui/alert-dialog.tsx");
    const css = source("src/styles/tablet-popup-viewport-237.css");

    expect(dialog).toContain('data-slot="dialog-viewport"');
    expect(alertDialog).toContain('data-slot="alert-dialog-viewport"');
    expect(css).toContain('html[data-tadeon-popup-viewport="true"]');
    expect(css).toContain('[data-slot="dialog-viewport"]');
    expect(css).toContain('[data-slot="alert-dialog-viewport"]');
    expect(css).toContain("align-items: center !important");
    expect(css).toContain("justify-content: center !important");
    expect(css).toContain("position: relative !important");
    expect(css).toContain("max-height: 100% !important");
    expect(css).toContain("overflow-y: auto !important");
    expect(css).not.toContain('data-tadeon-tablet-popup="true"');
  });

  it("acompanha teclado/visualViewport e mantém o campo focado dentro do scroller do modal", () => {
    const bridge = source("src/components/visual-viewport-popup-bridge.tsx");

    expect(bridge).toContain('root.dataset.tadeonPopupViewport = "true"');
    expect(bridge).toContain("activeEditableInModal");
    expect(bridge).toContain("scrollContainerFor");
    expect(bridge).toContain("keepFocusedFieldVisible");
    expect(bridge).toContain("keyboardThreshold");
    expect(bridge).toContain("for (const delay of [80, 180, 320, 520, 800])");
    expect(bridge).toContain('window.visualViewport?.addEventListener("resize", schedule');
    expect(bridge).toContain('window.visualViewport?.addEventListener("scrollend", schedule');
    expect(bridge).toContain('document.addEventListener("focusin", settleAfterFocusChange');
    expect(bridge).not.toContain("isTabletViewport");
  });
});
