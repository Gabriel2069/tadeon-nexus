import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";
import postcss from "postcss";
import { duplicateStyleRules } from "./style-rule-duplicates.mjs";

const contract = JSON.parse(readFileSync("docs/style-architecture.json", "utf8"));
const errors = [];
function walk(path) {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const file = `${path}/${entry.name}`;
    return entry.isDirectory() ? walk(file) : [file];
  });
}
const cssFiles = [
  "src/styles.css",
  ...walk("src/styles").filter((file) => file.endsWith(".css")),
].sort();
if (JSON.stringify(cssFiles) !== JSON.stringify(Object.keys(contract.files).sort()))
  errors.push(
    "CSS inventory changed. Edit an existing owner; new modules require an explicit ownership review.",
  );
for (const file of cssFiles) {
  const budget = contract.files[file];
  if (!budget) continue;
  const ast = postcss.parse(readFileSync(file, "utf8"), { from: file });
  const duplicates = duplicateStyleRules(ast);
  for (const { earlier, retained } of duplicates)
    errors.push(
      `${file}:${earlier.source.start.line}: duplicate rule; keep the owner at line ${retained.source.start.line}.`,
    );
  let important = 0;
  let roots = 0;
  ast.walkDecls((declaration) => {
    if (declaration.important) important += 1;
  });
  ast.walkRules((rule) => {
    if (rule.selector === ":root") roots += 1;
    const ownsFocusGeometry =
      rule.selectors.some((selector) => selector.endsWith(".tadeon-desktop-toolbar > .min-w-0")) &&
      rule.nodes.some(
        (node) =>
          node.type === "decl" &&
          [
            "display",
            "grid-template-columns",
            "grid-template-rows",
            "column-gap",
            "row-gap",
            "align-items",
            "padding",
          ].includes(node.prop),
      );
    if (ownsFocusGeometry && file !== "src/styles/page-hero-parity.css")
      errors.push(
        `${file}:${rule.source.start.line}: focus geometry belongs to page-hero-parity.css.`,
      );
    const ownsNavigationGeometry =
      rule.selectors.some(
        (selector) =>
          selector.includes(".tadeon-nav-item__icon") ||
          (selector.includes(".tadeon-sidebar-collapse") &&
            !selector.includes(":not(.tadeon-sidebar-collapse)")),
      ) &&
      rule.nodes.some(
        (node) =>
          node.type === "decl" &&
          [
            "position",
            "display",
            "width",
            "height",
            "min-width",
            "max-width",
            "min-height",
            "max-height",
            "inline-size",
            "block-size",
            "flex",
            "flex-basis",
            "padding",
            "padding-inline",
            "margin",
            "margin-inline",
          ].includes(node.prop),
      );
    if (ownsNavigationGeometry && file !== "src/styles/navigation-layout.css")
      errors.push(
        `${file}:${rule.source.start.line}: navigation icon/control geometry belongs to navigation-layout.css.`,
      );
    const ownsDossier = rule.selectors.some((selector) => {
      if (/data-tadeon-sheet-mode\s*=\s*["']game/.test(selector)) return false;
      const positive = selector.replace(/:not\([^)]*\)/g, "");
      return /\.tadeon-(?:sheet-section(?:__[\w-]+)?|overview-metric(?:[\w-]+)?|sheet-overview|identity-[\w-]+|link-(?:panel(?:__[\w-]+)?|list|row(?:__[\w-]+)?|add)|sheet-field|stat-block(?:__[\w-]+)?)(?![\w-])/.test(
        positive,
      );
    });
    if (ownsDossier && file !== "src/styles/sheet-premium.css")
      errors.push(
        `${file}:${rule.source.start.line}: dossier presentation belongs to sheet-premium.css; game density remains in sheet-layout.css.`,
      );
  });
  ast.walkAtRules("import", (rule) => {
    if (file !== "src/styles.css")
      errors.push(`${file}: nested stylesheet imports are not allowed.`);
    if (
      file === "src/styles.css" &&
      !['"tailwindcss" source(none)', '"tw-animate-css"'].includes(rule.params)
    )
      errors.push(`${file}: unexpected import ${rule.params}`);
  });
  if (important > budget.important)
    errors.push(
      `${file}: !important grew from ${budget.important} to ${important}. Resolve the earlier rule instead.`,
    );
  if (roots > budget.roots)
    errors.push(
      `${file}: :root definitions grew from ${budget.roots} to ${roots}. Use the token owner.`,
    );
}
const importPattern = /import\s+(?:\w+\s+from\s+)?["']([^"']+\.css(?:\?url)?)["']/g;
for (const file of walk("src").filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file))) {
  const source = readFileSync(file, "utf8");
  if (
    file !== "src/components/visual-viewport-popup-bridge.tsx" &&
    /(?:setProperty|setPx)\([^\n]*["']--tadeon-(?:vv-|keyboard-inset)/.test(source)
  )
    errors.push(`${file}: viewport measurements belong to VisualViewportPopupBridge at the root.`);
  for (const match of source.matchAll(importPattern)) {
    const path = match[1].replace(/\?url$/, "");
    const target = path.startsWith("@/")
      ? resolve("src", path.slice(2))
      : resolve(dirname(file), path);
    const name = relative(process.cwd(), target).replaceAll("\\", "/");
    if (!contract.files[name]) errors.push(`${file}: unregistered stylesheet ${name}`);
  }
}
const root = readFileSync("src/routes/__root.tsx", "utf8");
const hrefVariables = [...root.matchAll(/rel: "stylesheet", href: (\w+)/g)].map(
  (match) => match[1],
);
const rootImports = new Map(
  [...root.matchAll(/import (\w+) from "([^"\n]+\.css\?url)"/g)].map((match) => [
    match[1],
    match[2],
  ]),
);
const rootOrder = hrefVariables.map((name) => rootImports.get(name));
if (JSON.stringify(rootOrder) !== JSON.stringify(contract.rootOrder))
  errors.push(
    "Global CSS order changed. Validate the cascade and review the architecture contract.",
  );
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Style architecture verified: ${cssFiles.length} files, ${rootOrder.length} global links, no growth in override budgets.`,
);
