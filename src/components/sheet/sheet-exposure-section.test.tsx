// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SheetExposureSection } from "./sheet-exposure-section";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
const base = { rank: 35, pv: 25, ps: 20, pe: 8, pa: 1, def: 11, pm: 41 };
it("presents the supplied rank and resource bases rather than recalculating progression", () => {
  render(
    <SheetExposureSection
      value={40}
      base={base}
      attributeBudget={12}
      attributeCap={4}
      canEdit={false}
      onValueChange={vi.fn()}
    />,
  );
  expect(screen.getByRole("heading", { name: "Patamar 35" })).toBeTruthy();
  expect(screen.getByText("41")).toBeTruthy();
  expect(within(screen.getByLabelText("Recursos de base")).getByText("25")).toBeTruthy();
  expect(
    (screen.getByRole("spinbutton", { name: "Exposição atual" }) as HTMLInputElement).disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("slider", { name: "Ajustar exposição" }) as HTMLInputElement).disabled,
  ).toBe(true);
});
it("forwards both editing paths to the route's existing owner without hidden persistence", () => {
  const update = vi.fn();
  render(
    <SheetExposureSection
      value={35}
      base={base}
      attributeBudget={12}
      attributeCap={4}
      canEdit
      onValueChange={update}
    />,
  );
  fireEvent.change(screen.getByRole("spinbutton", { name: "Exposição atual" }), {
    target: { value: "45" },
  });
  fireEvent.change(screen.getByRole("slider", { name: "Ajustar exposição" }), {
    target: { value: "50" },
  });
  expect(update.mock.calls).toEqual([[45], [50]]);
});
