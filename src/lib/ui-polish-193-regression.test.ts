import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("ui polish 193", () => {
  it("keeps setup docked before collapse and above it in stacking", () => {
    const bridge = read("src/components/tabletop/tabletop-smart-setup-launcher-dock-bridge.tsx");
    const css = read("src/styles/ui-coherence-192.css");
    expect(bridge).toContain("insertBefore(portalHost, minimize)");
    expect(css).toContain("z-index: 6 !important");
    expect(css).toContain("z-index: 7");
  });

  it("renders only one master navigation surface", () => {
    const css = read("src/styles/ui-coherence-192.css");
    expect(css).toContain('.tadeon-master-navigation__rail > [data-slot="tabs-list"]');
    expect(css).toContain("border: 0 !important");
    expect(css).toContain("box-shadow: none !important");
  });

  it("places session save above the Pistas/Dobras/Iniciativa strip", () => {
    const bridge = read("src/components/master/master-toolbar-popout-bridge.tsx");
    expect(bridge).toContain("metrics.prepend(portalHost)");
    expect(bridge).toContain('rpc("save_session_sheet_changes")');
  });
});
