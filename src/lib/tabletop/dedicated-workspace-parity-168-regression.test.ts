import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shell = readFileSync("src/components/protected-shell.tsx", "utf8");
const tabletopBridge = readFileSync(
  "src/components/tabletop/tabletop-workspace-popout-bridge.tsx",
  "utf8",
);
const css = readFileSync("src/styles/dedicated-workspace-parity-168.css", "utf8");

describe("dedicated workspace parity 168", () => {
  it("keeps dedicated pages inside the same visual shell contract as normal pages", () => {
    expect(shell).toContain("tadeon-shell tadeon-dedicated-shell");
    expect(shell).toContain("data-section={focusedSection()}");
    expect(shell).toContain("tadeon-ambient tadeon-ambient--veil");
    expect(shell).toContain("tadeon-ambient tadeon-ambient--flow");
    expect(shell).toContain('path.startsWith("/nexus")');
    expect(shell).toContain('path.startsWith("/master-panel")');
    expect(shell).toContain('path.startsWith("/tabletop")');
  });

  it("uses one neutral popout presentation instead of a separate master visual mode", () => {
    expect(shell).toContain('return "popout" as const');
    expect(shell).not.toContain('return "master-panel" as const');
  });

  it("does not redefine page textures or animation in the dedicated authority", () => {
    expect(css).toContain("never a different theme");
    expect(css).toContain("border-color: color-mix");
    expect(css).not.toMatch(/\.tadeon-dedicated-shell\[data-dedicated-presentation="popout"\]\s*\{[^}]*background\s*:/s);
    expect(css).not.toMatch(/\.tadeon-dedicated-shell\[data-dedicated-presentation="popout"\]\s*\{[^}]*animation\s*:/s);
  });

  it("offers the regular Mesa as a dedicated popout without confusing it with Director", () => {
    expect(shell).toContain("<TabletopWorkspacePopoutBridge />");
    expect(tabletopBridge).toContain('window.location.pathname === "/tabletop"');
    expect(tabletopBridge).toContain('params.set("popout", "1")');
    expect(tabletopBridge).toContain('params.delete("view")');
    expect(tabletopBridge).toContain(".tadeon-tabletop-toolbar");
    expect(tabletopBridge).toContain("Abrir Mesa em janela independente");
  });
});
