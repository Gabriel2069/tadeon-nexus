// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { Ref } from "react";
import { createPortal } from "react-dom";
import { usePopupPortalContainer, useRoutePopupFrame } from "./route-popup-frame";

function Fixture({
  present = true,
  forwardedRef,
}: {
  present?: boolean;
  forwardedRef?: Ref<HTMLDivElement>;
}) {
  const container = usePopupPortalContainer();
  const frame = useRoutePopupFrame(forwardedRef);
  return createPortal(
    present ? (
      <div
        ref={frame.contentRef}
        data-testid="popup"
        data-boundary={frame.boundary?.id}
        style={frame.style}
      >
        Popup
      </div>
    ) : null,
    container ?? document.body,
  );
}
afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(document, "fullscreenElement");
});
it("moves viewport popups into fullscreen and measures that same frame, then returns to the route", () => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", () => 1);
  vi.stubGlobal("cancelAnimationFrame", () => {});
  const main = document.createElement("main");
  main.id = "tadeon-main";
  const route = document.createElement("div");
  route.id = "route";
  route.className = "tadeon-page";
  const workbench = document.createElement("div");
  workbench.id = "workbench";
  route.append(workbench);
  main.append(route);
  document.body.append(main);
  let fullscreen: Element | null = null;
  Object.defineProperty(document, "fullscreenElement", {
    configurable: true,
    get: () => fullscreen,
  });
  const view = render(<Fixture />);
  expect(view.getByTestId("popup").parentElement).toBe(document.body);
  expect(view.getByTestId("popup").dataset.boundary).toBe("route");
  act(() => {
    fullscreen = workbench;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  expect(view.getByTestId("popup").parentElement).toBe(workbench);
  expect(view.getByTestId("popup").dataset.boundary).toBe("workbench");
  act(() => {
    fullscreen = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  expect(view.getByTestId("popup").parentElement).toBe(document.body);
  expect(view.getByTestId("popup").dataset.boundary).toBe("route");
});

it("does no geometry work while absent and releases subscriptions after presence ends", () => {
  const observe = vi.fn(),
    disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = observe;
      disconnect = disconnect;
    },
  );
  const pending = new Map<number, FrameRequestCallback>();
  let next = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.set(++next, callback);
    return next;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => pending.delete(id));
  const flush = () =>
    act(() => {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback(0));
    });
  document.body.innerHTML =
    '<main id="tadeon-main"><div class="tadeon-page"><div id="list"></div></div></main>';
  const route = document.querySelector<HTMLElement>(".tadeon-page")!;
  const rect = vi
    .spyOn(route, "getBoundingClientRect")
    .mockReturnValue({ left: 20, right: 820, width: 800 } as DOMRect);
  const view = render(<Fixture present={false} />);
  act(() => window.dispatchEvent(new Event("resize")));
  flush();
  expect(rect).not.toHaveBeenCalled();
  expect(observe).not.toHaveBeenCalled();
  view.rerender(<Fixture />);
  expect(rect).toHaveBeenCalledTimes(1);
  expect(observe).toHaveBeenCalledWith(route);
  expect(view.getByTestId("popup").style.getPropertyValue("--tadeon-popup-frame-left")).toBe(
    "20px",
  );
  // Nested scrolling cannot change the route's horizontal frame.
  act(() => document.getElementById("list")!.dispatchEvent(new Event("scroll")));
  flush();
  expect(rect).toHaveBeenCalledTimes(1);
  act(() => {
    window.dispatchEvent(new Event("resize"));
    window.dispatchEvent(new Event("resize"));
  });
  expect(pending.size).toBe(1);
  flush();
  expect(rect).toHaveBeenCalledTimes(2);
  act(() => window.dispatchEvent(new Event("resize")));
  view.rerender(<Fixture present={false} />);
  expect(pending.size).toBe(0);
  expect(disconnect).toHaveBeenCalledOnce();
  act(() => window.dispatchEvent(new Event("resize")));
  flush();
  expect(rect).toHaveBeenCalledTimes(2);
});

it("forwards presence and honors a consumer callback ref cleanup", () => {
  const release = vi.fn();
  const forwardedRef = vi.fn(() => release);
  const view = render(<Fixture forwardedRef={forwardedRef} />);
  expect(forwardedRef).toHaveBeenCalledWith(view.getByTestId("popup"));
  view.rerender(<Fixture forwardedRef={forwardedRef} present={false} />);
  expect(release).toHaveBeenCalledOnce();
  expect(forwardedRef).toHaveBeenCalledTimes(1);
});
