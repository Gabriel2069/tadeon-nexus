import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ui polish 193/194/200", () => {
  it("keeps only the canonical top-right Setup launcher", () => {
    const duplicateBridge = read("src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx");
    const canonical = read("src/components/tabletop/tabletop-smart-setup-bridge.tsx");
    const css = read("src/styles/tabletop-smart-setup.css");
    expect(duplicateBridge).toContain("return null");
    expect(duplicateBridge).not.toContain("position: \"fixed\"");
    expect(canonical).toContain('className="tadeon-smart-setup__launcher"');
    expect(css).toContain(".tadeon-smart-setup__launcher {");
    expect(css).toContain("position: fixed");
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
