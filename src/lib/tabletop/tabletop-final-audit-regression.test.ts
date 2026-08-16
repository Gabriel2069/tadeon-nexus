import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("auditoria final de runtime e viewport", () => {
  it("monta o renderer 3D de forma deferida para mestre e participante", () => {
    const deferred = source("src/components/tabletop/tabletop-deferred-enhancements.tsx");
    expect(deferred).toContain("TabletopNativeModelBridge");
    expect(deferred).toContain("<NativeModelBridge secureVisibility={!master} />");
    const director = source("src/components/tabletop/tabletop-director-entry.tsx");
    expect(director).toContain("<TabletopNativeModelBridge />");
  });

  it("não amplia visão 3D quando uma luz com sombras perde seu polígono autoritativo", () => {
    const visibility = source("src/lib/tabletop/tabletop-native-model-visibility.ts");
    expect(visibility).toContain("if (light.visibilityPolygon && light.visibilityPolygon.length >= 3)");
    expect(visibility).toContain("if (light.castsShadows) return \"\"");
    expect(visibility).toContain("state.fogStrokes");
    expect(visibility).toContain("stroke.operation === \"reveal\" ? \"white\" : \"black\"");
  });

  it("mantém o radial atual fora do modo limpo e de superfícies concorrentes", () => {
    const css = source("src/styles/interface-audit-final.css");
    expect(css).toContain('html[data-tadeon-tabletop-clean="true"] :where(');
    expect(css).toContain(".tadeon-radial-trigger");
    expect(css).toContain(".tadeon-radial-actions");
    expect(css).toContain('body:has(.tadeon-tabletop-panel[data-mobile-open="true"])');
    expect(css).toContain("visibility: hidden !important");
  });

  it("retira Placeables da borda compartilhada pelos docks em telas compactas", () => {
    const css = source("src/styles/interface-audit-final.css");
    expect(css).toContain("@media (max-width: 800px)");
    expect(css).toContain(".tadeon-placeables {");
    expect(css).toContain("top: calc(var(--tadeon-safe-top) + 3.6rem) !important");
    expect(css).toContain("bottom: auto !important");
    expect(css).toContain(".tadeon-placeables__panel {");
    expect(css).toContain("top: 3.15rem !important");
  });

  it("carrega a autoridade final depois das folhas anteriores", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain('import auditCss from "../styles/interface-audit-final.css?url"');
    const viewportIndex = root.indexOf('{ rel: "stylesheet", href: viewportCss }');
    const auditIndex = root.indexOf('{ rel: "stylesheet", href: auditCss }');
    expect(viewportIndex).toBeGreaterThan(-1);
    expect(auditIndex).toBeGreaterThan(viewportIndex);
  });

  it("oferece motion de ícones sem sobrescrever transformações locais", () => {
    const css = source("src/styles/interface-audit-final.css");
    expect(css).toContain("translate: 0 0");
    expect(css).toContain("scale: 1");
    expect(css).not.toContain("button:hover > svg:not(.animate-spin) {\n    transform:");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("mantém feedback legível e acima das superfícies da aplicação", () => {
    const css = source("src/styles/interface-audit-final.css");
    expect(css).toContain("--tadeon-z-toast: 320");
    expect(css).toContain(".tadeon-toast__title");
    expect(css).toContain("hsl(var(--popover-foreground))");
  });
});
