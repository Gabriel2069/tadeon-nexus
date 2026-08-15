import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("estabilidade final da Mesa Nexus", () => {
  it("mantem a rota segura para render no Worker e monta as pontes finais", () => {
    const route = source("src/routes/tabletop.tsx");
    const atmosphere = source("src/components/tabletop/tabletop-atmosphere-bridge.tsx");

    expect(atmosphere).not.toContain("useState<Point>({ x: window");
    expect(route).toContain("<TabletopAtmosphereBridge />");
    expect(route).toContain("<TabletopCreativeDockBridge />");
    expect(route).toContain("<TabletopDirectorEnhancementBridge />");
    expect(route).toContain("<TabletopPlaceablesInspectorBridge />");
  });

  it("nao volta ao autosave por clique e polling continuo", () => {
    const reliability = source("src/components/tabletop/tabletop-reliability-editor-bridge.tsx");
    const player = source("src/components/tabletop/tabletop-player-interaction-bridge.tsx");
    const dock = source("src/components/tabletop/tabletop-creative-dock-bridge.tsx");

    expect(reliability).not.toContain("button.click()");
    expect(reliability).not.toContain("setInterval(inspect");
    expect(reliability).toContain("tadeon-tabletop-autosave-state");
    expect(player).not.toContain("setInterval(syncSnapshot");
    expect(dock).not.toContain("setInterval(sync");
  });

  it("preserva grades avancadas e snapping pela malha real", () => {
    const workspace = source("src/components/tabletop/tabletop-workspace.tsx");
    const engine = source("src/lib/tabletop/tabletop-engine.ts");

    for (const mode of ["square", "hex_pointy", "hex_flat", "isometric", "none"]) {
      expect(workspace).toContain(`value=\"${mode}\"`);
    }
    expect(engine).toContain("snapPointToGrid(");
  });

  it("mantem movimento do jogador autorizado, persistente e sincronizado", () => {
    const participant = source("src/components/tabletop/tabletop-participant-workspace.tsx");
    const service = source("src/lib/tabletop/tabletop-participant-service.ts");
    const protocol = source("src/lib/tabletop/realtime-protocol.ts");

    expect(service).toContain("move_tabletop_controlled_entity");
    expect(participant).toContain("tadeon-tabletop-move-request");
    expect(protocol).toContain('type: z.literal("token.move-commit")');
  });
});
