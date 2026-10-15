import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("master panel navigation fit 185/186", () => {
  it("loads the final fit authority after workspace polish", () => {
    const component = source("src/components/master/master-panel-navigation.tsx");
    const base = component.indexOf('import "@/styles/workspace.css"');
    const fit = component.indexOf('import "@/styles/master-panel-navigation.css"');
    expect(base).toBeGreaterThan(-1);
    expect(fit).toBeGreaterThan(base);
  });



});
