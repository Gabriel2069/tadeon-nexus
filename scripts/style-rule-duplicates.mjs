/** Exact dominated rules only. Keep the last occurrence in the same cascade context. */
export function duplicateStyleRules(ast) {
  const seen = new Map();
  const duplicates = [];
  ast.walkRules((rule) => {
    if (!rule.nodes.every((node) => ["decl", "comment"].includes(node.type))) return;
    const context = [];
    for (let parent = rule.parent; parent && parent.type !== "root"; parent = parent.parent) {
      // Nested selectors, anonymous layers, scope and keyframes need separate semantics.
      if (
        parent.type !== "atrule" ||
        !["media", "supports", "container", "layer"].includes(parent.name)
      )
        return;
      if (parent.name === "layer" && !parent.params.trim()) return;
      context.unshift([parent.name, parent.params]);
    }
    const declarations = rule.nodes
      .filter((node) => node.type === "decl")
      .map((node) => [node.prop, node.value, !!node.important]);
    if (!declarations.length) return;
    const key = JSON.stringify([context, rule.selector, declarations]);
    const previous = seen.get(key);
    if (previous) duplicates.push({ earlier: previous, retained: rule });
    seen.set(key, rule);
  });
  // Point every removal at the final owner, including groups of three or more.
  const final = new Map(duplicates.map(({ earlier, retained }) => [earlier, retained]));
  return duplicates.map(({ earlier, retained }) => {
    while (final.has(retained)) retained = final.get(retained);
    return { earlier, retained };
  });
}
