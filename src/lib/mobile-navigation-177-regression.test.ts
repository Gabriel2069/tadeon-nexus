import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("mobile navigation 177", () => {
  it("keeps the mobile drawer close control above active navigation items", () => {
    const css = source("src/styles/mobile-more-radial.css");
    expect(css).toContain('.tadeon-mobile-drawer [data-slot="sheet-close"]');
    expect(css).toContain("z-index: 96 !important");
  });

  it("mounts the radial More bridge only in the normal application shell", () => {
    const shell = source("src/components/protected-shell.tsx");
    expect(shell).toContain('import { MobileMoreRadialBridge } from "@/components/mobile-more-radial-bridge"');
    expect(shell).toContain("<MobileMoreRadialBridge />");
    expect(shell.indexOf("<MobileMoreRadialBridge />")).toBeGreaterThan(shell.indexOf("{!dedicated && ("));
  });

  it("turns the master More action into a stable circular menu for hidden routes", () => {
    const bridge = source("src/components/mobile-more-radial-bridge.tsx");
    expect(bridge).toContain('const MORE_TRIGGER_SELECTOR = ".tadeon-mobile-dock > button.tadeon-mobile-dock__item"');
    expect(bridge).toContain('{ to: "/offline", label: "Offline"');
    expect(bridge).toContain('{ to: "/manage-users", label: "Usuários"');
    expect(bridge).toContain('{ to: "/nexus-tools", label: "Backup"');
    expect(bridge).toContain('trigger.setAttribute("aria-haspopup", "menu")');
    expect(bridge).toContain('trigger.setAttribute("aria-controls", "tadeon-mobile-more-radial")');
    expect(bridge).toContain('event.stopImmediatePropagation()');
    expect(bridge).toContain('event.key !== "Escape"');
  });

  it("reuses the token radial motion language without escaping the mobile viewport", () => {
    const css = source("src/styles/mobile-more-radial.css");
    expect(css).toContain(".tadeon-mobile-more-radial {");
    expect(css).toContain("border-radius: 50%");
    expect(css).toContain("animation: tadeon-mobile-more-radial-open 210ms var(--ease-out) both");
    expect(css).toContain("@keyframes tadeon-mobile-more-radial-open");
    expect(css).toContain("@media (max-width: 380px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
