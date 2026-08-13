import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".css", ".md", ".json", ".html"]);
const FORBIDDEN_DASH = String.fromCodePoint(0x2014);

function collectFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath));
      continue;
    }
    if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push(fullPath);
  }
  return files;
}

describe("tipografia do produto", () => {
  it("nao deixa travessao longo voltar ao codigo-fonte", () => {
    const srcRoot = join(process.cwd(), "src");
    const findings: string[] = [];

    for (const file of collectFiles(srcRoot)) {
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      lines.forEach((line, index) => {
        if (line.includes(FORBIDDEN_DASH)) {
          findings.push(`${relative(process.cwd(), file)}:${index + 1}: ${line.trim()}`);
        }
      });
    }

    expect(findings, findings.join("\n")).toEqual([]);
  });
});
