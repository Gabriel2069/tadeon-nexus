import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

// Superseded mask/frame assertions are covered by master-workspace behavior and browser checks.
describe("final icon and route parity 174/176", () => {
  it("keeps the authored Mesa favicon and navigation symbol", () => {
    const layout = source("src/components/app-layout.tsx");
    const symbols = source("src/components/section-symbols.tsx");
    const favicon = source("public/favicons/tabletop.svg");
    expect(layout).toContain('<SectionSymbol section="tabletop"');
    expect(layout).not.toContain("MapPinned");
    expect(symbols).toContain("export function TabletopSigil");
    expect(symbols).toContain("M18 28 38 20l20 8 20-8v48l-20 8-20-8-20 8Z");
    expect(favicon).toContain("M18 28 38 20l20 8 20-8v48l-20 8-20-8-20 8Z");
  });




  it("does not treat Backup as a Nexus child route in either navigation surface", () => {
    const layout = source("src/components/app-layout.tsx");
    expect(layout).toContain('const isNexusRoute = path === "/nexus" || path.startsWith("/nexus/")');
    expect(layout).toContain("const knowledgeEnabled = navigationFlags.knowledge || isNexusRoute");
    expect(layout).toContain("active={isNexusRoute}");
    expect(layout).toContain('aria-current={isNexusRoute ? "page" : undefined}');
    expect(layout).not.toContain('active={path.startsWith("/nexus")}');
    expect(layout).not.toContain('aria-current={path.startsWith("/nexus") ? "page" : undefined}');
  });
});
