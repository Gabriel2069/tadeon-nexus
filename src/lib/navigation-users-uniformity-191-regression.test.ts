import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("navigation and users uniformity 191", () => {
  it("mounts workspace popouts beside desktop toolbar actions", () => {
    const bridge = source("src/components/master/master-toolbar-popout-bridge.tsx");
    const shell = source("src/components/protected-shell.tsx");
    const css = source("src/styles/navigation-users-uniformity-191.css");

    expect(bridge).toContain('path === "/master-panel"');
    expect(bridge).toContain('path === "/nexus"');
    expect(bridge).toContain('.tadeon-desktop-toolbar > div:last-child');
    expect(bridge).toContain('actions.insertBefore(portalHost, actions.firstChild)');
    expect(bridge).toContain('variant="ghost"');
    expect(bridge).toContain("Nova janela");
    expect(shell).toContain("<MasterToolbarPopoutBridge />");
    expect(css).toContain('[data-section="Painel do Mestre"]');
    expect(css).toContain('button[title="Abrir este painel em janela dedicada"]');
  });

  // NEX-024: available width and 44px collapsed targets are measured in the browser.


  it("gives user cards shared grid-track height on desktop and mobile", () => {
    const css = source("src/styles/navigation-users-uniformity-191.css");
    expect(css).toContain("grid-auto-rows: 1fr");
    expect(css).toContain(".tadeon-users-list > .tadeon-user-row");
    expect(css).toContain("height: 100% !important");
    expect(css).toContain("min-height: 6.25rem");
    expect(css).toContain("min-height: 8.25rem");
  });
});
