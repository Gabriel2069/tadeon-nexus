import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("acabamento transversal solicitado", () => {
  // NEX-024: collapsed rail geometry is exercised in verify-dashboard-design.mjs.


  it("normaliza a largura de Backup, Usuários e Consulta offline", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    expect(css).toContain(".tadeon-route-tools,.tadeon-route-users,.tadeon-route-offline");
    expect(css).toContain("max-width:min(92rem,100%) !important");
  });

  it("mantém superfícies grandes da Mesa contidas e mutuamente exclusivas", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    expect(css).toContain(".tadeon-region-automation");
    expect(css).toContain("body:has(.tadeon-director-remote)");
    expect(css).toContain(".tadeon-tactical-dock__power-list");
    expect(css).toContain("visibility:hidden !important");
    expect(css).toContain("max-height:calc(100dvh");
  });

  it("refina condições, barras, botão Mesa e vínculos da ficha", () => {
    const css = source("src/styles/interface-final-user-polish.css");
    const bridge = source("src/components/experience-final-polish-bridge.tsx");
    expect(css).toContain('[data-tadeon-sheet-tabletop-action="true"]');
    expect(css).toContain('[data-condition-severity="critical"]');
    expect(css).toContain("--condition-glow-opacity");
    expect(css).toContain("#equilibrio,#exposicao");
    // NEX-025: link disclosure is controlled/tested in SheetIdentitySection.
    expect(source("src/routes/sheet.$id.tsx")).toContain("conditionChipPresentation");
    expect(bridge).toContain("Modificadores não consomem PE.");
  });
});
