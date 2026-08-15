import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Mesa floating chrome regression", () => {
  it("measures the real tabletop stage instead of guessing panel offsets", () => {
    const bridge = source(
      "src/components/tabletop/tabletop-progressive-interface-bridge.tsx",
    );

    expect(bridge).toContain('getBoundingClientRect()');
    expect(bridge).toContain('new ResizeObserver(syncStageGeometry)');
    expect(bridge).toContain('"--tadeon-tabletop-stage-center"');
    expect(bridge).toContain('"--tadeon-tabletop-stage-width"');
    expect(bridge).toContain('"--tadeon-tabletop-stage-right"');
  });

  it("uses valid opaque theme surfaces and stage geometry for floating chrome", () => {
    const finish = source("src/styles/tabletop-spatial-finish.css");

    expect(finish).toContain("var(--tadeon-tabletop-stage-center, 50%)");
    expect(finish).toContain("var(--tadeon-tabletop-stage-width, 100vw)");
    expect(finish).toContain("var(--tadeon-tabletop-stage-right, 0px)");
    expect(finish).toContain("var(--card)");
    expect(finish).toContain("color-mix(in srgb, var(--card) 92%, var(--background))");
    expect(finish).not.toContain("background: hsl(var(--card))");
    expect(finish).toContain('body:has(.tadeon-tabletop-context-menu)');
    expect(finish).toContain(
      '.tadeon-tabletop-selection-dock[aria-label="Ações rápidas da seleção"]',
    );
  });
});

describe("Nexus graph expansion regression", () => {
  it("keeps fit and fullscreen expansion as separate actions", () => {
    const graph = source("src/components/knowledge/knowledge-graph.tsx");

    expect(graph).toContain("const [expanded, setExpanded] = useState(false)");
    expect(graph).toContain('expanded ? "Reduzir grafo" : "Ampliar grafo"');
    expect(graph).toContain("<Minimize2");
    expect(graph).toContain("fixed inset-2 z-[220]");
    expect(graph).toContain('document.body.style.overflow = "hidden"');
    expect(graph).toContain('onClick={fitGraph} aria-label="Reenquadrar grafo"');
  });
});
