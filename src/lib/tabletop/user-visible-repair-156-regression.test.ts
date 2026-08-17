import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("user-visible repair 156", () => {
  it("is the final stylesheet authority and retires the page hero bridge", () => {
    const root = source("src/routes/__root.tsx");
    expect(root).toContain('import userVisibleRepair156Css from "../styles/user-visible-repair-156.css?url"');
    expect(root.lastIndexOf("href: finalDeviceParity154CompatCss")).toBeLessThan(
      root.lastIndexOf("href: userVisibleRepair156Css"),
    );
    expect(root).not.toContain("PageHeroParityBridge");
  });

  it("matches the utility heroes that actually exist in route JSX", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    const users = source("src/routes/manage-users.tsx");
    const tools = source("src/routes/nexus-tools.tsx");
    const offline = source("src/routes/offline.tsx");

    expect(users).toContain('className="tadeon-page-hero');
    expect(tools).toContain('className="tadeon-page-hero');
    expect(offline).toContain('className="tadeon-page-hero');
    expect(css).toContain(".tadeon-route-users > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-tools > .tadeon-page-hero");
    expect(css).toContain(".tadeon-route-offline > .tadeon-page-hero");
    expect(css).not.toContain(".tadeon-page-header[data-tadeon-page-hero]");
  });

  it("fixes master navigation only after its slot reaches the real shell header", () => {
    const navigation = source("src/components/master/master-panel-navigation.tsx");
    const css = source("src/styles/user-visible-repair-156.css");
    expect(navigation).toContain("tadeon-master-navigation-slot");
    expect(navigation).toContain("shellHeaderBottom");
    expect(navigation).toContain('slot.style.setProperty("--tadeon-master-fixed-top"');
    expect(navigation).toContain('data-fixed={fixed ? "true" : "false"}');
    expect(css).toContain('.tadeon-master-navigation[data-fixed="true"]');
    expect(css).toContain("position: fixed !important");
    expect(css).toContain("top: var(--tadeon-master-fixed-top, 4.65rem) !important");
  });

  it("restores mobile texture and guide detail on users tools and offline", () => {
    const css = source("src/styles/user-visible-repair-156.css");
    expect(css).toContain("background-size: 64px 64px, 64px 64px, auto !important");
    expect(css).toContain('.tadeon-route-users [data-slot="card"]::before');
    expect(css).toContain('.tadeon-route-tools [data-slot="tabs-list"]');
    expect(css).toContain('.tadeon-route-offline [data-slot="tabs-trigger"][data-state="active"]');
  });
});
