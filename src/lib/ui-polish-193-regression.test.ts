import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ui polish 193/194", () => {
  it("keeps setup independent from the contextual-panel collapse control", () => {
    const bridge = read("src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx");
    expect(bridge).toContain('.tadeon-tabletop-canvas-host');
    expect(bridge).toContain('canvas.insertAdjacentElement("afterend", portalHost)');
    expect(bridge).not.toContain('button[aria-label="Recolher painel contextual"]');
    expect(bridge).not.toContain("insertBefore(portalHost, minimize)");
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
