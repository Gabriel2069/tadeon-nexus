import { isStyleLoadedAfter } from "@/test/read-foundation-source";
import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("Mesa stage-local geometry", () => {
  const workspace = read("src/components/tabletop/tabletop-workspace.tsx");
  const route = read("src/components/tabletop/tabletop-route-experience.tsx");
  const layoutBridge = read(
    "src/components/tabletop/tabletop-floating-layout-bridge.tsx",
  );
  const geometry = read("src/styles/tabletop-stage-geometry-254.css");

  it("mantém a ordem das regras na cascata consolidada", () => {
    expect(isStyleLoadedAfter("src/components/tabletop/tabletop-route-experience.tsx", "src/styles/tabletop-fixed-menus-tactical-240.css", "src/styles/tabletop-stage-geometry-254.css")).toBe(true);
  });

  it("keeps map, west rail and bottom status in distinct local rectangles", () => {
    expect(geometry).toContain("--tadeon-tabletop-map-left");
    expect(geometry).toContain("--tadeon-tabletop-map-bottom");
    expect(geometry).toMatch(
      /\.tadeon-tabletop-stage\s*>\s*\.tadeon-tabletop-canvas-host/,
    );
    expect(geometry).toMatch(
      /\.tadeon-tabletop-stage\s*>\s*\.tadeon-tabletop-canvas-rail/,
    );
    expect(geometry).toMatch(
      /\.tadeon-tabletop-stage\s*>\s*\.tadeon-tabletop-stage-status/,
    );
  });

  it("centers structure selection below reliability inside the live map width", () => {
    expect(geometry).toContain(
      "> .tadeon-tabletop-selection-dock--structure",
    );
    expect(geometry).toContain(
      "var(--tadeon-tabletop-reliability-h, 2.8rem) + 0.55rem",
    );
    expect(geometry).toContain("transform: translateX(-50%) !important");
  });

  it("centers every construction and selection shelf below reliability", () => {
    expect(geometry).toContain(
      "> :is(.tadeon-tabletop-tool-options, .tadeon-tabletop-selection-dock)",
    );
    expect(geometry).toContain(
      ".tadeon-tabletop-stage:has(> .tadeon-tabletop-tool-options)",
    );
    expect(geometry).toContain(
      "> .tadeon-tabletop-selection-dock",
    );
    expect(geometry).toContain(
      "var(--tadeon-tabletop-reliability-h, 2.8rem) + 4.35rem",
    );
  });

  it("gives mobile tools a dedicated shelf outside the interactive map", () => {
    expect(geometry).toContain("--tadeon-tabletop-mobile-rail-h");
    expect(geometry).toContain("--tadeon-tabletop-map-top: calc(");
    expect(geometry).toContain("scroll-snap-type: x proximity");
    expect(workspace).toContain("tadeon-tabletop-mobile-tools-toggle");
    expect(workspace).toContain('data-mobile-open={mobileToolsOpen ? "true" : "false"}');
  });
});
