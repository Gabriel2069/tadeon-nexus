import { describe, expect, it } from "vitest";
import { createKnowledgeDraftStore } from "./knowledge-drafts";
import { parseReadingPreferences } from "./use-reading-preferences";
const draft = { title: "Título", content: "Novo fio", updatedAt: "v1" };
function storage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  } as Storage;
}
describe("scoped draft recovery", () => {
  it("isolates users/workspaces and never adopts an unowned legacy entry", () => {
    const s = storage();
    s.setItem("tadeon.nexus.draft.node", JSON.stringify(draft));
    const a = createKnowledgeDraftStore("a", "work", () => s);
    expect(a.get("node")).toBeUndefined();
    a.put("node", draft);
    expect(createKnowledgeDraftStore("b", "work", () => s).get("node")).toBeUndefined();
    expect(createKnowledgeDraftStore("a", "other", () => s).get("node")).toBeUndefined();
    expect(createKnowledgeDraftStore("a", "work", () => s).get("node")).toEqual(draft);
  });
  it("retains newer edits and advances their base after the earlier submission succeeds", () => {
    const a = createKnowledgeDraftStore("a", "work", storage);
    a.put("n", draft);
    a.put("n", { ...draft, content: "Fio posterior" });
    a.settle("n", draft, "v2");
    expect(a.get("n")).toEqual({ ...draft, content: "Fio posterior", updatedAt: "v2" });
    a.settle("n", a.get("n")!, "v3");
    expect(a.get("n")).toBeUndefined();
  });
  it("keeps an in-memory draft when storage is blocked", () => {
    const a = createKnowledgeDraftStore("a", "work", () => {
      throw new Error("blocked");
    });
    a.put("n", draft);
    expect(a.get("n")).toEqual(draft);
    a.settle("n", draft, "v2");
    expect(a.get("n")).toBeUndefined();
  });
  it("bounds panel preferences and rejects corrupt or incompatible data", () => {
    expect(
      parseReadingPreferences('{"version":1,"view":"split","horizontal":99,"vertical":5}'),
    ).toEqual({ view: "split", horizontal: 70, vertical: 30 });
    expect(parseReadingPreferences("broken").horizontal).toBe(50);
    expect(parseReadingPreferences('{"version":9,"view":"graph"}').view).toBe("document");
  });
});
