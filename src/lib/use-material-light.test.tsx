// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MaterialSurface } from "@/components/material-surface";

let next = 0;
let reduced = false;
const frames = new Map<number, FrameRequestCallback>();
class TestPointerEvent extends MouseEvent {
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerType = init.pointerType || "mouse";
  }
}
const flush = () => {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((fn) => fn(0));
};
const setup = () => {
  const view = render(
    <MaterialSurface data-testid="surface">
      <button>Action</button>
    </MaterialSurface>,
  );
  const node = view.getByTestId("surface");
  vi.spyOn(node, "getBoundingClientRect").mockReturnValue({
    left: 10,
    top: 20,
    width: 200,
    height: 100,
  } as DOMRect);
  return { ...view, node };
};
beforeEach(() => {
  frames.clear();
  reduced = false;
  vi.stubGlobal("PointerEvent", TestPointerEvent);
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    frames.set(++next, fn);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduced-motion") ? reduced : true,
  }));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("local material light", () => {
  it("coalesces pointer changes and uses the latest bounded position", () => {
    const { node } = setup();
    fireEvent.pointerMove(node, { pointerType: "mouse", clientX: 50, clientY: 40 });
    fireEvent.pointerMove(node, { pointerType: "mouse", clientX: 400, clientY: 70 });
    expect(frames.size).toBe(1);
    flush();
    expect(node.style.getPropertyValue("--material-x")).toBe("100.0%");
    expect(node.style.getPropertyValue("--material-y")).toBe("50.0%");
    expect(node.style.transform).toBe("");
  });
  it("does not schedule movement for touch", () => {
    const { node } = setup();
    fireEvent.pointerMove(node, { pointerType: "touch", clientX: 50, clientY: 40 });
    expect(frames.size).toBe(0);
  });
  it("does not schedule movement with reduced motion", () => {
    reduced = true;
    const { node } = setup();
    fireEvent.pointerMove(node, { clientX: 50, clientY: 40 });
    expect(frames.size).toBe(0);
  });
  it("clears pending and rendered light when the pointer leaves", () => {
    const { node } = setup();
    fireEvent.pointerMove(node, { clientX: 50, clientY: 40 });
    flush();
    fireEvent.pointerMove(node, { clientX: 110, clientY: 60 });
    fireEvent.pointerLeave(node);
    expect(frames.size).toBe(0);
    expect(node.style.getPropertyValue("--material-x")).toBe("");
  });
  it("cancels the pending frame on unmount", () => {
    const { node, unmount } = setup();
    fireEvent.pointerMove(node, { clientX: 50, clientY: 40 });
    expect(frames.size).toBe(1);
    unmount();
    expect(frames.size).toBe(0);
  });
});
