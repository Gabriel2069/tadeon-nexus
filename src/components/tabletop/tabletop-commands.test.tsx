// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ runtime: null as unknown }));
vi.mock("@/lib/tabletop/tabletop-player-runtime", () => ({
  currentTabletopRuntime: () => fixture.runtime,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "reader" } }) }));
vi.mock("./tabletop-stage-portal", () => ({
  TabletopStagePortal: ({ children }: { children: import("react").ReactNode }) => children,
}));
import { TabletopProgressiveInterfaceBridge } from "./tabletop-progressive-interface-bridge";
const setToolMode = vi.fn();
beforeEach(() => {
  window.localStorage.clear();
  setToolMode.mockReset();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  fixture.runtime = {
    snapshot: () => ({ scene: { entities: [] }, selectedIds: [], canUndo: false, canRedo: false }),
    engine: { diagnostics: () => ({ tool: "select" }), setToolMode },
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("reserves the local shortcut and contains focus while searching commands", async () => {
  render(<TabletopProgressiveInterfaceBridge role="mestre" editable />);
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Abrir comandos" }));
  const dialog = await screen.findByRole("dialog", { name: "Comandos da Mesa" });
  const search = screen.getByRole("combobox", { name: "Buscar comando" });
  await waitFor(() => expect(document.activeElement).toBe(search));
  fireEvent.change(search, { target: { value: "camera" } });
  const action = screen.getByRole("option", { name: "Mover câmera" });
  fireEvent.click(action);
  expect(setToolMode).toHaveBeenCalledWith("pan");
  await waitFor(() => expect(dialog.isConnected).toBe(false));
});
it("shows unavailable actions as disabled and filters accents without exposing master actions to players", async () => {
  const view = render(<TabletopProgressiveInterfaceBridge role="mestre" />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir comandos" }));
  await screen.findByRole("dialog");
  expect(
    screen.getByRole("option", { name: "Duplicar seleção" }).getAttribute("aria-disabled"),
  ).toBe("true");
  fireEvent.change(screen.getByRole("combobox", { name: "Buscar comando" }), {
    target: { value: "nevoa" },
  });
  expect(screen.getByRole("option", { name: "Revelar névoa" }).getAttribute("aria-disabled")).toBe(
    "true",
  );
  view.unmount();
  render(<TabletopProgressiveInterfaceBridge role="jogador" />);
  fireEvent.click(screen.getByRole("button", { name: "Abrir comandos" }));
  await screen.findByRole("dialog");
  expect(screen.queryByRole("option", { name: /Duplicar seleção/ })).toBeNull();
  expect(screen.queryByRole("option", { name: /Revelar névoa/ })).toBeNull();
});
