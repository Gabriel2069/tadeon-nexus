// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { HomePage } from "../routes/index";
const mock = vi.hoisted(() => ({ user: { id: "a", email: "a@test.invalid" }, query: vi.fn(), cache: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mock.user, profile: null, role: "jogador" }) }));
vi.mock("@/lib/offline-cache", () => ({ cacheSheetSummaries: mock.cache }));
vi.mock("@/components/protected-shell", () => ({ ProtectedShell: ({ children }: {children: unknown}) => children }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  createFileRoute: () => (options: unknown) => options,
  useNavigate: () => vi.fn(),
  Link: ({ children }: {children: unknown}) => children,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ order: () => ({ eq: (_field: string, id: string) => mock.query(id) }) }) }) } }));
function deferred() {
  let resolve!: (value: { data: unknown[] | null; error: unknown }) => void;
  const promise = new Promise<{ data: unknown[] | null; error: unknown }>(ok => { resolve = ok; });
  return { promise, resolve };
}
const row = (owner: string, name: string) => ({id: owner, owner_id: owner, name, occupation: "", exposure: 12});
beforeEach(() => { mock.user = {id:"a",email:"a@test.invalid"}; mock.query.mockReset(); mock.cache.mockReset(); });
afterEach(cleanup);
it("distinguishes failed reads from empty data and retries without caching a failure", async () => {
  mock.query.mockResolvedValueOnce({data:null,error:{message:"failure"}}).mockResolvedValueOnce({data:[row("a","Novo fio")],error:null});
  render(<HomePage />);
  await screen.findByRole("alert");
  expect(screen.queryByText("O arquivo ainda está vazio.")).toBeNull();
  expect(mock.cache).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Tentar novamente"}));
  await screen.findByText("Novo fio");
  expect(mock.cache).toHaveBeenCalledWith([row("a","Novo fio")],{userId:"a",role:"jogador"});
  expect(screen.queryByRole("alert")).toBeNull();
});
it("ignores an older account response after the new account has loaded", async () => {
  const old = deferred(), current = deferred();
  mock.query.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(<HomePage />);
  mock.user = {id:"b",email:"b@test.invalid"}; view.rerender(<HomePage />);
  await act(async () => current.resolve({data:[row("b","Fio atual")],error:null}));
  await act(async () => old.resolve({data:[row("a","Fio antigo")],error:null}));
  expect(screen.getByText("Fio atual")).toBeTruthy();
  expect(screen.queryByText("Fio antigo")).toBeNull();
  expect(mock.cache).toHaveBeenCalledTimes(1);
  expect(mock.cache).toHaveBeenCalledWith([row("b","Fio atual")],{userId:"b",role:"jogador"});
});
it("ignores a response after unmount, including its cache write", async () => {
  const pending=deferred(); mock.query.mockReturnValue(pending.promise);
  const view=render(<HomePage />); view.unmount();
  await act(async () => pending.resolve({data:[row("a","Fio tardio")],error:null}));
  expect(mock.cache).not.toHaveBeenCalled();
});
