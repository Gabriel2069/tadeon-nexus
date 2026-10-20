import { readFoundationSource as readFileSync } from "@/test/read-foundation-source";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("navigation and users uniformity 191", () => {
  // NEX-026: explicit WorkspaceActions behavior replaces DOM-injection assertions.


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
