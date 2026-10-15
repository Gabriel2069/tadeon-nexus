import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
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


  it("places session save as a sibling immediately above the metrics strip", () => {
    const bridge = read("src/components/master/master-toolbar-popout-bridge.tsx");
    expect(bridge).toContain("parent.insertBefore(portalHost, metrics)");
    expect(bridge).toContain('rpc("save_session_sheet_changes")');
  });
});
