// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  animated: false,
  draw: vi.fn(),
  dispose: vi.fn(),
  ready: null as null | (() => void),
  host: null as HTMLElement | null,
}));
vi.mock("@/lib/tabletop/tabletop-native-model-renderer", () => ({
  TabletopNativeModelRenderer: class {
    constructor(_host: HTMLElement, ready: () => void) {
      state.ready = ready;
    }
    ensureCanvasSize() {}
    preload() {}
    hasAnimatedModels() {
      return state.animated;
    }
    render() {
      state.draw();
    }
    destroy() {
      state.dispose();
    }
  },
}));
vi.mock("@/lib/tabletop/tabletop-player-runtime", () => ({
  currentTabletopRuntime: () =>
    state.host
      ? {
          host: state.host,
          engine: {},
          snapshot: () => ({ scene: { entities: [] }, selectedIds: [] }),
        }
      : null,
}));
import { TabletopNativeModelBridge } from "./tabletop-native-model-bridge";
const frames = new Map<number, FrameRequestCallback>();
let next = 0;
function flush(time = 100) {
  act(() => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((fn) => fn(time));
  });
}
beforeEach(() => {
  state.host = document.createElement("div");
  state.animated = false;
  state.draw.mockClear();
  state.dispose.mockClear();
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++next, fn);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  frames.clear();
  state.host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("draws static models once, redraws on camera bursts and readiness, and leaves no idle frame", () => {
  const view = render(<TabletopNativeModelBridge />);
  expect(frames.size).toBe(1);
  flush();
  expect(state.draw).toHaveBeenCalledTimes(1);
  expect(frames.size).toBe(0);
  act(() => {
    for (let i = 0; i < 40; i++) window.dispatchEvent(new Event("tadeon-tabletop-view"));
  });
  expect(frames.size).toBe(1);
  flush();
  expect(state.draw).toHaveBeenCalledTimes(2);
  expect(frames.size).toBe(0);
  act(() => state.ready?.());
  flush();
  expect(state.draw).toHaveBeenCalledTimes(3);
  act(() => state.ready?.());
  view.unmount();
  expect(frames.size).toBe(0);
  expect(state.dispose).toHaveBeenCalledTimes(1);
});
it("continues real animation, stops when paused and suspends while the document is hidden", () => {
  state.animated = true;
  render(<TabletopNativeModelBridge />);
  flush();
  expect(frames.size).toBe(1);
  state.animated = false;
  flush();
  expect(frames.size).toBe(0);
  state.animated = true;
  act(() => window.dispatchEvent(new Event("tadeon-tabletop-render")));
  flush();
  expect(frames.size).toBe(1);
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(frames.size).toBe(0);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(frames.size).toBe(1);
});

it("limits animation draws according to quality while scene and camera changes redraw immediately", () => {
  state.animated = true;
  render(<TabletopNativeModelBridge />);
  act(() =>
    window.dispatchEvent(
      new CustomEvent("tadeon-tabletop-quality", { detail: { nativeAnimationFps: 20 } }),
    ),
  );
  flush(100);
  expect(state.draw).toHaveBeenCalledTimes(1);
  flush(116);
  expect(state.draw).toHaveBeenCalledTimes(1);
  flush(150);
  expect(state.draw).toHaveBeenCalledTimes(2);
  act(() => window.dispatchEvent(new Event("tadeon-tabletop-view")));
  flush(160);
  expect(state.draw).toHaveBeenCalledTimes(3);
});
