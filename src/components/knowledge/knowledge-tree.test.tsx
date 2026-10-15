// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KnowledgeTree } from "./knowledge-tree";
import { knowledgeTreeRows, knowledgeTreePositions } from "@/lib/knowledge/knowledge-tree";
afterEach(cleanup);
const nodes = [
  { id: "root", title: "Arquivo", parent_node_id: null },
  { id: "child", title: "Memória", parent_node_id: "root" },
  { id: "leaf", title: "Vestígio", parent_node_id: "child" },
  { id: "missing", title: "Importado", parent_node_id: "unavailable" },
];
describe("knowledge reading tree", () => {
  it("keeps imported or cyclic pages discoverable once, and hides collapsed descendants", () => {
    const cyclic = [
      ...nodes,
      { id: "a", title: "A", parent_node_id: "b" },
      { id: "b", title: "B", parent_node_id: "a" },
    ];
    const all = knowledgeTreeRows(cyclic, new Set());
    expect(new Set(all.map((r) => r.node.id)).size).toBe(cyclic.length);
    expect(all.find((r) => r.node.id === "leaf")?.depth).toBe(2);
    expect(all.find((r) => r.node.id === "missing")?.depth).toBe(0);
    expect(
      knowledgeTreeRows(cyclic, new Set(["root"])).some((r) =>
        ["child", "leaf"].includes(r.node.id),
      ),
    ).toBe(false);
    const positions = knowledgeTreePositions(
      cyclic.map((n) => ({ ...n, parentNodeId: n.parent_node_id })),
    );
    expect(positions.get("leaf")!.x).toBeGreaterThan(positions.get("child")!.x);
    expect(new Set([...positions.values()].map((p) => `${p.x}:${p.y}`)).size).toBe(cyclic.length);
  });
  it("navigates, collapses and opens through the keyboard without opening on disclosure", () => {
    const open = vi.fn();
    const view = render(<KnowledgeTree nodes={nodes} selectedId="root" onOpen={open} />);
    const root = view.getByRole("treeitem", { name: "Arquivo" });
    expect(view.getByRole("treeitem", { name: "Memória" })).toBeTruthy();
    root.focus();
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toContain("Memória");
    fireEvent.keyDown(document.activeElement!, { key: "Enter" });
    expect(open).toHaveBeenCalledWith("child");
    fireEvent.click(view.getByRole("button", { name: "Recolher Arquivo" }));
    expect(view.getAllByRole("treeitem")).toHaveLength(2);
    expect(open).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(root, { key: "ArrowRight" });
    expect(view.getAllByRole("treeitem")).toHaveLength(4);
    fireEvent.keyDown(root, { key: "End" });
    expect(document.activeElement?.textContent).toContain("Importado");
  });
  it("reveals the ancestors when another page becomes active", () => {
    const view = render(<KnowledgeTree nodes={nodes} selectedId="root" onOpen={() => {}} />);
    fireEvent.click(view.getByRole("button", { name: "Recolher Arquivo" }));
    view.rerender(<KnowledgeTree nodes={nodes} selectedId="leaf" onOpen={() => {}} />);
    expect(view.getAllByRole("treeitem")).toHaveLength(4);
    expect(
      view.getAllByRole("treeitem").find((n) => n.getAttribute("aria-selected") === "true")
        ?.textContent,
    ).toContain("Vestígio");
  });
});
