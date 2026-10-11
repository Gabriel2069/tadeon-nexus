// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { Route } from "../routes/sheet.$id";
const SheetRoute = Route.options.component as (() => React.ReactElement) & {
  preload?: () => Promise<unknown>;
};
beforeAll(async () => {
  await SheetRoute.preload?.();
});
const mock = vi.hoisted(() => ({
  user: { id: "a" },
  role: "jogador",
  id: "sheet-a",
  reads: [] as { signal: AbortSignal; resolve: (value: unknown) => void }[],
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mock.user, role: mock.role }) }));
vi.mock("@/components/protected-shell", () => ({
  ProtectedShell: ({ children }: { children: unknown }) => children,
}));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  createFileRoute: () => (options: object) => ({ options, useParams: () => ({ id: mock.id }) }),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          abortSignal: (signal: AbortSignal) => ({
            maybeSingle: () => new Promise((resolve) => mock.reads.push({ signal, resolve })),
          }),
        }),
      }),
    }),
    rpc: () => ({ abortSignal: () => Promise.resolve({ data: {}, error: null }) }),
  },
}));
beforeEach(() => {
  mock.user = { id: "a" };
  mock.role = "jogador";
  mock.id = "sheet-a";
  mock.reads = [];
});
afterEach(cleanup);
for (const boundary of ["account", "role", "record"] as const) {
  it(`invalidates loading and late errors across a ${boundary} transition`, async () => {
    const view = render(<SheetRoute />);
    await waitFor(() => expect(mock.reads).toHaveLength(1));
    if (boundary === "account") mock.user = { id: "b" };
    if (boundary === "role") mock.role = "espectador";
    if (boundary === "record") mock.id = "sheet-b";
    view.rerender(<SheetRoute />);
    await waitFor(() => expect(mock.reads).toHaveLength(2));
    expect(mock.reads[0].signal.aborted).toBe(true);
    await act(async () =>
      mock.reads[0].resolve({ data: null, error: { message: "old account error" } }),
    );
    expect(screen.queryByText("A ficha não pôde ser aberta")).toBeNull();
    expect(screen.getByRole("status", { name: "Carregando ficha" })).toBeTruthy();
    await act(async () =>
      mock.reads[1].resolve({ data: null, error: { message: "current error" } }),
    );
    expect(screen.getByText("A ficha não pôde ser aberta")).toBeTruthy();
    expect(screen.queryByRole("status", { name: "Carregando ficha" })).toBeNull();
  });
}
