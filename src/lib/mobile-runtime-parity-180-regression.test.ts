import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile runtime parity 180", () => {
  it("keeps the authored Master mark inside the real mobile dock SVG slot", () => {
    const css = source("src/styles/mobile-runtime-parity-180.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain("width: 1.25rem !important");
    expect(css).toContain("height: 1.25rem !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"]::before');
    expect(css).toContain("content: none !important");
    expect(css).toContain('stroke-dasharray=\'9 3.4 2.2 4.3\'');
  });

  it("uses the original hidden-route marks in the More radial menu", () => {
    const bridge = source("src/components/mobile-more-radial-bridge.tsx");
    const css = source("src/styles/mobile-runtime-parity-180.css");
    expect(bridge).toContain("icon: CloudOff");
    expect(bridge).toContain("icon: Users");
    expect(css).toContain('.tadeon-mobile-more-radial__item[href="/nexus-tools"] > svg');
    expect(css).toContain("M21 8a2 2 0 0 0-2-2h-2V4");
  });

  it("publishes visualViewport bounds and follows virtual keyboard changes", () => {
    const viewport = source("src/components/visual-viewport-bridge.tsx");
    expect(viewport).toContain("window.visualViewport");
    expect(viewport).toContain('root.style.setProperty("--tadeon-vv-height"');
    expect(viewport).toContain('root.dataset.tadeonKeyboard = keyboardInset > 120 ? "open" : "closed"');
    expect(viewport).toContain('viewport?.addEventListener("resize", sync)');
    expect(viewport).toContain('document.addEventListener("focusin", keepFocusedControlVisible)');
  });

  it("mounts keyboard protection in normal and dedicated protected shells", () => {
    const shell = source("src/components/protected-shell.tsx");
    expect(shell).toContain('import { VisualViewportBridge } from "@/components/visual-viewport-bridge"');
    expect(shell).toContain("<VisualViewportBridge />");
    expect(shell.indexOf("<VisualViewportBridge />")).toBeLessThan(shell.indexOf("{!dedicated && ("));
  });

  it("keeps Create Sheet and shared overlays inside the visible keyboard-safe area", () => {
    const dashboard = source("src/routes/index.tsx");
    const css = source("src/styles/mobile-runtime-parity-180.css");
    expect(dashboard).toContain("<DialogContent>");
    expect(dashboard).toContain("Criar ficha");
    expect(css).toContain('[data-slot="dialog-content"]');
    expect(css).toContain("var(--tadeon-vv-center-x, 50vw)");
    expect(css).toContain("var(--tadeon-vv-height, 100dvh)");
    expect(css).toContain('html[data-tadeon-keyboard="open"] [data-slot="select-content"]');
    expect(css).toContain('html[data-tadeon-keyboard="open"] [data-slot="sheet-content"]');
  });
});
