// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ManageUsersPage } from "@/routes/manage-users";
const mock = vi.hoisted(() => ({
  actor: "master-a",
  list: vi.fn(),
  change: vi.fn(),
  remove: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: mock.actor }, role: "mestre" }) }));
vi.mock("@/lib/admin-users.functions", () => ({
  listUsersFn: mock.list,
  changeUserRoleFn: mock.change,
  deleteUserFn: mock.remove,
}));
vi.mock("sonner", () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => options,
}));
vi.mock("@/components/protected-shell", () => ({
  ProtectedShell: ({ children }: { children: React.ReactNode }) => children,
}));
const users = [
  { id: "master-a", full_name: "Mestre atual", email: "master@nexus.test", role: "mestre" },
  { id: "player", full_name: "Guardiã", email: "guardia@nexus.test", role: "jogador" },
  { id: "viewer", full_name: "Cronista", email: "cronista@nexus.test", role: "espectador" },
];
beforeEach(() => {
  vi.clearAllMocks();
  mock.actor = "master-a";
  mock.list.mockResolvedValue({ users });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});
afterEach(cleanup);
it("searches people and clears an empty result without mutating users", async () => {
  render(<ManageUsersPage />);
  await screen.findByText("Guardiã");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "guardia@" } });
  expect(screen.getByText("Guardiã")).toBeTruthy();
  expect(screen.queryByText("Cronista")).toBeNull();
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "missing" } });
  expect(screen.getByText("Nenhuma pessoa encontrada")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
  expect(screen.getByText("Cronista")).toBeTruthy();
  expect(mock.remove).not.toHaveBeenCalled();
});
it("protects self-management and keeps a failed deletion review open for retry", async () => {
  mock.remove.mockRejectedValueOnce(new Error("unavailable"));
  render(<ManageUsersPage />);
  await screen.findByText("Guardiã");
  expect(
    screen.getByRole("button", { name: "Excluir Mestre atual" }).hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Excluir Guardiã" }));
  expect(mock.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Excluir conta" }));
  await waitFor(() => expect(mock.error).toHaveBeenCalled());
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(screen.getAllByText("Guardiã")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
});
it("does not apply a late list response to a different verified account", async () => {
  let resolveOld!: (value: { users: typeof users }) => void;
  mock.list.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  const view = render(<ManageUsersPage />);
  mock.actor = "master-b";
  mock.list.mockResolvedValue({ users: [] });
  view.rerender(<ManageUsersPage />);
  await screen.findByText("Nenhum usuário cadastrado");
  await act(async () => resolveOld({ users }));
  expect(screen.queryByText("Guardiã")).toBeNull();
});
it("recovers list failures through an explicit retry", async () => {
  mock.list.mockRejectedValueOnce(new Error("network"));
  render(<ManageUsersPage />);
  await screen.findByText("Não foi possível carregar os usuários.");
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByText("Guardiã");
});
it("requires confirmation for role changes and keeps the previous role after cancellation", async () => {
  render(<ManageUsersPage />);
  await screen.findByText("Guardiã");
  const trigger = screen.getByRole("combobox", { name: "Papel de Guardiã" });
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.click(await screen.findByRole("option", { name: "Mestre" }));
  await screen.findByRole("alertdialog");
  expect(mock.change).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(trigger.textContent).toContain("Jogador");
});
