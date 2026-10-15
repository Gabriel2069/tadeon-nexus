import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("navigation real SVG parity 160", () => {
  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/routes/__root.tsx", "src/styles/focus-header-nav-parity-159.css", "src/styles/navigation-real-svg-parity-160.css")).toBe(true);
  });

  it("keeps real React SVGs in AppLayout for Master and Backup", () => {
    const layout = source("src/components/app-layout.tsx");
    expect(layout).toContain('to="/master-panel"');
    expect(layout).toContain('<SectionSymbol section="master" className="w-4 h-4" />');
    expect(layout).toContain('<SectionSymbol section="master" className="h-5 w-5" />');
    expect(layout).toContain('to="/nexus-tools"');
    expect(layout).toContain('<SectionSymbol section="tools" className="w-4 h-4" />');
  });


});
