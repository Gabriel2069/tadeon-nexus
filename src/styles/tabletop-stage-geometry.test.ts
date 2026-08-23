import { readFileSync } from "node:fs";
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

  it("keeps header, stage and contextual panel as three sibling zones", () => {
    expect(workspace).toContain("tadeon-tabletop-studio__header");
    expect(workspace).toContain("tadeon-tabletop-stage");
    expect(workspace).toContain("tadeon-tabletop-panel");
    expect(workspace).toContain("data-tabletop-stage-portal");
    expect(workspace).toContain(
      "min-[768px]:grid-cols-[minmax(0,1fr)_3.75rem]",
    );
    expect(workspace).toContain("min-[768px]:grid-cols-[minmax(0,1fr)_23rem]");
  });

  it("loads the stage-local authority after the legacy tactical sheet", () => {
    const legacy = route.indexOf("tabletop-fixed-menus-tactical-240.css");
    const local = route.indexOf("tabletop-stage-geometry-254.css");
    expect(legacy).toBeGreaterThan(-1);
    expect(local).toBeGreaterThan(legacy);
  });

  it("does not hard-lock Mesa chrome to viewport coordinates", () => {
    expect(layoutBridge).not.toContain("hardLockCoreChrome");
    expect(layoutBridge).not.toContain("--tadeon-tabletop-stage-fixed-");
    expect(geometry).not.toContain("position: fixed");
    expect(geometry).toMatch(
      /\.tadeon-tabletop-overlay-layer\s*>\s*\.tadeon-tabletop-progressive-dock/,
    );
    expect(geometry).toMatch(
      /\.tadeon-tabletop-overlay-layer\s*>\s*\.tadeon-tabletop-reliability-strip/,
    );
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
});
