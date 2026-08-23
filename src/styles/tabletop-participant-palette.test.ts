import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("tabletop participant palette parity", () => {
  const css = read("src/styles/tabletop-participant.css");
  const workspace = read("src/components/tabletop/tabletop-participant-workspace.tsx");

  it("uses the blue Fio-Mestre palette reserved for the player tabletop", () => {
    expect(css).toContain("--studio-brass: 89 189 235");
    expect(css).toContain("--studio-cyan: 89 189 235");
    expect(css).toContain("--studio-blue: 24 112 169");
    expect(css).toContain("linear-gradient(145deg, #07111b");
  });

  it("removes the former independent gold palette", () => {
    expect(css).not.toMatch(/#d5a85b|#e6c884|#e4c67d|213 168 91/i);
    expect(workspace).not.toMatch(/#d5a85b|#7f8da8|#D9D7A4|#4F6E5D/i);
    expect(workspace).toContain('"#59BDEB"');
    expect(workspace).toContain('"#3176A3"');
  });
});
