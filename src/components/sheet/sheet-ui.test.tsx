// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Field, Section } from "./sheet-ui";
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
it("associates each field label with its own controlled input", () => {
  const change = vi.fn();
  render(
    <>
      <Field label="Nome" value="Guardião" onChange={change} />
      <Field label="Origem" value="Limiar" onChange={change} disabled />
    </>,
  );
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Aurora" } });
  expect(change).toHaveBeenCalledWith("Aurora");
  expect((screen.getByLabelText("Origem") as HTMLInputElement).disabled).toBe(true);
});
it("renders actions inside their section and collapses without changing the controlled data", () => {
  render(
    <Section id="sec-inv" title="Inventário" extra={<button>Organizar</button>}>
      <p>Corda de linho</p>
    </Section>,
  );
  expect(screen.getByRole("button", { name: "Organizar" }).closest("section")?.id).toBe("sec-inv");
  const toggle = screen.getByRole("button", { name: "Recolher seção Inventário" });
  fireEvent.click(toggle);
  expect(toggle.getAttribute("aria-expanded")).toBe("false");
  expect(localStorage.getItem("tadeon.sheet.section:sec-inv")).toBe("collapsed");
  fireEvent.click(screen.getByRole("button", { name: "Expandir seção Inventário" }));
  expect(screen.getByText("Corda de linho")).toBeTruthy();
});
it("keeps sections usable when browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(
    <Section title="Identidade">
      <p>Nome preservado</p>
    </Section>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Recolher seção Identidade" }));
  expect(
    screen.getByRole("button", { name: "Expandir seção Identidade" }).getAttribute("aria-expanded"),
  ).toBe("false");
});
