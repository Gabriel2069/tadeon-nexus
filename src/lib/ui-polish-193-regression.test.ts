import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ui polish 193/194", () => {
  it("keeps setup before collapse and targets the actual toprail classes", () => {
    const bridge = read("src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx");
    const css = read("src/styles/ui-coherence-192.css");
    expect(bridge).toContain("insertBefore(portalHost, minimize)");
    expect(css).toContain(".tadeon-tabletop-toprail-setup");
    expect(css).toContain(".tadeon-tabletop-toprail-toggle");
    expect(css).toContain("order: 1 !important");
    expect(css).toContain("order: 2 !important");
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
