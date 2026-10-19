import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("ui polish 193/194/200", () => {
  it("keeps only the canonical top-right Setup launcher", () => {
    const deferred = read("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const canonical = read("src/components/tabletop/tabletop-smart-setup-bridge.tsx");
    const css = read("src/styles/tabletop-smart-setup.css");
    expect(deferred).not.toContain("SmartSetupLauncherDockBridge");
    expect(canonical).toContain('className="tadeon-smart-setup__launcher"');
    expect(css).toContain(".tadeon-smart-setup__launcher {");
    expect(css).toContain("position: fixed");
  });

  // NEX-026: WorkspaceActions tests verify the single manual session command.

});
