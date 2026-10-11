// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ConditionCounter } from "./condition-counter";
import { conditionChipPresentation } from "@/lib/sheet-condition-presentation";
afterEach(cleanup);
it("updates condition progress with sheet state and preserves reset and disabled controls", () => {
  const onChange = vi.fn();
  const props = { label: "Morrendo" as const, max: 4, value: 2, color: "bg-red-500", onChange };
  const view = render(<ConditionCounter {...props} />);
  expect(view.container.firstElementChild?.getAttribute("data-tadeon-condition-kind")).toBe(
    "morrendo",
  );
  expect(
    (view.container.firstElementChild as HTMLElement).style.getPropertyValue("--condition-fill"),
  ).toBe("50%");
  expect(view.getAllByRole("button", { pressed: true })).toHaveLength(2);
  fireEvent.click(view.getByRole("button", { name: "Morrendo: 2 de 4" }));
  expect(onChange).toHaveBeenLastCalledWith(0);
  view.rerender(<ConditionCounter {...props} value={0} disabled />);
  expect(
    (view.container.firstElementChild as HTMLElement).style.getPropertyValue("--condition-fill"),
  ).toBe("0%");
  expect(view.queryAllByRole("button", { pressed: true })).toHaveLength(0);
  onChange.mockClear();
  fireEvent.click(view.getByRole("button", { name: "Morrendo: 1 de 4" }));
  expect(onChange).not.toHaveBeenCalled();
});
it.each([
  ["Envenenado: 2/4", undefined, "0.50"],
  ["Colapsando: estágio 1", "critical", "1.00"],
  ["Morrendo: 1/4", "critical", "0.86"],
  ["Ferimento crítico", "danger", "0.68"],
  ["Cansado", undefined, "0.42"],
  ["Exausto: 9/4", undefined, "1.00"],
])("preserves visual severity for %s", (text, severity, progress) => {
  const presentation = conditionChipPresentation(text!);
  expect(presentation.severity).toBe(severity);
  expect(presentation.style).toHaveProperty("--condition-progress", progress);
});
