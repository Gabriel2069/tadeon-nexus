import { newTdvMaster } from "./tdv2-master";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cacheMasterState,
  cacheTdv2MasterState,
  clearOfflineCache,
  cacheSheet,
  cacheSheetSummaries,
  readOfflineCache,
  setOfflineCacheScope,
} from "./offline-cache";

const master = { userId: "account-a", role: "mestre" } as const;
const player = { userId: "account-a", role: "jogador" } as const;
const other = { userId: "account-b", role: "jogador" } as const;
const settings = {
  campaign_title: "Secret campaign",
  campaign_phase: "Hidden",
  scenes_detailed: [],
  master_npcs: [],
  investigation_clues: [],
  threats: [],
  interludes: [],
  folds: [],
};
let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
  setOfflineCacheScope(null);
});
afterEach(() => {
  setOfflineCacheScope(null);
  vi.unstubAllGlobals();
});

describe("offline account boundary", () => {
  it("never adopts an unscoped cache or writes before verified authentication", () => {
    storage.set("tadeon.nexus.offline.v1", JSON.stringify({ version: 1, sheets: { secret: {} } }));
    expect(cacheSheet({ id: "secret" }, master)).toBe(false);
    setOfflineCacheScope(master);
    expect(storage.has("tadeon.nexus.offline.v1")).toBe(false);
    expect(readOfflineCache().sheets).toEqual({});
  });
  it("round-trips summaries and sheets for the verified account", () => {
    setOfflineCacheScope(player);
    expect(cacheSheetSummaries([{ id: "sheet-a", name: "Personagem" }], player)).toBe(true);
    expect(cacheSheet({ id: "sheet-a", name: "Personagem" }, player)).toBe(true);
    expect(readOfflineCache().sheetSummaries).toHaveLength(1);
    expect(readOfflineCache().sheets).toHaveProperty("sheet-a");
  });
  it("clears the old account and rejects delayed writes after switching accounts", () => {
    setOfflineCacheScope(master);
    cacheMasterState(settings, [{ id: "private" }], master);
    setOfflineCacheScope(other);
    expect(storage.has("tadeon.nexus.offline.v2.account-a.mestre")).toBe(false);
    expect(cacheSheet({ id: "old-result" }, master)).toBe(false);
    expect(readOfflineCache().master).toBeUndefined();
    expect(readOfflineCache().sheets).toEqual({});
  });
  it("discards master data when the role changes, including cached sheets", () => {
    setOfflineCacheScope(master);
    cacheMasterState(settings, [], master);
    cacheSheet({ id: "master-only" }, master);
    setOfflineCacheScope(player);
    expect(readOfflineCache().master).toBeUndefined();
    expect(readOfflineCache().sheets).toEqual({});
    expect(cacheMasterState(settings, [], player)).toBe(false);
    expect(cacheMasterState(settings, [], master)).toBe(false);
  });
  it("keeps the same account's data through token refresh and erases it on logout", () => {
    setOfflineCacheScope(player);
    cacheSheet({ id: "a" }, player);
    setOfflineCacheScope({ ...player });
    expect(readOfflineCache().sheets).toHaveProperty("a");
    setOfflineCacheScope(null);
    setOfflineCacheScope(player);
    expect(readOfflineCache().sheets).toEqual({});
  });
  it("ignores corrupt data and unavailable storage without breaking authentication", () => {
    setOfflineCacheScope(player);
    storage.set("tadeon.nexus.offline.v2.account-a.jogador", "{broken");
    expect(readOfflineCache().sheets).toEqual({});
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("blocked");
      },
    });
    expect(() => setOfflineCacheScope(other)).not.toThrow();
    expect(cacheSheet({ id: "a" }, other)).toBe(false);
  });
  it("does not expose a shared module scope during SSR", () => {
    vi.stubGlobal("window", undefined);
    setOfflineCacheScope(master);
    expect(cacheMasterState(settings, [], master)).toBe(false);
    expect(readOfflineCache().master).toBeUndefined();
  });
});

it("reports whether a scoped local copy was actually cleared", () => {
  setOfflineCacheScope(player);
  cacheSheet({ id: "a" }, player);
  expect(clearOfflineCache()).toBe(true);
  expect(readOfflineCache().sheets).toEqual({});
  vi.stubGlobal("window", {
    get localStorage() {
      throw new Error("blocked");
    },
  });
  expect(clearOfflineCache()).toBe(false);
});

it("keeps TdV II conduction private to the verified mestre and rejects stale account writes", () => {
  const state = { ...newTdvMaster(), title: "Segredo da cena" };
  expect(cacheTdv2MasterState(state, master)).toBe(false);
  setOfflineCacheScope(master);
  expect(cacheTdv2MasterState(state, master)).toBe(true);
  expect(readOfflineCache().master?.tdv2?.title).toBe("Segredo da cena");
  setOfflineCacheScope(player);
  expect(cacheTdv2MasterState(state, master)).toBe(false);
  expect(cacheTdv2MasterState(state, player)).toBe(false);
  expect(readOfflineCache().master).toBeUndefined();
});
