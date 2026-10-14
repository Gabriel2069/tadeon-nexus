export type TreeNode = { id: string; title: string; parent_node_id: string | null };
export function knowledgeTreeRows(nodes: TreeNode[], collapsed: Set<string>) {
  const known = new Set(nodes.map((n) => n.id));
  const children = new Map<string | null, TreeNode[]>();
  for (const node of nodes) {
    const parent =
      node.parent_node_id && known.has(node.parent_node_id) && node.parent_node_id !== node.id
        ? node.parent_node_id
        : null;
    children.set(parent, [...(children.get(parent) ?? []), node]);
  }
  for (const group of children.values())
    group.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  const seen = new Set<string>();
  const rows: { node: TreeNode; depth: number; hasChildren: boolean }[] = [];
  function visit(node: TreeNode, depth: number) {
    if (seen.has(node.id)) return;
    seen.add(node.id);
    const descendants = children.get(node.id) ?? [];
    rows.push({ node, depth, hasChildren: descendants.length > 0 });
    if (!collapsed.has(node.id)) for (const child of descendants) visit(child, depth + 1);
    else {
      const mark = (id: string) => {
        if (seen.has(id)) return;
        seen.add(id);
        for (const child of children.get(id) ?? []) mark(child.id);
      };
      for (const child of descendants) mark(child.id);
    }
  }
  for (const root of children.get(null) ?? []) visit(root, 0);
  // Cyclic or incomplete imported hierarchies remain discoverable.
  for (const node of nodes) if (!seen.has(node.id)) visit(node, 0);
  return rows;
}

/** Actual parent hierarchy, including dangling imports and cycles, not graph distance. */
export function knowledgeTreePositions(
  nodes: { id: string; title: string; parentNodeId: string | null }[],
) {
  const rows = knowledgeTreeRows(
    nodes.map((n) => ({ ...n, parent_node_id: n.parentNodeId })),
    new Set(),
  );
  const positions = new Map<string, { x: number; y: number }>();
  rows.forEach(({ node, depth }, index) =>
    positions.set(node.id, { x: depth * 160, y: index * 56 }),
  );
  return positions;
}
