// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

function Fixture() {
  return (
    <form>
      <Select name="view" defaultValue="alpha">
        <SelectTrigger aria-label="Enquadramento">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alpha">Visão ampla</SelectItem>
          <SelectItem value="beta">Seleção</SelectItem>
        </SelectContent>
      </Select>
    </form>
  );
}
function preference(initial: boolean) {
  let reduced = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query.includes("prefers-reduced-motion") && reduced;
    },
    addEventListener: (_: string, callback: () => void) => listeners.add(callback),
    removeEventListener: (_: string, callback: () => void) => listeners.delete(callback),
  }));
  return (next: boolean) =>
    act(() => {
      reduced = next;
      listeners.forEach((callback) => callback());
    });
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("keeps the selected label when initially closed with reduced motion", async () => {
  preference(true);
  const view = render(<Fixture />);
  await waitFor(() => expect(view.getByRole("combobox").textContent).toBe("Visão ampla"));
  await waitFor(() =>
    expect(new window.FormData(view.container.querySelector("form")!).get("view")).toBe("alpha"),
  );
});
it("keeps the selected label when the preference changes while closed", async () => {
  const change = preference(false);
  const view = render(<Fixture />);
  await waitFor(() => expect(view.getByRole("combobox").textContent).toBe("Visão ampla"));
  await waitFor(() =>
    expect(new window.FormData(view.container.querySelector("form")!).get("view")).toBe("alpha"),
  );
  change(true);
  await waitFor(() => expect(view.getByRole("combobox").textContent).toBe("Visão ampla"));
  await waitFor(() =>
    expect(new window.FormData(view.container.querySelector("form")!).get("view")).toBe("alpha"),
  );
});
