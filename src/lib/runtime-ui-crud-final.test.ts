import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("fechamento de UI, Mesa e exclusão", () => {
  it("não retransmite frames puramente visuais da Mesa para todos os bridges", () => {
    const runtime = source("src/lib/tabletop/tabletop-player-runtime.ts");

    expect(runtime).toContain("originalRender.call(this, notify);");
    expect(runtime).toContain("if (notify) dispatchRuntimeRender(this);");
  });

  it("abre a ficha individual em modo Jogo por padrão", () => {
    const bridge = source("src/components/sheet/sheet-experience-bridge.tsx");

    expect(bridge).toContain('if (queryMode() === "edit") return "edit";');
    expect(bridge).toContain('return stored === "edit" ? "edit" : "game";');
    expect(bridge).toContain('import "@/styles/sheet-individual-fit-final.css";');
  });

  it("mantém a aba do mestre sem navegar e remontar a rota", () => {
    const panel = source("src/routes/master-panel.tsx");

    expect(panel).toContain('window.sessionStorage.setItem("tadeon-master-active-tab", tab);');
    expect(panel).toContain("window.history.replaceState(");
    expect(panel).toContain("onValueChange={(value) => selectMasterTab(value as MasterTab)}");
  });

  it("expõe exclusão em Arquivos e no Nexus", () => {
    const assets = source("src/components/assets/asset-library-panel.tsx");
    const nexus = source("src/components/knowledge/nexus-workspace.tsx");

    expect(assets).toContain("Excluir arquivo");
    expect(assets).toContain("assetService.softDelete");
    expect(nexus).toContain("Excluir página");
    expect(nexus).toContain("knowledgeService.softDelete(target)");
  });

  it("contém os principais overlays dentro da viewport", () => {
    const popover = source("src/components/ui/popover.tsx");
    const select = source("src/components/ui/select.tsx");
    const dropdown = source("src/components/ui/dropdown-menu.tsx");
    const context = source("src/components/ui/context-menu.tsx");
    const viewport = source("src/styles/viewport-fit-final.css");

    expect(popover).toContain("collisionPadding={collisionPadding}");
    expect(select).toContain("collisionPadding={collisionPadding}");
    expect(dropdown).toContain("collisionPadding={collisionPadding}");
    expect(context).toContain("collisionPadding={collisionPadding}");
    expect(viewport).toContain('[data-slot="menubar-content"]');
    expect(viewport).toContain('[data-slot="tooltip-content"]');
  });
});
