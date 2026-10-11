// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomePage } from "../routes/index";
const mock = vi.hoisted(() => ({
  user: { id: "a", email: "a@test.invalid" },
  role: "jogador" as "jogador" | "espectador",
  query: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  navigate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  cache: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mock.user, profile: null, role: mock.role }),
}));
vi.mock("sonner", () => ({ toast: { success: mock.success, error: mock.error } }));
vi.mock("@/lib/offline-cache", () => ({ cacheSheetSummaries: mock.cache }));
vi.mock("@/components/protected-shell", () => ({
  ProtectedShell: ({ children }: { children: unknown }) => children,
}));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => mock.navigate,
  Link: ({ children }: { children: unknown }) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: () => ({ eq: (_field: string, id: string) => mock.query(id) }) }),
      insert: (values: unknown) => ({ select: () => ({ single: () => mock.create(values) }) }),
      delete: () => ({ eq: (_field: string, id: string) => ({ select: () => mock.remove(id) }) }),
    }),
  },
}));
function deferred<T = { data: unknown[] | null; error: unknown }>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const row = (owner: string, name: string) => ({
  id: owner,
  owner_id: owner,
  name,
  occupation: "",
  exposure: 12,
});
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  mock.user = { id: "a", email: "a@test.invalid" };
  mock.role = "jogador";
  mock.create.mockReset();
  mock.remove.mockReset();
  mock.navigate.mockReset();
  mock.success.mockReset();
  mock.error.mockReset();
  mock.query.mockReset();
  mock.cache.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("distinguishes failed reads from empty data and retries without caching a failure", async () => {
  mock.query
    .mockResolvedValueOnce({ data: null, error: { message: "failure" } })
    .mockResolvedValueOnce({ data: [row("a", "Novo fio")], error: null });
  render(<HomePage />);
  await screen.findByRole("alert");
  expect(screen.queryByText("O arquivo ainda está vazio.")).toBeNull();
  expect(mock.cache).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
  await screen.findByText("Novo fio");
  expect(mock.cache).toHaveBeenCalledWith([row("a", "Novo fio")], { userId: "a", role: mock.role });
  expect(screen.queryByRole("alert")).toBeNull();
});
it("ignores an older account response after the new account has loaded", async () => {
  const old = deferred(),
    current = deferred();
  mock.query.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(<HomePage />);
  mock.user = { id: "b", email: "b@test.invalid" };
  view.rerender(<HomePage />);
  await act(async () => current.resolve({ data: [row("b", "Fio atual")], error: null }));
  await act(async () => old.resolve({ data: [row("a", "Fio antigo")], error: null }));
  expect(screen.getByText("Fio atual")).toBeTruthy();
  expect(screen.queryByText("Fio antigo")).toBeNull();
  expect(mock.cache).toHaveBeenCalledTimes(1);
  expect(mock.cache).toHaveBeenCalledWith([row("b", "Fio atual")], {
    userId: "b",
    role: "jogador",
  });
});
it("ignores a response after unmount, including its cache write", async () => {
  const pending = deferred();
  mock.query.mockReturnValue(pending.promise);
  const view = render(<HomePage />);
  view.unmount();
  await act(async () => pending.resolve({ data: [row("a", "Fio tardio")], error: null }));
  expect(mock.cache).not.toHaveBeenCalled();
});

async function startCreate() {
  fireEvent.click(screen.getByRole("button", { name: "Nova ficha" }));
  const input = await screen.findByLabelText("Nome da personagem");
  fireEvent.change(input, { target: { value: "Fio novo" } });
  const form = input.closest("form")!;
  fireEvent.submit(form);
  return form;
}
async function startDelete(name = "Fio original") {
  fireEvent.click(await screen.findByRole("button", { name: `Excluir ficha ${name}` }));
  fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
}
it.each(["account", "account-cycle", "role", "unmount"])(
  "discards late creation UI effects after %s changes",
  async (change) => {
    mock.query.mockResolvedValue({ data: [], error: null });
    const pending = deferred<{ data: { id: string }; error: null }>();
    mock.create.mockReturnValue(pending.promise);
    const view = render(<HomePage />);
    await startCreate();
    if (change === "unmount") view.unmount();
    else {
      if (change === "account" || change === "account-cycle")
        mock.user = { id: "b", email: "b@test.invalid" };
      else mock.role = "espectador";
      view.rerender(<HomePage />);
      if (change === "account-cycle") {
        mock.user = { id: "a", email: "a@test.invalid" };
        view.rerender(<HomePage />);
      }
    }
    await act(async () => pending.resolve({ data: { id: "new" }, error: null }));
    expect(mock.navigate).not.toHaveBeenCalled();
    expect(mock.success).not.toHaveBeenCalled();
    expect(mock.error).not.toHaveBeenCalled();
  },
);
it("prevents duplicate creation and releases the form after a rejected request", async () => {
  mock.query.mockResolvedValue({ data: [], error: null });
  const pending = deferred();
  mock.create.mockReturnValue(pending.promise);
  render(<HomePage />);
  const form = await startCreate();
  fireEvent.submit(form);
  expect(mock.create).toHaveBeenCalledTimes(1);
  await act(async () => pending.reject(new Error("network")));
  expect(mock.error).toHaveBeenCalledWith("Não foi possível criar a ficha.");
  expect(
    (screen.getByRole("button", { name: "Criar" }) as HTMLButtonElement).disabled,
  ).toBe(false);
  mock.create.mockResolvedValue({ data: { id: "new" }, error: null });
  fireEvent.submit(form);
  await waitFor(() =>
    expect(mock.navigate).toHaveBeenCalledWith({ to: "/sheet/$id", params: { id: "new" } }),
  );
});
it.each(["account", "account-cycle", "role", "unmount"])(
  "discards late deletion UI effects after %s changes",
  async (change) => {
    mock.query.mockResolvedValue({ data: [row("a", "Fio original")], error: null });
    const pending = deferred();
    mock.remove.mockReturnValue(pending.promise);
    const view = render(<HomePage />);
    await startDelete();
    const queries = mock.query.mock.calls.length;
    if (change === "unmount") view.unmount();
    else {
      if (change === "account" || change === "account-cycle")
        mock.user = { id: "b", email: "b@test.invalid" };
      else mock.role = "espectador";
      view.rerender(<HomePage />);
      if (change === "account-cycle") {
        mock.user = { id: "a", email: "a@test.invalid" };
        view.rerender(<HomePage />);
      }
    }
    const afterTransition = mock.query.mock.calls.length;
    await act(async () => pending.resolve({ data: [{ id: "a" }], error: null }));
    expect(mock.success).not.toHaveBeenCalled();
    expect(mock.error).not.toHaveBeenCalled();
    expect(mock.query).toHaveBeenCalledTimes(afterTransition);
    expect(afterTransition).toBeGreaterThanOrEqual(queries);
  },
);
it("does not announce deletion or hide a sheet when the API confirms zero affected rows", async () => {
  mock.query.mockResolvedValue({ data: [row("a", "Fio original")], error: null });
  mock.remove.mockResolvedValue({ data: [], error: null });
  render(<HomePage />);
  await startDelete();
  await waitFor(() => expect(mock.error).toHaveBeenCalled());
  expect(mock.success).not.toHaveBeenCalled();
  expect(screen.getByText("Fio original")).toBeTruthy();
  expect(
    (screen.getByRole("button", { name: "Excluir" }) as HTMLButtonElement).disabled,
  ).toBe(false);
});
it("refreshes summaries and counters after a confirmed deletion", async () => {
  mock.query
    .mockResolvedValueOnce({ data: [row("a", "Fio original")], error: null })
    .mockResolvedValueOnce({ data: [], error: null });
  mock.remove.mockResolvedValue({ data: [{ id: "a" }], error: null });
  render(<HomePage />);
  await startDelete();
  await screen.findByText("O arquivo ainda está vazio.");
  expect(mock.success).toHaveBeenCalledWith("Ficha excluída.");
  expect(mock.cache).toHaveBeenLastCalledWith([], { userId: "a", role: "jogador" });
});

it("releases a rejected deletion for retry without a success announcement", async () => {
  mock.query.mockResolvedValue({ data: [row("a", "Fio original")], error: null });
  mock.remove.mockRejectedValue(new Error("network"));
  render(<HomePage />);
  await startDelete();
  await waitFor(() => expect(mock.error).toHaveBeenCalled());
  expect(mock.success).not.toHaveBeenCalled();
  expect(
    (screen.getByRole("button", { name: "Excluir" }) as HTMLButtonElement).disabled,
  ).toBe(false);
});
it("preserves confirmed creation when optional tutorial storage is unavailable", async () => {
  mock.query.mockResolvedValue({ data: [], error: null });
  mock.create.mockResolvedValue({ data: { id: "new" }, error: null });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("storage denied");
  });
  render(<HomePage />);
  await startCreate();
  await waitFor(() => expect(mock.navigate).toHaveBeenCalled());
  expect(mock.success).toHaveBeenCalledWith("Ficha criada!");
  expect(mock.error).not.toHaveBeenCalled();
});
