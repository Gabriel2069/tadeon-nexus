import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");
const appLayout = readFileSync(resolve(process.cwd(), "src/components/app-layout.tsx"), "utf8");

describe("responsive shell geometry", () => {
  it("keeps modal centering inside the modal animation transform", () => {
    expect(styles).toContain("translate: none !important;");
    expect(styles).toContain("transform: translate3d(-50%, -50%, 0);");
    expect(styles).toContain("animation: tadeon-modal-in 320ms var(--ease-drawer) both !important;");
  });

  it("does not replace centered dialog motion with anchored popup motion", () => {
    expect(styles).not.toContain(
      '[data-slot="dialog-content"][data-state="open"],\n[data-slot="alert-dialog-content"][data-state="open"],\n[data-slot="popover-content"][data-state="open"]',
    );
    expect(styles).toContain(
      '[data-slot="popover-content"][data-state="open"],\n[data-slot="dropdown-menu-content"][data-state="open"]',
    );
  });

  it("exposes compact sidebar state and keeps its controls above the edge detail", () => {
    expect(appLayout).toContain('data-collapsed={collapsed ? "true" : "false"}');
    expect(appLayout).toContain("tadeon-sidebar__scroll");
    expect(appLayout).toContain("tadeon-sidebar-collapse");
    expect(styles).toContain('.tadeon-sidebar[data-collapsed="true"] .tadeon-sidebar__scroll');
    expect(styles).toContain(".tadeon-sidebar__scroll .tadeon-nav-item");
  });
});
