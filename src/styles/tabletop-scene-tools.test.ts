import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("tabletop scene tools", () => {
  const workspace = read("src/components/tabletop/tabletop-workspace.tsx");
  const styles = read("src/styles/tabletop-editor.css");

  it("keeps the upper toolbar visible outside the collapsed mobile state", () => {
    expect(workspace).toContain(
      'className="tadeon-tabletop-toolbar relative z-10 mt-3 flex',
    );
    expect(workspace).not.toContain(
      'mobileToolsOpen ? "flex" : "hidden"} tadeon-tabletop-toolbar',
    );
    expect(styles).toContain('.tadeon-tabletop-toolbar[data-mobile-open="false"]');
  });

  it("exposes a protected action for deleting the current scene", () => {
    expect(workspace).toContain('label="Excluir cena atual"');
    expect(workspace).toContain("setDeleteSceneDialogOpen(true)");
    expect(workspace).toMatch(/AlertDialogAction[\s\S]*Excluir cena/);
  });
});
