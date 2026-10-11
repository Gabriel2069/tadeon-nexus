// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";
import { cacheSheet, readOfflineCache, setOfflineCacheScope } from "./offline-cache";

const mock = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: AuthChangeEvent, session: Session | null) => void),
  query: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (listener: typeof mock.listener) => {
        mock.listener = listener;
        return { data: { subscription: { unsubscribe: mock.unsubscribe } } };
      },
      signOut: vi.fn(),
    },
    from: (table: string) => ({
      select: () => ({
        eq: (_field: string, id: string) => ({ maybeSingle: () => mock.query(table, id) }),
      }),
    }),
  },
}));
function session(id: string): Session {
  return { user: { id } } as Session;
}
function Probe() {
  const { user, role, loading } = useAuth();
  return (
    <output data-testid="session">{JSON.stringify({ id: user?.id ?? null, role, loading })}</output>
  );
}
function state() {
  return JSON.parse(screen.getByTestId("session").textContent!);
}
async function emit(event: AuthChangeEvent, id: string | null) {
  await act(async () => {
    mock.listener!(event, id ? session(id) : null);
  });
}
async function flushTimer() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  mock.query.mockReset();
  mock.unsubscribe.mockReset();
  mock.query.mockImplementation(async (table: string, id: string) => ({
    data: table === "profiles" ? { id } : { role: "jogador" },
    error: null,
  }));
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
});
afterEach(() => {
  cleanup();
  setOfflineCacheScope(null);
  vi.useRealTimers();
});

describe("session lifecycle", () => {
  it("defers profile calls and prevents a queued login from restoring a signed-out session", async () => {
    await emit("INITIAL_SESSION", "a");
    expect(mock.query).not.toHaveBeenCalled();
    await emit("SIGNED_OUT", null);
    await flushTimer();
    expect(mock.query).not.toHaveBeenCalled();
    expect(state()).toEqual({ id: null, role: null, loading: false });
  });
  it("drops an in-flight account result after another account signs in", async () => {
    let finishOld!: (result: object) => void;
    mock.query.mockImplementation((table: string, id: string) => {
      if (id === "a" && table === "profiles")
        return new Promise((resolve) => {
          finishOld = resolve;
        });
      return Promise.resolve({
        data: table === "profiles" ? { id } : { role: "jogador" },
        error: null,
      });
    });
    await emit("INITIAL_SESSION", "a");
    await flushTimer();
    await emit("SIGNED_IN", "b");
    await act(async () => {
      finishOld({ data: { id: "a" }, error: null });
    });
    expect(state().loading).toBe(true);
    await flushTimer();
    expect(state()).toEqual({ id: "b", role: "jogador", loading: false });
  });
  it("does not release protected content when a token event arrives during hydration", async () => {
    let resolveProfile!: (result: object) => void;
    mock.query.mockImplementation((table: string) =>
      table === "profiles"
        ? new Promise((resolve) => {
            resolveProfile = resolve;
          })
        : Promise.resolve({ data: { role: "jogador" }, error: null }),
    );
    await emit("INITIAL_SESSION", "a");
    await flushTimer();
    await emit("TOKEN_REFRESHED", "a");
    expect(state().loading).toBe(true);
    await act(async () => {
      resolveProfile({ data: { id: "a" }, error: null });
    });
    expect(state().loading).toBe(false);
  });
  it("establishes the verified cache scope and destroys it on logout", async () => {
    await emit("INITIAL_SESSION", "a");
    await flushTimer();
    expect(cacheSheet({ id: "private" }, { userId: "a", role: "jogador" })).toBe(true);
    await emit("SIGNED_OUT", null);
    expect(readOfflineCache().sheets).toEqual({});
    expect(localStorage.getItem("tadeon.nexus.offline.v2.a.jogador")).toBeNull();
  });
  it("cancels the deferred hydration on unmount", async () => {
    await emit("INITIAL_SESSION", "a");
    cleanup();
    await flushTimer();
    expect(mock.query).not.toHaveBeenCalled();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
