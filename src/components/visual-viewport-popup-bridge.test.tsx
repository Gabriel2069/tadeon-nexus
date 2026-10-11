// @vitest-environment jsdom
import { cleanup, render, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { VisualViewportPopupBridge } from "./visual-viewport-popup-bridge";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("tracks keyboard outside modals, follows viewport changes and cancels work on unmount", () => {
  vi.useFakeTimers();
  const viewport = Object.assign(new EventTarget(), {
    width: 390,
    height: 420,
    offsetLeft: 0,
    offsetTop: 30,
    scale: 1,
  });
  vi.stubGlobal("visualViewport", viewport);
  vi.stubGlobal("innerHeight", 800);
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    frames.set(++id, cb);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const flush = () => {
    for (let n = 0; frames.size && n < 5; n++) {
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((cb) => cb(0));
    }
  };
  const view = render(
    <>
      <VisualViewportPopupBridge />
      <input aria-label="Campo" />
    </>,
  );
  const field = view.getByLabelText("Campo");
  const scroll = vi.fn();
  field.scrollIntoView = scroll;
  flush();
  const cleared = vi.spyOn(window, "clearTimeout");
  field.focus();
  flush();
  expect(document.documentElement.dataset.tadeonKeyboardOpen).toBe("true");
  expect(document.documentElement.style.getPropertyValue("--tadeon-vv-height")).toBe("420px");
  expect(document.documentElement.style.getPropertyValue("--tadeon-keyboard-inset")).toBe("350px");
  expect(scroll).toHaveBeenCalledWith({ block: "nearest", inline: "nearest" });
  viewport.height = 800;
  viewport.offsetTop = 0;
  viewport.dispatchEvent(new Event("resize"));
  flush();
  expect(document.documentElement.dataset.tadeonKeyboardOpen).toBe("false");
  fireEvent.focusOut(field);
  expect(vi.getTimerCount()).toBeGreaterThan(0);
  cleared.mockClear();
  view.unmount();
  expect(frames.size).toBe(0);
  expect(cleared).toHaveBeenCalledTimes(6);
  vi.runAllTimers();
  expect(frames.size).toBe(0);
  viewport.dispatchEvent(new Event("resize"));
  flush();
  expect(document.documentElement.style.getPropertyValue("--tadeon-vv-height")).toBe("");
});
