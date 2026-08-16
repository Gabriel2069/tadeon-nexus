import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("roadmap de sofisticação da Mesa Nexus", () => {
  it("mantém setup inteligente assistido e deferido", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const setup = source("src/components/tabletop/tabletop-smart-setup-bridge.tsx");
    const analysis = source("src/lib/tabletop/tabletop-smart-setup.ts");
    expect(deferred).toContain("<SmartSetupBridge />");
    expect(setup).toContain("analyzeTabletopMap");
    expect(setup).toContain("tabletopVisibilityService.save");
    expect(analysis).toContain("localPeaks");
    expect(analysis).toContain("inferGrid");
    expect(analysis).toContain("MAX_SAMPLE_EDGE");
  });

  it("deriva cutaway de roof pela presença de tokens sem persistir a transição", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const roof = source("src/components/tabletop/tabletop-roof-foreground-bridge.tsx");
    expect(deferred).toContain("<RoofForegroundBridge />");
    expect(roof).toContain("entityIsBelowRoof");
    expect(roof).toContain('"roof_cutaway"');
    expect(roof).not.toContain("tabletopVisibilityService.save");
  });

  it("adapta qualidade por fps densidade dpr e memória", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const bridge = source("src/components/tabletop/tabletop-adaptive-performance-bridge.tsx");
    const policy = source("src/lib/tabletop/tabletop-adaptive-performance.ts");
    expect(deferred).toContain("<AdaptivePerformanceBridge />");
    expect(bridge).toContain("deviceMemory");
    expect(bridge).toContain("devicePixelRatio");
    expect(bridge).toContain("entityCount");
    expect(policy).toContain('"economy"');
    expect(policy).toContain('"cinematic"');
  });

  it("possui preflight com bloqueios avisos e fallback 3D", () => {
    const preflight = source("src/lib/tabletop/tabletop-preflight.ts");
    expect(preflight).toContain('"blocking"');
    expect(preflight).toContain("Realtime desabilitado");
    expect(preflight).toContain("3D sem WebGL2");
    expect(preflight).toContain("Portas secretas");
  });
});
