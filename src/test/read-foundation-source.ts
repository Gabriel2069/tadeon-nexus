import { readFileSync, readdirSync, existsSync } from "node:fs";
import { relative, resolve } from "node:path";

/** Compatibility reader for existing contract tests during staged CSS cleanup.
 * A legacy name must resolve to an active section, never to archived/dead CSS.
 * New tests should exercise rendered behavior rather than source spelling.
 */
export function readFoundationSource(path: string, _encoding: "utf8"): string {
  if (existsSync(path)) return readFileSync(path, "utf8");
  const name = relative(process.cwd(), resolve(path)).replaceAll("\\", "/");
  if (!name.startsWith("src/styles/") || !name.endsWith(".css")) {
    throw new Error(`Missing source: ${name}`);
  }
  const startMarker = `/* source: ${name} */`;
  const endMarker = `/* end-source: ${name} */`;
  for (const file of readdirSync("src/styles").filter((file) => file.endsWith(".css"))) {
    const source = readFileSync(`src/styles/${file}`, "utf8");
    const start = source.indexOf(startMarker);
    if (start < 0) continue;
    const end = source.indexOf(endMarker, start);
    if (end < 0) throw new Error(`Missing provenance boundary: ${name}`);
    return source.slice(start + startMarker.length + 1, end);
  }
  throw new Error(`Style is not active: ${name}`);
}

/** Verifies the actual importer and the order inside consolidated modules. */
export function isStyleLoadedAfter(owner: string, earlier: string, later: string): boolean {
  const importer = readFileSync(owner, "utf8");
  const imports = [
    ...importer.matchAll(/import\s+(?:\w+\s+from\s+)?["']([^"']+\.css(?:\?url)?)["']/g),
  ];
  const cascade = imports
    .map((match) => {
      const path = match[1].replace(/\?url$/, "");
      const target = path.startsWith("@/")
        ? resolve("src", path.slice(2))
        : resolve(owner, "..", path);
      const source = readFileSync(target, "utf8");
      const name = relative(process.cwd(), target).replaceAll("\\", "/");
      return `/* source: ${name} */\n${source}`;
    })
    .join("\n");
  const first = cascade.indexOf(`/* source: ${earlier} */`);
  const last = cascade.indexOf(`/* source: ${later} */`);
  return first >= 0 && last > first;
}
