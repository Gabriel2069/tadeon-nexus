const OFFLINE_CACHE_KEY = "tadeon.nexus.offline.v1";

export interface OfflineSheetSummary {
  id: string;
  name: string;
  occupation?: string | null;
  exposure?: number;
  owner_label?: string | null;
}

export interface OfflineMasterCache {
  campaignTitle: string;
  campaignPhase: string;
  scenes: unknown[];
  npcs: unknown[];
  clues: unknown[];
  threats: unknown[];
  interludes: unknown[];
  folds: unknown[];
  sheets: unknown[];
}

export interface OfflineCache {
  version: 1;
  updatedAt: string;
  sheetSummaries: OfflineSheetSummary[];
  sheets: Record<string, unknown>;
  master?: OfflineMasterCache;
}

function emptyCache(): OfflineCache {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    sheetSummaries: [],
    sheets: {},
  };
}

export function readOfflineCache(): OfflineCache {
  if (typeof window === "undefined") return emptyCache();
  try {
    const raw = window.localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as Partial<OfflineCache>;
    if (parsed.version !== 1) return emptyCache();
    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      sheetSummaries: Array.isArray(parsed.sheetSummaries) ? parsed.sheetSummaries : [],
      sheets: parsed.sheets && typeof parsed.sheets === "object" ? parsed.sheets : {},
      master: parsed.master,
    };
  } catch {
    return emptyCache();
  }
}

function writeOfflineCache(cache: OfflineCache): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(
      OFFLINE_CACHE_KEY,
      JSON.stringify({ ...cache, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function cacheSheetSummaries(summaries: OfflineSheetSummary[]): boolean {
  const cache = readOfflineCache();
  return writeOfflineCache({
    ...cache,
    sheetSummaries: summaries.map(({ id, name, occupation, exposure, owner_label }) => ({
      id,
      name,
      occupation,
      exposure,
      owner_label,
    })),
  });
}

export function cacheSheet<T extends { id: string }>(sheet: T): boolean {
  const cache = readOfflineCache();
  return writeOfflineCache({
    ...cache,
    sheets: { ...cache.sheets, [sheet.id]: sheet as unknown },
  });
}

export function cacheMasterState(
  settings: {
    campaign_title: string;
    campaign_phase: string;
    scenes_detailed: unknown[];
    master_npcs: unknown[];
    investigation_clues: unknown[];
    threats: unknown[];
    interludes: unknown[];
    folds: unknown[];
  },
  sheets: unknown[],
): boolean {
  const cache = readOfflineCache();
  return writeOfflineCache({
    ...cache,
    master: {
      campaignTitle: settings.campaign_title,
      campaignPhase: settings.campaign_phase,
      scenes: settings.scenes_detailed,
      npcs: settings.master_npcs,
      clues: settings.investigation_clues,
      threats: settings.threats,
      interludes: settings.interludes,
      folds: settings.folds,
      sheets,
    },
  });
}

export function clearOfflineCache(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(OFFLINE_CACHE_KEY);
}
