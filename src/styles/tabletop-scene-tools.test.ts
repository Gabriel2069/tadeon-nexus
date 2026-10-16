import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("tabletop scene tools", () => {
  const workspace = read("src/components/tabletop/tabletop-workspace.tsx");
  const styles = read("src/styles/tabletop-editor.css");

  it("exposes a protected action for deleting the current scene", () => {
    expect(workspace).toContain('label="Excluir cena atual"');
    expect(workspace).toContain("setDeleteSceneDialogOpen(true)");
    expect(workspace).toContain("onClick={() => setDeleteSceneDialogOpen(false)}");
    expect(workspace).toMatch(/AlertDialogAction[\s\S]*Excluir cena/);
  });
});
