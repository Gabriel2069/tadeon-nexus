import { Folder, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  KNOWLEDGE_COLLECTIONS,
  matchesKnowledgeCollection,
  type KnowledgeCollection,
} from "@/lib/knowledge/knowledge-collections";
import type { KnowledgeNodeType } from "@/lib/nexus-contracts";

export function KnowledgeCollectionFilter({
  nodes,
  value,
  onChange,
}: {
  nodes: ReadonlyArray<{ node_type: KnowledgeNodeType }>;
  value: KnowledgeCollection;
  onChange: (value: KnowledgeCollection) => void;
}) {
  return (
    <details className="tadeon-nexus-collections">
      <summary>
        <Folder aria-hidden="true" />
        <span>Categorias neste resultado</span>
      </summary>
      <div
        className="tadeon-nexus-collections__items"
        role="group"
        aria-label="Categorias das páginas carregadas"
      >
        {KNOWLEDGE_COLLECTIONS.map((entry) => {
          const count = nodes.filter((node) =>
            matchesKnowledgeCollection(node.node_type, entry.id),
          ).length;
          const active = value === entry.id;
          const Icon = active ? FolderOpen : Folder;
          return (
            <Button
              key={entry.id}
              variant="ghost"
              size="sm"
              aria-pressed={active}
              onClick={() => onChange(entry.id)}
            >
              <Icon aria-hidden="true" />
              <span>{entry.label}</span>
              <span className="tadeon-nexus-collections__count">{count}</span>
            </Button>
          );
        })}
      </div>
      <p>As contagens se referem às páginas carregadas neste resultado.</p>
    </details>
  );
}
