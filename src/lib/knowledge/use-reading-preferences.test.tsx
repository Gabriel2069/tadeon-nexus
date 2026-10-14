// @vitest-environment jsdom
import { act, renderHook, cleanup, waitFor } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { useReadingPreferences } from "./use-reading-preferences";
afterEach(() => {
  cleanup();
  localStorage.clear();
});
it("restores preferences for one user/scope without writing defaults into another", async () => {
  localStorage.setItem(
    "tadeon.nexus.reading.v1.a.work",
    JSON.stringify({ version: 1, view: "split", horizontal: 61, vertical: 48 }),
  );
  const r = renderHook(({ actor, scope }) => useReadingPreferences(actor, scope), {
    initialProps: { actor: "a", scope: "work" },
  });
  await waitFor(() => expect(r.result.current.preferences.horizontal).toBe(61));
  act(() => r.result.current.update({ vertical: 57 }));
  expect(JSON.parse(localStorage.getItem("tadeon.nexus.reading.v1.a.work")!).horizontal).toBe(61);
  r.rerender({ actor: "b", scope: "work" });
  await waitFor(() => expect(r.result.current.preferences.view).toBe("document"));
  expect(localStorage.getItem("tadeon.nexus.reading.v1.b.work")).toBeNull();
  r.rerender({ actor: "a", scope: "work" });
  await waitFor(() => expect(r.result.current.preferences.vertical).toBe(57));
});
