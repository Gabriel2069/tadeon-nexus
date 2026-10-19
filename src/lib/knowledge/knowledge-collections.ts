import type { KnowledgeNodeType } from "@/lib/nexus-contracts";

/** Facets of the loaded result page, never a second catalogue or parent tree. */
export const KNOWLEDGE_COLLECTIONS = [
  { id: "all", label: "Tudo", types: [] },
  {
    id: "people",
    label: "Pessoas",
    types: ["character", "npc", "creature", "people", "organization"],
  },
  {
    id: "world",
    label: "Mundo",
    types: [
      "kingdom",
      "region",
      "city",
      "location",
      "river",
      "sea",
      "terrain",
      "tectonic_plate",
      "culture",
      "religion",
      "language",
    ],
  },
  { id: "story", label: "História", types: ["historical_event", "plot", "clue", "session"] },
  { id: "rules", label: "Regras", types: ["rule", "concept"] },
  {
    id: "items",
    label: "Itens e poderes",
    types: ["fragment", "transcendental_ability", "weapon", "object"],
  },
  { id: "archive", label: "Documentos", types: ["document", "map", "campaign", "free_note"] },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  types: readonly KnowledgeNodeType[];
}>;

export type KnowledgeCollection = (typeof KNOWLEDGE_COLLECTIONS)[number]["id"];

export function matchesKnowledgeCollection(
  type: KnowledgeNodeType,
  collection: KnowledgeCollection,
) {
  if (collection === "all") return true;
  const types: readonly KnowledgeNodeType[] =
    KNOWLEDGE_COLLECTIONS.find((entry) => entry.id === collection)?.types ?? [];
  return types.includes(type);
}
