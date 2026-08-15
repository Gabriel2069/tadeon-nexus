import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("integração e ferramentas inteligentes da Mesa Nexus", () => {
  it("mantem Mesa, Nexus e Ficha ligados nos dois sentidos", () => {
    const tabletopRoute = source("src/routes/tabletop.tsx");
    const nexusRoute = source("src/routes/nexus.tsx");
    const bridge = source("src/components/tabletop/tabletop-integration-tools-bridge.tsx");

    expect(tabletopRoute).toContain("<TabletopIntegrationToolsBridge />");
    expect(tabletopRoute).toContain("<TabletopLocateBridge />");
    expect(nexusRoute).toContain("<NexusTabletopLocator nodeId={node} />");
    expect(bridge).toContain("knowledgeService.create");
    expect(bridge).toContain("linkedKnowledgeNodeId");
    expect(bridge).toContain("setNodeAccess");
  });

  it("explica bloqueios de visão com arquitetura, regiões e luz", () => {
    const bridge = source("src/components/tabletop/tabletop-integration-tools-bridge.tsx");

    expect(bridge).toContain("structureChannels");
    expect(bridge).toContain("visionTransmission");
    expect(bridge).toContain("tabletopRegionsAtPoint");
    expect(bridge).toContain("globalIllumination");
  });

  it("faz snapping por malha e por geometria da cena", () => {
    const engine = source("src/lib/tabletop/tabletop-engine.ts");

    expect(engine).toContain("snapPointToGrid");
    expect(engine).toContain("pointCandidates");
    expect(engine).toContain("visibilityState.walls");
    expect(engine).toContain("visibilityState.lights");
    expect(engine).toContain("entity.x + entity.width / 2");
  });

  it("mantem conversão de traços em arquitetura acessível no motor", () => {
    const engine = source("src/lib/tabletop/tabletop-engine.ts");

    expect(engine).toContain("createStructuresFromSelectedDrawing");
    expect(engine).toContain("readTabletopDrawingPoints");
    expect(engine).toContain("onCreateStructure?.({ start: previous, end: current })");
  });
});
