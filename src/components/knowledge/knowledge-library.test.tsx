// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ search: vi.fn() }));
vi.mock("@/components/ui/route-popup-frame", () => ({
  useRoutePopupFrame: () => ({ boundary: null, style: {} }),
  usePopupPortalContainer: () => undefined,
}));
vi.mock("@/lib/knowledge/knowledge-service", () => ({
  knowledgeService: { search: m.search, listFavoriteNodes: vi.fn().mockResolvedValue([]) },
}));
vi.mock("@/lib/knowledge/knowledge-library-service", () => ({
  knowledgeLibraryService: {
    canManageWorkspace: vi.fn().mockResolvedValue(false),
    listTemplates: vi.fn().mockResolvedValue([]),
    listSheets: vi.fn().mockResolvedValue([]),
  },
}));
import { KnowledgeLibrary } from "./knowledge-library";
const node = {
  id: "page-a",
  title: "O fio preservado",
  node_type: "document",
  status: "draft",
  summary: "Memória do arquivo",
  content_markdown: "## Vestígios\n\nConteúdo de leitura.",
  plain_text: "Conteúdo de leitura.",
  updated_at: "2026-10-01",
  properties: {},
};
const result = { hits: [{ node, relevance: 1, snippet: "" }], count: 1, hasMore: false };
const props = {
  open: true,
  onOpenChange: vi.fn(),
  workspaceId: "work",
  campaignId: null,
  campaigns: [],
  onOpenNode: vi.fn(),
  onChanged: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  m.search.mockReset();
  m.search.mockResolvedValue(result);
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("opens a table preview on compact screens and returns focus to the selected title", async () => {
  const view = render(<KnowledgeLibrary {...props} />);
  await view.findByText("1 itens encontrados");
  fireEvent.click(view.getByRole("button", { name: "Visualização em tabela" }));
  const title = within(view.getByRole("table")).getByRole("button", {
    name: "Visualizar O fio preservado",
  });
  fireEvent.click(title);
  await waitFor(() => expect(document.activeElement?.tagName).toBe("H3"));
  expect(view.getByRole("button", { name: "Fechar prévia" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Fechar visualização" }));
  await waitFor(() => expect(document.activeElement).toBe(title));
  expect(view.queryByRole("button", { name: "Fechar prévia" })).toBeNull();
});
it("distinguishes failed reading from empty results and retries the current library", async () => {
  m.search.mockRejectedValueOnce(new Error("offline"));
  const view = render(<KnowledgeLibrary {...props} />);
  const alert = await view.findByRole("alert");
  expect(alert.textContent).toContain("Não foi possível concluir");
  expect(view.queryByText("Nenhum item corresponde à visão e aos filtros.")).toBeNull();
  await act(async () => {
    fireEvent.click(view.getByRole("button", { name: "Tentar novamente" }));
  });
  await view.findByText("1 itens encontrados");
  expect(view.queryByRole("alert")).toBeNull();
  expect(m.search).toHaveBeenCalledTimes(2);
});
