// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NexusToolsPage } from "@/routes/nexus-tools";
const mock = vi.hoisted(() => ({
  actor: "master-a",
  getUser: vi.fn(),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: mock.actor }, role: "mestre" }) }));
vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: unknown) => options,
}));
vi.mock("@/components/protected-shell", () => ({
  ProtectedShell: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("sonner", () => ({
  toast: { success: mock.success, error: mock.error, warning: vi.fn() },
}));
vi.mock("@/lib/nexus-backup", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/nexus-backup")>()),
  listSnapshots: async () => [],
}));
const entry = {
  id: "error-a",
  fingerprint: "example",
  message: "Falha de exemplo",
  route: "/",
  source: "fixture",
  severity: "error",
  context: {},
  created_at: "2026-10-15T00:00:00Z",
};
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: mock.getUser },
    rpc: async () => ({ data: "2026-10-15T00:00:00Z", error: null }),
    from: (table: string) => {
      const result = {
        data: table === "app_error_logs" ? [entry] : [],
        count: table === "app_error_logs" ? 1 : 0,
        error: null,
      };
      const query = {
        select: () => query,
        eq: () => query,
        is: () => query,
        order: () => query,
        limit: () => query,
        maybeSingle: async () => ({ data: { id: "global", rules_version: 1 }, error: null }),
        update: (value: unknown) => {
          mock.update(value);
          return query;
        },
        then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
      };
      return query;
    },
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  mock.actor = "master-a";
  mock.getUser.mockImplementation(async () => ({ data: { user: { id: mock.actor } } }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
async function openError() {
  const tab = screen.getByRole("tab", { name: "Diagnóstico" });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
  const message = await screen.findByText("Falha de exemplo");
  fireEvent.click(message.closest("summary")!);
  return screen.getByRole("button", { name: "Marcar como resolvido" });
}
it("does not resolve an error using a session that arrived after an account switch", async () => {
  const view = render(<NexusToolsPage />);
  const button = await openError();
  let resolveOld!: (value: { data: { user: { id: string } } }) => void;
  mock.getUser.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  fireEvent.click(button);
  mock.actor = "master-b";
  view.rerender(<NexusToolsPage />);
  await act(async () => resolveOld({ data: { user: { id: "master-a" } } }));
  expect(mock.update).not.toHaveBeenCalled();
  expect(mock.success).not.toHaveBeenCalled();
});
it("resolves an occurrence only for the verified initiating account", async () => {
  render(<NexusToolsPage />);
  fireEvent.click(await openError());
  await waitFor(() =>
    expect(mock.update).toHaveBeenCalledWith(expect.objectContaining({ resolved_by: "master-a" })),
  );
  await waitFor(() =>
    expect(mock.success).toHaveBeenCalledWith("Ocorrência marcada como resolvida."),
  );
});
