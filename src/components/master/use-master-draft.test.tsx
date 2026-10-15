// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useMasterDraft } from "./use-master-draft";
afterEach(cleanup);
function deferred() {
  let resolve!: () => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function setup(
  persist = vi
    .fn<(v: { name: string }, signal: AbortSignal) => Promise<void>>()
    .mockResolvedValue(),
) {
  const hook = renderHook(() => useMasterDraft(persist));
  act(() => hook.result.current.load({ name: "Original" }));
  return { ...hook, persist };
}
it("initializes a clean draft without automatic persistence", () => {
  const { result, persist } = setup();
  expect(result.current.dirty).toBe(false);
  expect(persist).not.toHaveBeenCalled();
});
it("deduplicates save requests and preserves edits made during the write", async () => {
  const first = deferred();
  const persist = vi
    .fn<(v: { name: string }, signal: AbortSignal) => Promise<void>>()
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValue();
  const { result } = setup(persist);
  act(() => result.current.update("name", "First"));
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.save();
    expect(result.current.save()).toBe(pending);
  });
  act(() => result.current.update("name", "Latest"));
  await act(async () => first.resolve());
  expect(await pending).toBe(false);
  expect(result.current.value?.name).toBe("Latest");
  expect(result.current.dirty).toBe(true);
  expect(persist).toHaveBeenCalledTimes(1);
  await act(async () => {
    expect(await result.current.save()).toBe(true);
  });
  expect(persist.mock.calls.map(([v]) => v.name)).toEqual(["First", "Latest"]);
  expect(result.current.dirty).toBe(false);
});
it("retains input after failure and retries the current snapshot", async () => {
  const persist = vi
    .fn<(v: { name: string }, signal: AbortSignal) => Promise<void>>()
    .mockRejectedValueOnce(new Error("unavailable"))
    .mockResolvedValue();
  const { result } = setup(persist);
  act(() => result.current.update("name", "Retained"));
  await act(async () => {
    expect(await result.current.save()).toBe(false);
  });
  expect(result.current.dirty).toBe(true);
  expect(result.current.error).toContain("Suas alterações permanecem");
  expect(result.current.value?.name).toBe("Retained");
  await act(async () => {
    expect(await result.current.save()).toBe(true);
  });
  expect(result.current.error).toBeNull();
});
it("aborts the initiating workspace write on unmount and ignores late completion", async () => {
  const first = deferred();
  const persist = vi
    .fn<(v: { name: string }, signal: AbortSignal) => Promise<void>>()
    .mockReturnValue(first.promise);
  const { result, unmount } = setup(persist);
  let pending!: Promise<boolean>;
  act(() => {
    result.current.update("name", "Old identity");
    pending = result.current.save();
  });
  unmount();
  expect(persist.mock.calls[0][1].aborted).toBe(true);
  first.reject(new Error("late failure"));
  expect(await pending).toBe(false);
});
