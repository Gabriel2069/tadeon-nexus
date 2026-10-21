// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ runtime: null as unknown }));
vi.mock("@/lib/tabletop/tabletop-player-runtime", () => ({
  currentTabletopRuntime: () => state.runtime,
}));
import { TabletopRadialActionsBridge } from "./tabletop-radial-actions-bridge";
const frames = new Map<number, FrameRequestCallback>();
let next = 0;
const flush = () =>
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(0));
  });
function setup() {
  const host = document.createElement("div");
  document.body.append(host);
  const bounds = vi
    .spyOn(host, "getBoundingClientRect")
    .mockReturnValue({
      left: 0,
      top: 0,
      right: 320,
      bottom: 600,
      width: 320,
      height: 600,
    } as DOMRect);
  let x = 160;
  const entity = {
    id: "one",
    label: "Sentinela",
    x: 100,
    y: 200,
    width: 50,
    height: 50,
    properties: {},
  };
  const snapshot = { selectedIds: ["one"], scene: { entities: [entity] } };
  const engine = {
    focusSelection: vi.fn(),
    duplicateSelected: vi.fn(),
    updateSelected: vi.fn(),
    deleteSelected: vi.fn(),
  };
  state.runtime = { host, snapshot: () => snapshot, engine, worldToClient: () => ({ x, y: 300 }) };
  const view = render(
    <div style={{ transform: "translateY(10px)", overflow: "hidden" }}>
      <TabletopRadialActionsBridge />
    </div>,
  );
  return {
    ...view,
    bounds,
    engine,
    move: (value: number) => {
      x = value;
    },
  };
}
beforeEach(() => {
  frames.clear();
  window.history.replaceState({}, "", "/tabletop");
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++next, fn);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  state.runtime = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("portals outside transformed content, opens with focus and restores the launcher after Escape", () => {
  const view = setup();
  const trigger = screen.getByRole("button", { name: "Abrir ações rápidas de Sentinela" });
  expect(view.container.contains(trigger)).toBe(false);
  fireEvent.click(trigger);
  const menu = screen.getByRole("menu", { name: "Ações rápidas de Sentinela" });
  expect(menu.contains(document.activeElement)).toBe(true);
  fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
  expect(menu.contains(document.activeElement)).toBe(true);
  fireEvent.keyDown(window, { key: "Escape" });
  expect(document.activeElement).toBe(
    screen.getByRole("button", { name: "Abrir ações rápidas de Sentinela" }),
  );
});
it("follows camera changes once per burst and leaves no recurring frame or detached listener", () => {
  const view = setup();
  expect(frames.size).toBe(0);
  view.bounds.mockClear();
  view.move(180);
  for (let i = 0; i < 40; i++) window.dispatchEvent(new Event("tadeon-tabletop-view"));
  expect(frames.size).toBe(1);
  expect(view.bounds).not.toHaveBeenCalled();
  flush();
  expect(view.bounds).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
  expect(screen.getByRole("button", { name: "Abrir ações rápidas de Sentinela" }).style.left).toBe(
    "180px",
  );
  window.dispatchEvent(new Event("resize"));
  view.unmount();
  expect(frames.size).toBe(0);
  window.dispatchEvent(new Event("tadeon-tabletop-view"));
  expect(frames.size).toBe(0);
});
it("delegates the selected operation and ignores Q while typing", () => {
  const { engine } = setup();
  const input = document.createElement("input");
  document.body.append(input);
  fireEvent.keyDown(input, { key: "q" });
  expect(screen.queryByRole("menu")).toBeNull();
  fireEvent.keyDown(window, { key: "q" });
  fireEvent.click(screen.getByRole("menuitem", { name: "Duplicar" }));
  expect(engine.duplicateSelected).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).toBeNull();
});
