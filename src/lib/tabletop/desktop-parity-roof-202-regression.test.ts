import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("desktop parity and roof repair 202", () => {
  it("centers the global search from the desktop layout viewport", () => {
    const css = source("src/styles/runtime-ui-repair-198.css");
    expect(css).toContain("calc(50dvh - 19rem)");
    expect(css).toContain("calc(50vw - 21rem)");
    expect(css).toContain("transform: none !important");
  });

  it("loads the desktop hero parity authority after the prior visual layers", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain("desktop-hero-parity-202.css?url");
    expect(root).toContain('{ rel: "stylesheet", href: desktopHeroParity202Css }');
  });

  it("keeps Nexus orbital presence visible on desktop and varies other page heads by identity", () => {
    const css = source("src/styles/desktop-hero-parity-202.css");
    expect(css).toContain(".tadeon-route-nexus .tadeon-nexus-commandbar::before");
    expect(css).toContain('.tadeon-page-hero[data-tadeon-page-hero="master"]::before');
    expect(css).toContain('.tadeon-page-hero[data-tadeon-page-hero="users"]::before');
    expect(css).toContain('.tadeon-page-hero[data-tadeon-page-hero="tools"]::before');
    expect(css).toContain('.tadeon-page-hero[data-tadeon-page-hero="offline"]::before');
    expect(css).toContain("rgb(var(--hero-rgb)");
  });
});
