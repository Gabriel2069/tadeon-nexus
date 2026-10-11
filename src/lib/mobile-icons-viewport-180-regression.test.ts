import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile icons and visual viewport 180/184", () => {
  it("uses the authored Backup symbol in the circular More menu", () => {
    const bridge = source("src/components/mobile-more-radial-bridge.tsx");
    expect(bridge).toContain("function BackupDiagnosticsGlyph");
    expect(bridge).toContain('d="M21 8a2 2 0 0 0-2-2h-2V4');
    expect(bridge).toContain('{ to: "/offline", label: "Offline", icon: CloudOff');
    expect(bridge).toContain('{ to: "/manage-users", label: "Usuários", icon: Users');
    expect(bridge).toContain('{ to: "/nexus-tools", label: "Backup", icon: BackupDiagnosticsGlyph');
    expect(bridge).not.toContain("CloudOff, Users, Wrench, X");
  });

  it("replaces only the mobile Master Lightbulb artwork while preserving the canonical SVG slot", () => {
    const bridge = source("src/components/mobile-more-radial-bridge.tsx");
    const css = source("src/styles/mobile-viewport-final-180.css");
    expect(bridge).toContain("function syncMasterDockGlyph()");
    expect(bridge).toContain('href="/master-panel"] > svg');
    expect(bridge).toContain('svg.dataset.tadeonPanelGlyph = "true"');
    expect(bridge).toContain('svg.setAttribute("viewBox", "1.4 1.4 21.2 21.2")');
    expect(css).toContain('.tadeon-mobile-dock .tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain("width: 1.25rem !important");
    expect(css).toContain("height: 1.25rem !important");
    expect(css).toContain("transform: translateY(-1px) !important");
    expect(css).toContain('.tadeon-mobile-dock .tadeon-mobile-dock__item[href="/master-panel"][aria-current="page"]::after');
  });

  it("mounts a single viewport owner at the root across shell transitions", () => {
    const root = source("src/routes/__root.tsx");
    const shell = source("src/components/protected-shell.tsx");
    const radial = source("src/components/mobile-more-radial-bridge.tsx");
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
