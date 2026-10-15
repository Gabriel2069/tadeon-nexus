import type { AppRole } from "@/lib/nexus-contracts";

const LEGACY_CACHE_KEY = "tadeon.nexus.offline.v1";
export interface OfflineCacheScope {
  userId: string;
  role: AppRole;
}
let activeScope: OfflineCacheScope | null = null;
const scopeKey = (scope: OfflineCacheScope) =>
  `tadeon.nexus.offline.v2.${scope.userId}.${scope.role}`;
const matchesScope = (scope: OfflineCacheScope | null) =>
  !!scope &&
  !!activeScope &&
  scope.userId === activeScope.userId &&
  scope.role === activeScope.role;

// Only AuthProvider may establish a scope after verifying profile and role.
// Account/role transitions discard data instead of adopting the old unscoped cache.
export function setOfflineCacheScope(scope: OfflineCacheScope | null): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_CACHE_KEY);
    if (activeScope && !matchesScope(scope)) window.localStorage.removeItem(scopeKey(activeScope));
  } catch {
    /* Storage may be unavailable; authentication must still work. */
  }
  activeScope = scope;
}

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
  if (typeof window === "undefined" || !activeScope) return emptyCache();
  try {
    const raw = window.localStorage.getItem(scopeKey(activeScope));
    if (!raw) return emptyCache();
    const parsed = JSON.parse(raw) as Partial<OfflineCache>;
    if (parsed.version !== 1) return emptyCache();
    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date(0).toISOString(),
      sheetSummaries: Array.isArray(parsed.sheetSummaries) ? parsed.sheetSummaries : [],
      sheets: parsed.sheets && typeof parsed.sheets === "object" ? parsed.sheets : {},
      master: activeScope.role === "mestre" ? parsed.master : undefined,
    };
  } catch {
    return emptyCache();
  }
}

function writeOfflineCache(cache: OfflineCache, scope: OfflineCacheScope | null): boolean {
  if (typeof window === "undefined" || !scope || !matchesScope(scope)) return false;
  try {
    window.localStorage.setItem(
      scopeKey(scope),
      JSON.stringify({ ...cache, updatedAt: new Date().toISOString() }),
    );
    return true;
  } catch {
    return false;
  }
}

export function cacheSheetSummaries(
  summaries: OfflineSheetSummary[],
  scope: OfflineCacheScope | null,
): boolean {
  const cache = readOfflineCache();
  return writeOfflineCache(
    {
      ...cache,
      sheetSummaries: summaries.map(({ id, name, occupation, exposure, owner_label }) => ({
        id,
        name,
        occupation,
        exposure,
        owner_label,
      })),
    },
    scope,
  );
}

export function cacheSheet<T extends { id: string }>(
  sheet: T,
  scope: OfflineCacheScope | null,
): boolean {
  const cache = readOfflineCache();
  return writeOfflineCache(
    {
      ...cache,
      sheets: { ...cache.sheets, [sheet.id]: sheet as unknown },
    },
    scope,
  );
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
  scope: OfflineCacheScope | null,
): boolean {
  if (scope?.role !== "mestre" || !matchesScope(scope)) return false;
  const cache = readOfflineCache();
  return writeOfflineCache(
    {
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
    },
    scope,
  );
}

export function clearOfflineCache(): boolean {
  if (typeof window === "undefined" || !activeScope) return false;
  try {
    window.localStorage.removeItem(scopeKey(activeScope));
    return true;
  } catch {
    return false;
  }
}
