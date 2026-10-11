// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useMemo } from "react";
import { useSerializedAutosave } from "./use-serialized-autosave";
const report = vi.hoisted(() => vi.fn());
vi.mock("@/lib/client-error-monitor", () => ({ reportClientError: report }));
beforeEach(() => {
  vi.useFakeTimers();
  report.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((ok, fail) => {
    resolve = ok;
    reject = fail;
  });
  return { promise, resolve, reject };
}
function setup(save = vi.fn<(value: { name: string }) => Promise<void>>().mockResolvedValue()) {
  const hook = renderHook(
    ({ name, enabled }) => {
      const value = useMemo(() => ({ name }), [name]);
      return useSerializedAutosave({ value, enabled, delay: 50, save });
    },
    { initialProps: { name: "original", enabled: true } },
  );
  return { ...hook, save };
}
it("loads a baseline without writing and coalesces edits to the latest value", async () => {
  const { result, rerender, save } = setup();
  await act(() => vi.advanceTimersByTimeAsync(100));
  expect(save).not.toHaveBeenCalled();
  rerender({ name: "first", enabled: true });
  rerender({ name: "latest", enabled: true });
  await act(() => vi.advanceTimersByTimeAsync(50));
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith({ name: "latest" });
  expect(result.current.dirty).toBe(false);
});
it("serializes an edit made while a previous snapshot is saving", async () => {
  const first = deferred();
  const save = vi
    .fn<(value: { name: string }) => Promise<void>>()
    .mockImplementationOnce(() => first.promise)
    .mockResolvedValue();
  const { result, rerender } = setup(save);
  rerender({ name: "first", enabled: true });
  await act(() => vi.advanceTimersByTimeAsync(50));
  rerender({ name: "second", enabled: true });
  await act(() => vi.advanceTimersByTimeAsync(50));
  expect(save).toHaveBeenCalledTimes(1);
  expect(result.current.saving).toBe(true);
  await act(async () => first.resolve());
  expect(save.mock.calls.map(([value]) => value.name)).toEqual(["first", "second"]);
  expect(result.current.dirty).toBe(false);
});
it("keeps edits after a failure and retries the latest snapshot", async () => {
  const save = vi
    .fn<(value: { name: string }) => Promise<void>>()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue();
  const { result, rerender } = setup(save);
  rerender({ name: "retained", enabled: true });
  await act(() => vi.advanceTimersByTimeAsync(50));
  expect(result.current.dirty).toBe(true);
  expect(result.current.saveError).toContain("Não foi possível salvar");
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(save).toHaveBeenLastCalledWith({ name: "retained" });
  expect(result.current.saveError).toBeNull();
  expect(result.current.dirty).toBe(false);
});
it("does not retry or report a late failure after the account's sheet unmounts", async () => {
  const first = deferred();
  const save = vi
    .fn<(value: { name: string }) => Promise<void>>()
    .mockImplementation(() => first.promise);
  const { rerender, unmount } = setup(save);
  rerender({ name: "old account", enabled: true });
  await act(() => vi.advanceTimersByTimeAsync(50));
  unmount();
  await act(async () => first.reject(new Error("late failure")));
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(save).toHaveBeenCalledTimes(1);
  expect(report).not.toHaveBeenCalled();
});
it("never writes a read-only record, including an explicit save request", async () => {
  const { result, rerender, save } = setup();
  rerender({ name: "read only", enabled: false });
  await act(async () => {
    await result.current.saveNow();
  });
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(save).not.toHaveBeenCalled();
});
