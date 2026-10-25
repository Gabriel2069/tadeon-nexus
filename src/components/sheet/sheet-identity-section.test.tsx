// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { DEFAULT_IDENTITY_DATA } from "@/lib/sheet-types";
import { SheetIdentitySection } from "./sheet-identity-section";
import type { SheetData, SheetUpdate } from "./sheet-model";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});
const fixture = {
  name: "Aurora dos fios esquecidos",
  occupation: "Guardiã",
  origin: "Limiar",
  brand: "Fio interrompido",
  identity_data: {
    ...DEFAULT_IDENTITY_DATA,
    links: [{ id: "v1", name: "Sentinela", relation: "Guarda", state: "Presente" }],
  },
} as SheetData;

it("keeps link disclosure in React and reveals a newly added link without losing edits", () => {
  function Identity() {
    const [sheet, setSheet] = useState(fixture);
    const update: SheetUpdate = (key, value) =>
      setSheet((previous) => ({ ...previous, [key]: value }));
    return <SheetIdentitySection sheet={sheet} canEdit update={update} />;
  }
  render(<Identity />);
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: "Nome com uma história longa" },
  });
  fireEvent.change(screen.getByLabelText("Nome do vínculo 1"), {
    target: { value: "Vínculo preservado" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Recolher vínculos" }));
  expect(screen.queryByLabelText("Nome do vínculo 1")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Expandir vínculos" }).getAttribute("aria-expanded"),
  ).toBe("false");
  fireEvent.click(screen.getByRole("button", { name: "Novo vínculo" }));
  expect((screen.getByLabelText("Nome do vínculo 1") as HTMLInputElement).value).toBe(
    "Vínculo preservado",
  );
  expect((screen.getByLabelText("Nome do vínculo 2") as HTMLInputElement).value).toBe("");
  expect((screen.getByLabelText("Nome") as HTMLTextAreaElement).value).toBe(
    "Nome com uma história longa",
  );
});

it("allows a reader to fold links while keeping every edit control disabled", () => {
  const update = vi.fn();
  render(<SheetIdentitySection sheet={fixture} canEdit={false} update={update} />);
  expect(screen.queryByRole("button", { name: "Novo vínculo" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Recolher vínculos" }));
  fireEvent.click(screen.getByRole("button", { name: "Expandir vínculos" }));
  expect((screen.getByLabelText("Nome do vínculo 1") as HTMLInputElement).disabled).toBe(true);
  expect((screen.getByLabelText("Nome") as HTMLTextAreaElement).disabled).toBe(true);
  expect(update).not.toHaveBeenCalled();
});

it("opens the named compact narrative without losing edits when folded again", () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  function Identity() {
    const [sheet, setSheet] = useState(fixture);
    const update: SheetUpdate = (key, value) =>
      setSheet((previous) => ({ ...previous, [key]: value }));
    return <SheetIdentitySection sheet={sheet} canEdit update={update} />;
  }
  render(<Identity />);
  const narrative = screen.getByRole("button", { name: /Convicções e pergunta/ });
  expect(narrative.getAttribute("aria-expanded")).toBe("false");
  expect(screen.queryByLabelText("Convicção")).toBeNull();
  expect((screen.getByLabelText("Nome do vínculo 1") as HTMLTextAreaElement).value).toBe(
    "Sentinela",
  );
  expect(screen.getByRole("button", { name: "Novo vínculo" })).toBeTruthy();
  fireEvent.click(narrative);
  fireEvent.change(screen.getByLabelText("Convicção"), { target: { value: "Guardar este fio" } });
  fireEvent.click(narrative);
  fireEvent.click(narrative);
  expect((screen.getByLabelText("Convicção") as HTMLInputElement).value).toBe("Guardar este fio");
});
