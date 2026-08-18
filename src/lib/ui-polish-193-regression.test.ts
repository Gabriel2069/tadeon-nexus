import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ui polish 193/194/199", () => {
  it("keeps setup permanently fixed and independent from DOM hosts", () => {
    const bridge = read("src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx");
    expect(bridge).toContain('position: "fixed"');
    expect(bridge).toContain("zIndex: 60");
    expect(bridge).not.toContain("createPortal");
    expect(bridge).not.toContain("MutationObserver");
    expect(bridge).not.toContain("querySelector");
    expect(bridge).not.toContain('button[aria-label="Recolher painel contextual"]');
  });

  it("renders the scroller as the only master navigation surface", () => {
    const css = read("src/styles/ui-coherence-192.css");
    expect(css).toContain(".tadeon-master-navigation {");
    expect(css).toContain("display: contents !important");
    expect(css).toContain(".tadeon-master-navigation__scroller");
    expect(css).toContain('.tadeon-master-navigation__rail > [data-slot="tabs-list"]');
  });

  it("places session save as a sibling immediately above the metrics strip", () => {
    const bridge = read("src/components/master/master-toolbar-popout-bridge.tsx");
    expect(bridge).toContain("parent.insertBefore(portalHost, metrics)");
    expect(bridge).toContain('rpc("save_session_sheet_changes")');
  });
});
