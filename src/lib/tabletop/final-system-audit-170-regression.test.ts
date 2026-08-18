import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("final system audit 170", () => {
  it("restores the canonical mobile Master dock item and aligns authored sidebar symbols", () => {
    const css = source("src/styles/create-sheet-search-viewport-163.css");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"] > svg');
    expect(css).toContain("visibility: visible !important");
    expect(css).toContain('.tadeon-mobile-dock__item[href="/master-panel"]::before');
    expect(css).toContain("content: none !important");
    expect(css).toContain("width: 2rem !important");
    expect(css).toContain("place-items: center !important");
    expect(css).toContain("border-radius: .66rem .22rem .66rem .22rem !important");
  });

  it("keeps all protected workspaces under the same integration shell", () => {
    const shell = source("src/components/protected-shell.tsx");
    for (const bridge of [
      "SheetExperienceBridge",
      "SheetInventoryOrganizer",
      "TabletopCrossSurfaceBridge",
      "WorkspacePopoutBridge",
      "TabletopWorkspacePopoutBridge",
      "NexusSheetDragBridge",
    ]) {
      expect(shell).toContain(bridge);
    }

    for (const route of [
      "src/routes/index.tsx",
      "src/routes/nexus.tsx",
      "src/routes/tabletop.tsx",
      "src/routes/master-panel.tsx",
      "src/routes/manage-users.tsx",
      "src/routes/nexus-tools.tsx",
      "src/routes/offline.tsx",
      "src/routes/sheet.$id.tsx",
      "src/routes/visual-audit.tsx",
    ]) {
      expect(source(route), route).toContain("ProtectedShell");
    }
  });

  it("gives touch devices a first-class Sheet to Mesa transfer instead of drag-only integration", () => {
    const bridge = source("src/components/tabletop/tabletop-cross-surface-bridge.tsx");
    const transfer = source("src/lib/cross-surface-transfer.ts");
    expect(bridge).toContain("queueTabletopTransfer");
    expect(bridge).toContain('window.location.assign("/tabletop")');
    expect(bridge).toContain("readTabletopTransfer");
    expect(bridge).toContain("stageCenter()");
    expect(bridge).toContain("linkedSheetId");
    expect(bridge).toContain("linkedKnowledgeNodeId");
    expect(transfer).toContain("window.sessionStorage");
    expect(transfer).toContain("MAX_AGE_MS");
    expect(transfer).toContain("clearTabletopTransfer");
  });

  it("audits every product viewport for geometry, text, blockers, touch and motion", () => {
    const lab = source("src/components/visual-audit/responsive-audit-lab.tsx");
    for (const preset of ["390", "430", "768", "820", "1024", "1366", "1440", "1920"]) {
      expect(lab).toContain(`width: ${preset}`);
    }
    for (const kind of ["overflow", "target", "collision", "clipping", "motion", "blocker", "scroll"]) {
      expect(lab).toContain(`"${kind}"`);
    }
    expect(lab).toContain("intersectionRatio");
    expect(lab).toContain("prefers-reduced-motion: reduce");
    expect(lab).toContain("pointerEvents");
  });

  it("keeps responsive shells, safe areas and reduced motion as shared layout contracts", () => {
    const mobile = source("src/styles/mobile-studio.css");
    const desktop = source("src/styles/desktop-studio.css");
    const dialogs = source("src/styles/create-sheet-search-viewport-163.css");
    const overlays = source("src/styles/mobile-popup-master-head-158.css");
    expect(mobile).toContain('data-mobile-dock="visible"');
    expect(mobile).toContain("env(safe-area-inset-bottom)");
    expect(mobile).toContain("tadeon-mobile-stage-reveal");
    expect(desktop).toContain("tadeon-stage-reveal");
    expect(dialogs).toContain("100dvh");
    expect(dialogs).toContain("prefers-reduced-motion: reduce");
    expect(overlays).toContain("max-height: calc(min(100dvh, 100svh)");
  });
});
