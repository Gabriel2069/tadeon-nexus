// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  actor: "mestre-a",
  role: "mestre",
  rpc: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: m.actor }, role: m.role }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: m.rpc } }));
vi.mock("sonner", () => ({ toast: { success: m.success, error: m.error } }));
import { WorkspaceActions } from "./workspace-actions";
import { KnowledgeSheetLink } from "./knowledge/knowledge-sheet-link";
beforeEach(() => {
  m.actor = "mestre-a";
  m.role = "mestre";
  vi.clearAllMocks();
  window.history.replaceState({}, "", "/nexus?node=old");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it("opens the selected Nexus page, and preserves the regular Mesa scene without the previous view", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  const view = render(<WorkspaceActions workspace="/nexus" nodeId="alpha" />);
  view.rerender(<WorkspaceActions workspace="/nexus" nodeId="beta" />);
  fireEvent.click(view.getByRole("button", { name: "Abrir O Nexus em nova janela" }));
  expect(open.mock.calls[0][0]).toBe("/nexus?node=beta&popout=1");
  window.history.replaceState({}, "", "/tabletop?scene=scene-a&view=player");
  view.rerender(<WorkspaceActions workspace="/tabletop" />);
  fireEvent.click(view.getByRole("button", { name: "Abrir Mesa Nexus em nova janela" }));
  expect(open.mock.calls[1][0]).toBe("/tabletop?scene=scene-a&popout=1");
  window.history.replaceState({}, "", "/tabletop?popout=1");
  view.rerender(<WorkspaceActions workspace="/tabletop" />);
  expect(view.queryByRole("button")).toBeNull();
});
it("sends one manual session command and does not announce an old account's response", async () => {
  let resolve!: (value: { data: number; error: null }) => void;
  m.rpc.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const view = render(<WorkspaceActions workspace="/master-panel" />);
  const save = view.getByRole("button", { name: "Salvar sessão" });
  fireEvent.click(save);
  fireEvent.click(save);
  expect(m.rpc).toHaveBeenCalledExactlyOnceWith("save_session_sheet_changes");
  expect((save as HTMLButtonElement).disabled).toBe(true);
  m.actor = "mestre-b";
  view.rerender(<WorkspaceActions workspace="/master-panel" />);
  expect((view.getByRole("button", { name: "Salvar sessão" }) as HTMLButtonElement).disabled).toBe(
    false,
  );
  await act(async () => {
    resolve({ data: 3, error: null });
  });
  expect(m.success).not.toHaveBeenCalled();
  expect(m.error).not.toHaveBeenCalled();
});
it("recovers the session control after a network rejection", async () => {
  m.rpc.mockRejectedValue(new Error("offline"));
  const view = render(<WorkspaceActions workspace="/master-panel" />);
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Salvar sessão" }));
  });
  expect(m.error).toHaveBeenCalledOnce();
  expect((view.getByRole("button", { name: "Salvar sessão" }) as HTMLButtonElement).disabled).toBe(
    false,
  );
});
it("drags the current document ID and title after switching pages", () => {
  const view = render(<KnowledgeSheetLink nodeId="alpha" title="Primeiro fio" />);
  view.rerender(<KnowledgeSheetLink nodeId="beta" title="Segundo fio" />);
  const values = new Map<string, string>();
  const transfer = {
    setData: (key: string, value: string) => values.set(key, value),
    effectAllowed: "none",
  };
  fireEvent.dragStart(view.getByRole("button", { name: "Arrastar para ficha" }), {
    dataTransfer: transfer,
  });
  expect(JSON.parse(values.get("application/x-tadeon-nexus-node")!)).toEqual({
    id: "beta",
    label: "Segundo fio",
  });
  expect(values.get("text/plain")).toBe("Segundo fio ~ /nexus?node=beta");
  expect(transfer.effectAllowed).toBe("link");
});
