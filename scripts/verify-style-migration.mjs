import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { posix } from "node:path";
import { createHash } from "node:crypto";
import postcss from "postcss";

// One-time evidence for the structural migration. Requires the base commit locally.
// Run again only before deliberate visual edits; it is not a permanent CSS freeze.
const migration = JSON.parse(readFileSync("docs/style-migration.json", "utf8"));
function oldSource(path, ancestors = []) {
  if (ancestors.includes(path)) throw new Error(`Import cycle: ${path}`);
  const source = execFileSync("git", ["show", `${migration.baseCommit}:${path}`], {
    encoding: "utf8",
  });
  return source.replace(
    /@import\s+(?:url\()?['"](\.\/[^'"]+\.css)['"]\)?\s*;/g,
    (_match, imported) =>
      oldSource(posix.normalize(posix.join(posix.dirname(path), imported)), [...ancestors, path]),
  );
}
function digest(source) {
  const ast = postcss.parse(source);
  const events = [];
  const visit = (node) => {
    if (node.type === "comment") return;
    if (node.type === "rule") events.push(["rule", node.selector]);
    if (node.type === "atrule") events.push(["at", node.name, node.params]);
    if (node.type === "decl") events.push(["decl", node.prop, node.value, !!node.important]);
    if (node.nodes) {
      node.nodes.forEach(visit);
      events.push(["end", node.type]);
    }
  };
  visit(ast);
  return createHash("sha256").update(JSON.stringify(events)).digest("hex");
}
const modules = migration.modules.map((module) => {
  const before = digest(module.entries.map((entry) => oldSource(entry)).join("\n"));
  const after = digest(readFileSync(module.module, "utf8"));
  return { module: module.module, before, after, equivalent: before === after };
});
const report = {
  baseCommit: migration.baseCommit,
  method:
    "Ordered PostCSS AST events: selectors, at-rules, declarations, values and important flags; comments and whitespace excluded. Shared import boundaries retained. This does not prove every authenticated route visually correct.",
  modules,
};
writeFileSync("docs/style-migration-verification.json", `${JSON.stringify(report, null, 2)}\n`);
if (modules.some((module) => !module.equivalent))
  throw new Error("CSS semantics changed; inspect the report before continuing.");
console.log(`Verified ${modules.length} migrated modules against the ordered baseline CSS.`);
