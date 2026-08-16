import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("auditoria funcional transversal", () => {
  it("mantém autosave ligado à versão mais recente da cena", () => {
    const workspace = source("src/components/tabletop/tabletop-workspace.tsx");
    expect(workspace).toContain("const saveCurrent = useCallback(async (");
    expect(workspace).toContain("[editable, loadSnapshots, refreshScenes, snapshot.scene]");
    expect(workspace).toContain(
      "[conflict, dirty, editable, saveCurrent, saveVisibilityCurrent, saving, visibilityDirty]",
    );
    expect(workspace).toContain("}, 2200)");
  });

  it("não lê graph redundante no effect de auto-fit", () => {
    const graph = source("src/components/knowledge/knowledge-graph-second-brain.tsx");
    const marker = "const frame = window.requestAnimationFrame(fitGraph);";
    const index = graph.indexOf(marker);
    expect(index).toBeGreaterThan(-1);
    const effect = graph.slice(Math.max(0, index - 80), index + 220);
    expect(effect).not.toContain("if (!graph || !graph.nodes.length)");
    expect(effect).toContain("[fitGraph, layout, mode, expanded]");
  });

  it("limita a exceção de fast refresh ao hook PWA compartilhado", () => {
    const pwa = source("src/components/pwa-registration.tsx");
    expect(pwa).toContain("eslint-disable-next-line react-refresh/only-export-components");
    expect(pwa).toContain("export function usePwaInstall()");
  });
});
