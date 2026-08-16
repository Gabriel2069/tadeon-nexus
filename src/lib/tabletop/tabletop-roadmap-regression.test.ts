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
    expect(analysis).toContain("extractRuns");
    expect(analysis).toContain("inferOpenings");
    expect(analysis).toContain("inferRoofs");
    expect(analysis).toContain("MAX_SAMPLE_EDGE");
  });

  it("deriva cutaway de roof pela presença de tokens sem persistir a transição", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const roof = source("src/components/tabletop/tabletop-roof-foreground-bridge.tsx");
    expect(deferred).toContain("<RoofForegroundBridge />");
    expect(roof).toContain("entityIsBelowRoof");
    expect(roof).toContain('"roof_cutaway"');
    expect(roof).toContain("derivedSignature");
    expect(roof).toContain("requestAnimationFrame(paintFrame)");
    expect(roof).not.toContain("tabletopVisibilityService.save");
  });

  it("adapta qualidade por fps densidade dpr memória e orçamento LRU real", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const bridge = source("src/components/tabletop/tabletop-adaptive-performance-bridge.tsx");
    const policy = source("src/lib/tabletop/tabletop-adaptive-performance.ts");
    const textures = source("src/lib/tabletop/texture-manager.ts");
    expect(deferred).toContain("<AdaptivePerformanceBridge />");
    expect(bridge).toContain("deviceMemory");
    expect(bridge).toContain("devicePixelRatio");
    expect(bridge).toContain("entityCount");
    expect(bridge).toContain("configureTabletopTextureBudget");
    expect(policy).toContain('"economy"');
    expect(policy).toContain('"cinematic"');
    expect(textures).toContain("budgetBytes");
    expect(textures).toContain("!this.activeUrls.has(entry.url)");
    expect(textures).toContain("Assets.unload(entry.url)");
  });

  it("compõe e reutiliza máscaras de visibilidade sem ampliar luz sombreada", () => {
    const compositor = source("src/lib/tabletop/tabletop-visibility-compositor.ts");
    const native = source("src/lib/tabletop/tabletop-native-model-visibility.ts");
    expect(compositor).toContain("buildTabletopVisibilityFrame");
    expect(compositor).toContain("cachedTabletopVisibilityMask");
    expect(compositor).toContain("MAX_MASK_CACHE");
    expect(native).toContain("buildTabletopVisibilityFrame(state)");
    expect(native).toContain("cachedTabletopVisibilityMask");
    expect(native).toContain("if (light.castsShadows) return \"\"");
  });

  it("monta preflight imediatamente, diagnostica a sessão e permite cancelar sem erro falso", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    const bridge = source("src/components/tabletop/tabletop-preflight-bridge.tsx");
    const live = source("src/components/tabletop/tabletop-live-session.tsx");
    const preflight = source("src/lib/tabletop/tabletop-preflight.ts");
    expect(deferred).toContain('import { TabletopPreflightBridge }');
    expect(deferred).toContain("{master && <TabletopPreflightBridge />}");
    expect(deferred).not.toContain("const PreflightBridge = lazy");
    expect(bridge).toContain("tabletopSessionService.openSession =");
    expect(bridge).toContain('new DOMException("Abertura da sessão cancelada no preflight.", "AbortError")');
    expect(live).toContain('error.name === "AbortError"');
    expect(live).toContain("if (isCancelledOperation(error)) return;");
    expect(preflight).toContain('"blocking"');
    expect(preflight).toContain("Realtime desabilitado");
    expect(preflight).toContain("3D sem WebGL2");
    expect(preflight).toContain("Portas secretas");
  });

  it("preserva vínculos ao arrastar Assets Nexus para a Mesa", () => {
    const payload = source("src/lib/tabletop/tabletop-asset-flow.ts");
    const drop = source("src/components/tabletop/tabletop-unified-drop-bridge.tsx");
    const tile = source("src/components/assets/asset-tile.tsx");
    expect(payload).toContain("application/x-tadeon-unified-item");
    expect(payload).toContain("linkedKnowledgeNodeId");
    expect(payload).toContain("linkedSheetId");
    expect(drop).toContain("clientToWorld");
    expect(drop).toContain("addEntityAt");
    expect(tile).toContain("TADEON_UNIFIED_DRAG_MIME");
  });

  it("mantém os novos painéis dentro da viewport, abaixo dos dialogs e sem competição", () => {
    const setupCss = source("src/styles/tabletop-smart-setup.css");
    const preflightCss = source("src/styles/tabletop-preflight.css");
    const dropCss = source("src/styles/tabletop-unified-flow.css");
    expect(setupCss).toContain("z-index: 218");
    expect(setupCss).not.toContain("z-index: 246");
    expect(setupCss).toContain("env(safe-area-inset-top)");
    expect(setupCss).toContain('body:has(.tadeon-smart-setup[data-open="true"])');
    expect(setupCss).toContain('body:has(.tadeon-placeables[data-open="true"])');
    expect(preflightCss).toContain("max-height:min(66dvh,42rem)");
    expect(dropCss).toContain('@media (prefers-reduced-motion:reduce)');
  });
});
