export type KnowledgeDraft = { title: string; content: string; updatedAt: string };
/** Local recovery only: no shared content cache and no unowned legacy draft adoption. */
export function createKnowledgeDraftStore(
  actorId: string,
  workspaceId: string,
  storage: () => Storage,
) {
  const memory = new Map<string, KnowledgeDraft>();
  const key = (id: string) => `tadeon.nexus.draft.v2.${actorId}.${workspaceId}.${id}`;
  return {
    get(id: string): KnowledgeDraft | undefined {
      if (memory.has(id)) return memory.get(id);
      try {
        const raw = storage().getItem(key(id));
        if (!raw) return;
        const d = JSON.parse(raw);
        if (
          typeof d.title === "string" &&
          typeof d.content === "string" &&
          typeof d.updatedAt === "string"
        ) {
          memory.set(id, d);
          return d;
        }
      } catch {
        /* Storage failure must not prevent editing. */
      }
    },
    put(id: string, draft: KnowledgeDraft) {
      memory.set(id, draft);
      try {
        storage().setItem(key(id), JSON.stringify(draft));
      } catch {
        /* In-memory recovery remains available. */
      }
    },
    remove(id: string) {
      memory.delete(id);
      try {
        storage().removeItem(key(id));
      } catch {
        /* Recovery is best effort. */
      }
    },
    settle(id: string, submitted: KnowledgeDraft, updatedAt: string) {
      const current = this.get(id);
      if (!current || (current.title === submitted.title && current.content === submitted.content))
        this.remove(id);
      else this.put(id, { ...current, updatedAt });
    },
  };
}
