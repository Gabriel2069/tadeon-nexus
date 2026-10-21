// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { createPortal } from "react-dom";
import { usePopupPortalContainer, useRoutePopupFrame } from "./route-popup-frame";

function Fixture() {
  const container = usePopupPortalContainer();
  const frame = useRoutePopupFrame();
  return createPortal(
    <span data-testid="popup" data-boundary={frame.boundary?.id}>
      Popup
    </span>,
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
