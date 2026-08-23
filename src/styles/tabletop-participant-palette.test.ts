import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("tabletop participant palette parity", () => {
  const css = read("src/styles/tabletop-participant.css");
  const workspace = read("src/components/tabletop/tabletop-participant-workspace.tsx");

  it("uses the same Fio-Mestre palette tokens as the tabletop studio", () => {
    expect(css).toContain("--studio-brass: 217 215 164");
    expect(css).toContain("--studio-forest: 79 110 93");
    expect(css).toContain("--studio-wine: 116 36 45");
    expect(css).toContain("--studio-blue: 31 54 68");
  });

  it("removes the former independent gold palette", () => {
    expect(css).not.toMatch(/#d5a85b|#e6c884|#e4c67d|213 168 91/i);
    expect(workspace).not.toMatch(/#d5a85b|#7f8da8/i);
    expect(workspace).toContain('"#D9D7A4"');
    expect(workspace).toContain('"#4F6E5D"');
  });
});
