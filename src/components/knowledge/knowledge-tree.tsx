import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { ChevronDown, ChevronRight, FileText, FolderOpen } from "lucide-react";

import { knowledgeTreeRows, type TreeNode } from "@/lib/knowledge/knowledge-tree";
export function KnowledgeTree({
  nodes,
  selectedId,
  onOpen,
}: {
  nodes: TreeNode[];
  selectedId?: string;
  onOpen: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focused, setFocused] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => knowledgeTreeRows(nodes, collapsed), [nodes, collapsed]);
  useEffect(() => {
    if (!selectedId) return;
    const map = new Map(nodes.map((n) => [n.id, n]));
    const ancestors = new Set<string>();
    let parent = map.get(selectedId)?.parent_node_id;
    while (parent && !ancestors.has(parent)) {
      ancestors.add(parent);
      parent = map.get(parent)?.parent_node_id;
    }
    setCollapsed((old) => {
      if (![...ancestors].some((id) => old.has(id))) return old;
      return new Set([...old].filter((id) => !ancestors.has(id)));
    });
  }, [nodes, selectedId]);
  function toggle(id: string) {
    setCollapsed((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function focus(index: number) {
    const row = rows[Math.max(0, Math.min(rows.length - 1, index))];
    if (!row) return;
    setFocused(row.node.id);
    root.current
      ?.querySelectorAll<HTMLElement>('[role="treeitem"]')
      [Math.max(0, Math.min(rows.length - 1, index))]?.focus();
  }
  function key(event: KeyboardEvent, index: number) {
    const { node, hasChildren } = rows[index];
    const k = event.key;
    if (
      ["ArrowDown", "ArrowUp", "Home", "End", "ArrowRight", "ArrowLeft", "Enter", " "].includes(k)
    )
      event.preventDefault();
    if (k === "ArrowDown") focus(index + 1);
    if (k === "ArrowUp") focus(index - 1);
    if (k === "Home") focus(0);
    if (k === "End") focus(rows.length - 1);
    if (k === "ArrowRight" && hasChildren) {
      if (collapsed.has(node.id)) toggle(node.id);
      else focus(index + 1);
    }
    if (k === "ArrowLeft") {
      if (hasChildren && !collapsed.has(node.id)) toggle(node.id);
      else {
        const parent = rows.findIndex((r) => r.node.id === node.parent_node_id);
        if (parent >= 0) focus(parent);
      }
    }
    if (k === "Enter" || k === " ") onOpen(node.id);
  }
  const tabId = rows.some((r) => r.node.id === focused)
    ? focused
    : rows.some((r) => r.node.id === selectedId)
      ? selectedId
      : rows[0]?.node.id;
  return (
    <div
      ref={root}
      role="tree"
      aria-label="Árvore das páginas visíveis"
      className="tadeon-knowledge-tree"
    >
      {rows.map(({ node, depth, hasChildren }, index) => (
        <div
          key={node.id}
          role="treeitem"
          aria-label={node.title}
          aria-level={depth + 1}
          aria-expanded={hasChildren ? !collapsed.has(node.id) : undefined}
          aria-selected={selectedId === node.id}
          tabIndex={node.id === tabId ? 0 : -1}
          onFocus={() => setFocused(node.id)}
          onKeyDown={(e) => key(e, index)}
          onClick={() => onOpen(node.id)}
          style={
            {
              "--tree-depth": Math.min(depth, 12),
              paddingLeft: `${8 + Math.min(depth, 12) * 14}px`,
            } as CSSProperties
          }
        >
          {hasChildren ? (
            <button
              type="button"
              tabIndex={-1}
              aria-label={`${collapsed.has(node.id) ? "Expandir" : "Recolher"} ${node.title}`}
              onKeyDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.id);
              }}
            >
              {collapsed.has(node.id) ? <ChevronRight /> : <ChevronDown />}
            </button>
          ) : (
            <span className="tadeon-knowledge-tree__spacer" />
          )}
          {hasChildren ? <FolderOpen aria-hidden="true" /> : <FileText aria-hidden="true" />}
          <span title={node.title}>{node.title}</span>
        </div>
      ))}
    </div>
  );
}
