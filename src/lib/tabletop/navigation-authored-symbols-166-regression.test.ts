import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";
import postcss from "postcss";

// The authored React SVG is the icon. Old tests required the masks that hid it.
it("never substitutes or hides Master/Backup navigation SVGs with route CSS", () => {
  const violations: string[] = [];
  for (const name of [
    "src/styles.css",
    ...readdirSync("src/styles")
      .filter((n) => n.endsWith(".css"))
      .map((n) => `src/styles/${n}`),
  ]) {
    postcss.parse(readFileSync(name, "utf8")).walkRules((rule) => {
      if (name !== "src/styles/navigation-layout.css" && rule.selector.includes(".tadeon-nav-item"))
        rule.walkDecls((decl) => {
          if (decl.prop === "color") violations.push(`${name}:competing navigation color`);
        });
      if (
        !/\.tadeon-(?:nav-item|mobile-dock__item)/.test(rule.selector) ||
        !/master-panel|nexus-tools/.test(rule.selector) ||
        !/__icon|svg|::before|::after/.test(rule.selector)
      )
        return;
      rule.walkDecls((decl) => {
        if (/mask|content|display|visibility|opacity/.test(decl.prop))
          violations.push(`${name}:${decl.prop}`);
      });
    });
  }
  expect(violations).toEqual([]);
});
