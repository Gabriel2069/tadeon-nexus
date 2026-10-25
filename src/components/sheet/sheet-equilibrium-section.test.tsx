// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { getEquilibriumEffect } from "@/lib/sheet-types";
import { SheetEquilibriumSection } from "./sheet-equilibrium-section";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
const props = {
  value: 0,
  drift: 0,
  effect: getEquilibriumEffect(0),
  canEdit: true,
  minimum: -5,
  maximum: 5,
  onValueChange: vi.fn(),
  onTension: vi.fn(),
};
it("presents Inteireza as a state without calling its narrative a penalty", () => {
  render(<SheetEquilibriumSection {...props} />);
  expect(screen.getByRole("heading", { name: "Inteireza" })).toBeTruthy();
  expect(screen.getByText("Nenhum bônus ou penalidade.")).toBeTruthy();
  expect(screen.getByText(getEquilibriumEffect(0).penalty)).toBeTruthy();
  expect(screen.queryByText("Penalidade")).toBeNull();
  expect(screen.getByText("Sem tensão acumulada")).toBeTruthy();
});
it("shows actual effects and directional tension, forwarding edits to the existing owner", () => {
  const onValueChange = vi.fn(),
    onTension = vi.fn();
  const { rerender } = render(
    <SheetEquilibriumSection
      {...props}
      value={3}
      drift={2}
      effect={getEquilibriumEffect(3)}
      onValueChange={onValueChange}
      onTension={onTension}
    />,
  );
  expect(screen.getByRole("heading", { name: "Afinidade Cognoscível" })).toBeTruthy();
  expect(screen.getByText("Sem penalidade adicional.")).toBeTruthy();
  expect(screen.getByLabelText("Tensão atual").textContent).toBe("+2");
  expect(screen.getByText("Em direção ao Conhecimento")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Aumentar tensão" }));
  expect(onTension).toHaveBeenCalledWith(1);
  fireEvent.change(screen.getByRole("slider", { name: "Ajustar equilíbrio" }), {
    target: { value: "-2" },
  });
  expect(onValueChange).toHaveBeenCalledWith(-2);
  rerender(
    <SheetEquilibriumSection
      {...props}
      value={-10}
      drift={-3}
      minimum={-10}
      maximum={10}
      effect={getEquilibriumEffect(-10)}
    />,
  );
  expect(screen.getByRole("heading", { name: "Limite do Inverso" })).toBeTruthy();
  expect(screen.getByText(getEquilibriumEffect(-10).penalty)).toBeTruthy();
  expect(screen.getByText("Fonte excepcional")).toBeTruthy();
  expect(screen.getByText("Em direção ao Medo")).toBeTruthy();
});
it("retains the role limits and disables all editing for a reader", () => {
  const { rerender } = render(<SheetEquilibriumSection {...props} canEdit={false} />);
  const slider = screen.getByRole("slider", { name: "Ajustar equilíbrio" }) as HTMLInputElement;
  expect([slider.min, slider.max, slider.disabled]).toEqual(["-5", "5", true]);
  expect(
    (screen.getByRole("spinbutton", { name: "Equilíbrio atual" }) as HTMLInputElement).disabled,
  ).toBe(true);
  for (const name of ["Diminuir tensão", "Aumentar tensão"])
    expect((screen.getByRole("button", { name }) as HTMLButtonElement).disabled).toBe(true);
  rerender(
    <SheetEquilibriumSection
      {...props}
      canEdit={false}
      value={10}
      effect={getEquilibriumEffect(10)}
    />,
  );
  const exceptional = screen.getByRole("slider", {
    name: "Ajustar equilíbrio",
  }) as HTMLInputElement;
  expect([exceptional.min, exceptional.max, exceptional.value, exceptional.disabled]).toEqual([
    "-10",
    "10",
    "10",
    true,
  ]);
});
