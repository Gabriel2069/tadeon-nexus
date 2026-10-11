import { describe, expect, it } from "vitest";
import postcss from "postcss";
import { duplicateStyleRules } from "./style-rule-duplicates.mjs";

function clean(css) {
  const ast = postcss.parse(css);
  const pairs = duplicateStyleRules(ast);
  for (const { earlier } of pairs) earlier.remove();
  return { ast, pairs };
}
describe("dominated CSS rules", () => {
  it("keeps the last owner across intervening rules and resolves three copies", () => {
    const { ast, pairs } = clean(".a{color:red}.b{color:blue}.a{color:red}.a{color:red}");
    expect(ast.toString()).toBe(".b{color:blue}.a{color:red}");
    expect(pairs).toHaveLength(2);
    expect(pairs[0].retained).toBe(pairs[1].retained);
  });
  it("preserves conditions, named layers, priority and ordered fallbacks", () => {
    const css =
      ".a{color:red}@media(min-width:1px){.a{color:red}}@layer x{.a{color:red}}.a{color:red!important}.a{display:block;display:grid}.a{display:grid;display:block}";
    expect(clean(css).ast.toString()).toBe(css);
  });
  it("deduplicates matching nested conditions, retaining their order", () => {
    const { pairs } = clean(
      "@supports(display:grid){@media(min-width:1px){.a{color:red}}}@supports(display:grid){@media(min-width:1px){.a{color:red}}}",
    );
    expect(pairs).toHaveLength(1);
  });
  it("excludes keyframes, anonymous layers, scopes and nested selectors", () => {
    const css =
      "@keyframes a{from{opacity:0}from{opacity:0}}@layer{.a{color:red}}@layer{.a{color:red}}@scope(.x){.a{color:red}.a{color:red}}.x{& .a{color:red}& .a{color:red}}";
    expect(clean(css).pairs).toHaveLength(0);
  });
});
