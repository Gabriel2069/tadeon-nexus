// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CharacterArchive, type ArchiveSheet } from "./character-archive";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, ...props }: React.PropsWithChildren<{ params: { id: string } }>) => (
    <a href={`/sheet/${params.id}`} {...props}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
const sheets: ArchiveSheet[] = [
  {
    id: "1",
    name: "Ângela",
    occupation: "Cartógrafa",
    owner_id: "a",
    owner_label: "Tadeu",
    exposure: 20,
  },
  { id: "2", name: "Bruma", occupation: "Guardiã", owner_id: "b", owner_label: "Ana", exposure: 5 },
  {
    id: "3",
    name: "Céu",
    occupation: "Guardiã",
    owner_id: "a",
    owner_label: "Tadeu",
    exposure: 12,
  },
];
const props = {
  sheets,
  userId: "a",
  busy: false,
  canDelete: (sheet: ArchiveSheet) => sheet.owner_id === "a",
  onDelete: vi.fn(),
};

it("combines accent-insensitive discovery with ownership, then clears to the full authorized list", () => {
  render(<CharacterArchive {...props} />);
  const input = screen.getByRole("searchbox", { name: "Buscar fichas" });
  fireEvent.change(input, { target: { value: "GUARDIA tadeu" } });
  expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Céu");
  fireEvent.click(screen.getByRole("button", { name: "Minhas fichas" }));
  fireEvent.change(input, { target: { value: "ana" } });
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.getByText("Nenhum fio nesta busca.")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(screen.getAllByRole("link")).toHaveLength(3);
  expect(screen.getByRole("button", { name: "Minhas fichas" }).getAttribute("aria-pressed")).toBe(
    "false",
  );
  expect(document.activeElement).toBe(input);
  expect(sheets.map((sheet) => sheet.id)).toEqual(["1", "2", "3"]);
});

it("retains clear-search focus and delegates deletion only for the selected authorized card", () => {
  const onDelete = vi.fn();
  render(<CharacterArchive {...props} onDelete={onDelete} />);
  const input = screen.getByRole("searchbox");
  fireEvent.change(input, { target: { value: "cartografa" } });
  fireEvent.click(screen.getByRole("button", { name: "Excluir ficha Ângela" }));
  expect(onDelete).toHaveBeenCalledWith(sheets[0]);
  fireEvent.click(screen.getByRole("button", { name: "Limpar busca de fichas" }));
  expect(document.activeElement).toBe(input);
  expect(screen.queryByRole("button", { name: "Excluir ficha Bruma" })).toBeNull();
  expect(screen.getAllByRole("link")).toHaveLength(3);
});
