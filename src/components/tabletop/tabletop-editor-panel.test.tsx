// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { TabletopEditorPanel } from "./tabletop-editor-panel";
import { TabletopStagePortal } from "./tabletop-stage-portal";
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.querySelectorAll("[data-tabletop-stage-portal]").forEach((e) => e.remove());
});
function media(compact: boolean) {
  vi.stubGlobal("matchMedia", () => ({
    matches: compact,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}
it("keeps the wide editor as a non-modal aside", () => {
  media(false);
  render(
    <TabletopEditorPanel open={false} collapsed={false} onOpenChange={vi.fn()}>
      <button>Editar objeto</button>
    </TabletopEditorPanel>,
  );
  expect(
    screen.getByRole("complementary", { name: "Painel de edição da Mesa Nexus" }),
  ).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Editar objeto" })).toBeTruthy();
});
it("opens a compact dialog, handles Escape and returns focus to its origin", async () => {
  media(true);
  const change = vi.fn();
  const tree = (open: boolean) => (
    <>
      <button>Abrir editor</button>
      <TabletopEditorPanel open={open} collapsed={false} onOpenChange={change}>
        <button>Editar objeto</button>
      </TabletopEditorPanel>
    </>
  );
  const view = render(tree(false));
  const trigger = screen.getByRole("button", { name: "Abrir editor" });
  trigger.focus();
  view.rerender(tree(true));
  const dialog = await screen.findByRole("dialog", { name: "Editor da Mesa" });
  await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(change).toHaveBeenCalledWith(false);
  view.rerender(tree(false));
  await waitFor(() => expect(document.activeElement).toBe(trigger));
});
it("moves a stage portal only when the runtime publishes a new surface", () => {
  const first = document.createElement("div");
  first.setAttribute("data-tabletop-stage-portal", "");
  document.body.append(first);
  render(
    <TabletopStagePortal>
      <button>Controle do mapa</button>
    </TabletopStagePortal>,
  );
  expect(first.querySelector("button")?.textContent).toBe("Controle do mapa");
  first.remove();
  const next = document.createElement("div");
  next.setAttribute("data-tabletop-stage-portal", "");
  document.body.append(next);
  fireEvent(window, new Event("tadeon-tabletop-render"));
  expect(first.querySelector("button")).toBeNull();
  expect(next.querySelector("button")?.textContent).toBe("Controle do mapa");
});
