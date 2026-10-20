// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SelectionGroup } from "./selection-plate";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("measures the committed host, follows the selected control and releases its observer", () => {
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn(() => 1),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockImplementation(function (
    this: HTMLElement,
  ) {
    return [this.getBoundingClientRect()] as unknown as DOMRectList;
  });
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const x = this.dataset.place === "b" ? 120 : this.dataset.place === "a" ? 20 : 10;
    return {
      x,
      y: 10,
      left: x,
      top: 10,
      width: 80,
      height: 44,
      right: x + 80,
      bottom: 54,
      toJSON() {},
    };
  });
  const group = (active: string) => (
    <SelectionGroup
      motionId="fixture-navigation"
      activeKey={active}
      selector='[aria-pressed="true"]'
      aria-label="Leitura"
    >
      <button data-place="a" aria-pressed={active === "a"}>
        Documento
      </button>
      <button data-place="b" aria-pressed={active === "b"}>
        Grafo
      </button>
    </SelectionGroup>
  );
  const view = render(group("a"));
  const plate = view.container.querySelector<HTMLElement>(".tadeon-selection-plate")!;
  expect(plate.dataset.ready).toBe("true");
  expect(plate.style.transform).toBe("translate3d(10px, 0px, 0)");
  view.rerender(group("b"));
  expect(plate.style.transform).toBe("translate3d(110px, 0px, 0)");
  expect(view.getByRole("button", { name: "Grafo" }).getAttribute("aria-pressed")).toBe("true");
  expect(view.container.querySelectorAll(".tadeon-selection-plate")).toHaveLength(1);
  view.rerender(group("none"));
  expect(plate.dataset.ready).toBe("false");
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(3);
  const nextRoute = render(group("a"));
  const nextPlate = nextRoute.container.querySelector<HTMLElement>(".tadeon-selection-plate")!;
  expect(nextPlate.style.transform).toBe("translate3d(110px, 0px, 0)");
  vi.mocked(requestAnimationFrame).mock.calls.at(-1)![0](0);
  expect(nextPlate.style.transform).toBe("translate3d(10px, 0px, 0)");
});
