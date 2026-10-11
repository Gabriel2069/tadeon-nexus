import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile icons and visual viewport 180/184", () => {
  it("mounts a single viewport owner at the root across shell transitions", () => {
    const root = source("src/routes/__root.tsx");
    const shell = source("src/components/protected-shell.tsx");
    const radial = source("src/components/mobile-more-menu.tsx");
    expect(root).toContain("<VisualViewportPopupBridge />");
    expect(shell).not.toContain("<VisualViewportBridge />");
    expect(radial).not.toContain("function useVisualViewportContract()");
  });

  it("pins Create Sheet and keyboard-open dialogs inside the visible viewport", () => {
    const css = source("src/styles/mobile-viewport-final-180.css");
    expect(css).toContain('[data-slot="dialog-content"]:has(#sheet-name)');
    expect(css).toContain('html[data-tadeon-keyboard-open="true"] [data-slot="dialog-content"]');
    expect(css).toContain("left: var(--tadeon-vv-center-x, 50vw) !important");
    expect(css).toContain("var(--tadeon-vv-height, 100dvh)");
    expect(css).toContain("transform: translateX(-50%) !important");
    expect(css).toContain('[data-slot="select-content"]');
    expect(css).toContain('[data-slot="popover-content"]');
    expect(css).toContain('[data-slot="dropdown-menu-content"]');
  });
});
