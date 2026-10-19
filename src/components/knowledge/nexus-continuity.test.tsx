// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { KnowledgeNode } from "@/lib/knowledge/knowledge-service";
// Multi-step autosave cases include real debounce timers; they are not latency benchmarks.
vi.setConfig({ testTimeout: 15000 });
const m = vi.hoisted(() => ({ get: vi.fn(), saveContent: vi.fn(), from: vi.fn(), actor: "actor" }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: m.actor }, loading: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: m.from } }));
vi.mock("@/components/knowledge/knowledge-reading-panes", () => ({
  KnowledgeReadingPanes: ({ document }: { document: unknown }) => (
    <div>{document as React.ReactNode}</div>
  ),
}));
vi.mock("@/components/knowledge/knowledge-library", () => ({ KnowledgeLibrary: () => null }));
vi.mock("@/components/knowledge/knowledge-portability-dialog", () => ({
  KnowledgePortabilityDialog: () => null,
}));
vi.mock("@/components/assets/asset-picker-dialog", () => ({ AssetPickerDialog: () => null }));
vi.mock("@/lib/knowledge/knowledge-service", () => ({
  knowledgeService: {
    get: m.get,
    saveContent: m.saveContent,
    search: vi.fn(),
    listRecentNodes: vi.fn().mockResolvedValue([]),
    listFavoriteNodes: vi.fn().mockResolvedValue([]),
    listAliases: vi.fn().mockResolvedValue([]),
    listEdges: vi.fn().mockResolvedValue([]),
    listBacklinks: vi.fn().mockResolvedValue([]),
    listBrokenLinks: vi.fn().mockResolvedValue([]),
    listVersions: vi.fn().mockResolvedValue([]),
    listNodeAssets: vi.fn().mockResolvedValue([]),
    resolveWikilinks: vi.fn().mockResolvedValue([]),
    touchRecent: vi.fn().mockResolvedValue(undefined),
  },
}));
import { knowledgeService } from "@/lib/knowledge/knowledge-service";
import { KnowledgeServiceError } from "@/lib/knowledge/knowledge-errors";
import { NexusWorkspace } from "./nexus-workspace";
const nodes = ["Alpha", "Beta"].map(
  (title, i) =>
    ({
      id: title.toLowerCase(),
      workspace_id: "work",
      campaign_id: null,
      title,
      node_type: "document",
      content_markdown: `Texto ${title}`,
      summary: "",
      updated_at: "2026-10-01",
      status: "draft",
      visibility: "workspace",
      properties: {},
      parent_node_id: null,
      created_by: "actor",
    }) as KnowledgeNode,
);
beforeEach(() => {
  m.actor = "actor";
  localStorage.clear();
  m.get.mockReset();
  m.saveContent.mockReset();
  m.get.mockImplementation(async (id: string) => nodes.find((n) => n.id === id));
  vi.mocked(knowledgeService.search).mockResolvedValue({
    hits: nodes.map((node) => ({ node, relevance: 1, snippet: "" })),
    count: 2,
    page: 0,
    pageSize: 30,
    hasMore: false,
  });
  m.from.mockImplementation((name: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      order: () =>
        Promise.resolve({
          data: name === "workspaces" ? [{ id: "work", name: "Arquivo" }] : [],
          error: null,
        }),
    };
    return builder;
  });
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function setup() {
  const v = render(<NexusWorkspace assetsEnabled={false} graphEnabled={false} />);
  await v.findByRole("tab", { name: "Alpha" }, { timeout: 5000 });
  return v;
}
it("closes the last page and reopens it only on request, retaining tab order", async () => {
  const v = await setup();
  fireEvent.click(v.getByRole("treeitem", { name: "Beta" }));
  await v.findByRole("heading", { name: "Beta" });
  fireEvent.click(v.getByRole("tab", { name: "Alpha" }));
  await v.findByRole("heading", { name: "Alpha" });
  const tabs = v.getByRole("tablist", { name: "Páginas abertas" });
  expect([...tabs.querySelectorAll("[role=tab]")].map((e) => e.textContent)).toEqual([
    "Alpha",
    "Beta",
  ]);
  fireEvent.click(v.getByRole("button", { name: "Fechar Alpha" }));
  await v.findByRole("heading", { name: "Beta" });
  fireEvent.click(v.getByRole("button", { name: "Fechar Beta" }));
  await waitFor(() => expect(v.queryByRole("tablist", { name: "Páginas abertas" })).toBeNull());
  expect(v.getByText("Entrada do acervo")).toBeTruthy();
  fireEvent.click(v.getByRole("button", { name: "Reabrir página fechada" }));
  await v.findByRole("heading", { name: "Beta" });
});
it("does not let a late save replace another page or its draft", async () => {
  const v = await setup();
  let release!: (v: unknown) => void;
  m.saveContent.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  fireEvent.click(v.getByRole("button", { name: "Editar" }));
  fireEvent.change(v.getByLabelText("Conteúdo da página"), { target: { value: "Rascunho Alpha" } });
  fireEvent.click(v.getByRole("button", { name: "Salvar agora" }));
  fireEvent.click(v.getByRole("treeitem", { name: "Beta" }));
  await v.findByRole("heading", { name: "Beta" });
  await act(async () =>
    release({
      node: { ...nodes[0], content_markdown: "Rascunho Alpha", updated_at: "2026-10-02" },
    }),
  );
  expect(v.getByRole("heading", { name: "Beta" })).toBeTruthy();
  expect(v.queryByLabelText("Conteúdo da página")).toBeNull();
});
it("preserves edits typed during a save and clears only the accepted version", async () => {
  const v = await setup();
  let release!: (v: unknown) => void;
  m.saveContent.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  fireEvent.click(v.getByRole("button", { name: "Editar" }));
  const input = v.getByLabelText("Conteúdo da página");
  fireEvent.change(input, { target: { value: "Primeiro" } });
  fireEvent.click(v.getByRole("button", { name: "Salvar agora" }));
  fireEvent.change(input, { target: { value: "Posterior" } });
  await act(async () =>
    release({ node: { ...nodes[0], content_markdown: "Primeiro", updated_at: "2026-10-02" } }),
  );
  expect((input as HTMLTextAreaElement).value).toBe("Posterior");
  expect(JSON.parse(localStorage.getItem("tadeon.nexus.draft.v2.actor.work.alpha")!).content).toBe(
    "Posterior",
  );
});

it("resumes autosave after a slow accepted save instead of losing the queued edit", async () => {
  const v = await setup();
  let release!: (v: unknown) => void;
  m.saveContent.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  m.saveContent.mockImplementationOnce(async (node, title, content) => ({
    node: { ...node, title, content_markdown: content, updated_at: "2026-10-03" },
  }));
  fireEvent.click(v.getByRole("button", { name: "Editar" }));
  const input = v.getByLabelText("Conteúdo da página");
  fireEvent.change(input, { target: { value: "Primeiro" } });
  fireEvent.click(v.getByRole("button", { name: "Salvar agora" }));
  fireEvent.change(input, { target: { value: "Posterior" } });
  // Let the new edit's autosave attempt reach the pending-save guard.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  expect(m.saveContent).toHaveBeenCalledTimes(1);
  await act(async () =>
    release({ node: { ...nodes[0], content_markdown: "Primeiro", updated_at: "2026-10-02" } }),
  );
  await waitFor(() => expect(m.saveContent).toHaveBeenCalledTimes(2), { timeout: 2000 });
  expect(m.saveContent.mock.calls[1][0].updated_at).toBe("2026-10-02");
  expect(m.saveContent.mock.calls[1][2]).toBe("Posterior");
  await waitFor(() =>
    expect(localStorage.getItem("tadeon.nexus.draft.v2.actor.work.alpha")).toBeNull(),
  );
});
it("requires a decision before applying a recovered draft to a newer server version", async () => {
  localStorage.setItem(
    "tadeon.nexus.draft.v2.actor.work.alpha",
    JSON.stringify({ title: "Alpha", content: "Meu texto", updatedAt: "2026-09-01" }),
  );
  const v = await setup();
  expect((v.getByLabelText("Conteúdo da página") as HTMLTextAreaElement).value).toBe("Meu texto");
  expect(m.saveContent).not.toHaveBeenCalled();
  fireEvent.click(v.getByRole("button", { name: "Revisar conflito" }));
  await v.findByRole("heading", { name: "Revisar versões da página" });
  fireEvent.click(v.getByRole("button", { name: "Usar versão salva" }));
  expect((v.getByLabelText("Conteúdo da página") as HTMLTextAreaElement).value).toBe("Texto Alpha");
  expect(m.saveContent).not.toHaveBeenCalled();
  expect(localStorage.getItem("tadeon.nexus.draft.v2.actor.work.alpha")).toBeNull();
});
it("keeps a rejected save as a recoverable conflict", async () => {
  const v = await setup();
  m.saveContent.mockRejectedValue(new KnowledgeServiceError("KNOWLEDGE_CONFLICT"));
  fireEvent.click(v.getByRole("button", { name: "Editar" }));
  fireEvent.change(v.getByLabelText("Conteúdo da página"), { target: { value: "Meu texto" } });
  fireEvent.click(v.getByRole("button", { name: "Salvar agora" }));
  await v.findByRole("button", { name: "Revisar conflito" });
  expect(JSON.parse(localStorage.getItem("tadeon.nexus.draft.v2.actor.work.alpha")!).content).toBe(
    "Meu texto",
  );
});

it("does not publish a former actor's save into the next actor's editor", async () => {
  const v = await setup();
  let release!: (v: unknown) => void;
  m.saveContent.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  fireEvent.click(v.getByRole("button", { name: "Editar" }));
  fireEvent.change(v.getByLabelText("Conteúdo da página"), {
    target: { value: "Texto da conta anterior" },
  });
  fireEvent.click(v.getByRole("button", { name: "Salvar agora" }));
  m.actor = "next-actor";
  v.rerender(<NexusWorkspace assetsEnabled={false} graphEnabled={false} />);
  await v.findByRole("heading", { name: "Alpha" });
  await act(async () =>
    release({
      node: { ...nodes[0], content_markdown: "Texto da conta anterior", updated_at: "2026-10-02" },
    }),
  );
  expect(v.queryByText("Texto da conta anterior")).toBeNull();
  expect(localStorage.getItem("tadeon.nexus.draft.v2.next-actor.work.alpha")).toBeNull();
});

it("applies a recovered draft only after consent against the reviewed server version", async () => {
  localStorage.setItem(
    "tadeon.nexus.draft.v2.actor.work.alpha",
    JSON.stringify({ title: "Alpha", content: "Meu texto", updatedAt: "2026-09-01" }),
  );
  const v = await setup();
  m.saveContent.mockImplementationOnce(async (node, title, content) => ({
    node: { ...node, title, content_markdown: content, updated_at: "2026-10-02" },
  }));
  fireEvent.click(v.getByRole("button", { name: "Revisar conflito" }));
  await v.findByRole("heading", { name: "Revisar versões da página" });
  expect(m.saveContent).not.toHaveBeenCalled();
  fireEvent.click(v.getByRole("button", { name: "Aplicar meu rascunho à versão atual" }));
  await waitFor(() => expect(m.saveContent).toHaveBeenCalledTimes(1), { timeout: 2000 });
  expect(m.saveContent.mock.calls[0][0].updated_at).toBe("2026-10-01");
  expect(m.saveContent.mock.calls[0][2]).toBe("Meu texto");
  await waitFor(() =>
    expect(localStorage.getItem("tadeon.nexus.draft.v2.actor.work.alpha")).toBeNull(),
  );
});

it("reloads an initial page for a new actor instead of reusing the previous actor's navigation stamp", async () => {
  const v = render(
    <NexusWorkspace assetsEnabled={false} graphEnabled={false} initialNodeId="alpha" />,
  );
  await v.findByRole("heading", { name: "Alpha" });
  m.get.mockClear();
  m.actor = "next-actor";
  v.rerender(<NexusWorkspace assetsEnabled={false} graphEnabled={false} initialNodeId="alpha" />);
  await waitFor(() => expect(m.get).toHaveBeenCalledWith("alpha"));
  await v.findByRole("heading", { name: "Alpha" });
});

it("opens a deep link after its workspace becomes available", async () => {
  const v = render(
    <NexusWorkspace assetsEnabled={false} graphEnabled={false} initialNodeId="beta" />,
  );
  await v.findByRole("heading", { name: "Beta" }, { timeout: 5000 });
  expect(v.getByRole("tab", { name: "Beta" }).getAttribute("aria-selected")).toBe("true");
});

it("filters loaded categories in tree and list without refetching or closing the reading page", async () => {
  vi.mocked(knowledgeService.search).mockResolvedValue({
    hits: nodes.map((node, i) => ({
      node: { ...node, node_type: i ? "location" : "document" },
      relevance: 1,
      snippet: "",
    })),
    count: 2,
    page: 0,
    pageSize: 30,
    hasMore: false,
  });
  const view = render(
    <NexusWorkspace assetsEnabled={false} graphEnabled={false} initialNodeId="alpha" />,
  );
  await view.findByRole("heading", { name: "Alpha" });
  await waitFor(() => expect(view.getAllByRole("treeitem")).toHaveLength(2));
  const reads = vi.mocked(knowledgeService.search).mock.calls.length;
  fireEvent.click(view.getByText("Categorias neste resultado"));
  fireEvent.click(view.getByRole("button", { name: /Mundo/ }));
  expect(view.getAllByRole("treeitem")).toHaveLength(1);
  expect(view.getByRole("treeitem", { name: "Beta" })).toBeTruthy();
  fireEvent.click(view.getByRole("button", { name: "Mostrar lista de páginas" }));
  expect(view.queryByRole("tree")).toBeNull();
  expect(view.getByRole("heading", { name: "Alpha" })).toBeTruthy();
  expect(view.getByRole("button", { name: /Beta.*Local/ })).toBeTruthy();
  expect(vi.mocked(knowledgeService.search).mock.calls.length).toBe(reads);
  fireEvent.click(view.getByRole("button", { name: /Tudo/ }));
  expect(view.getByText("2 de 2 páginas carregadas · 2 resultados")).toBeTruthy();
});
