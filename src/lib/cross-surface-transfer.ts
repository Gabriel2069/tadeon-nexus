export type CrossSurfaceTransfer =
  | { kind: "sheet"; id: string; label: string; createdAt: number }
  | { kind: "nexus"; id: string; label: string; createdAt: number };

const STORAGE_KEY = "tadeon.cross-surface.tabletop-transfer";
const MAX_AGE_MS = 10 * 60 * 1000;

function storage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function queueTabletopTransfer(payload: Omit<CrossSurfaceTransfer, "createdAt">) {
  const target = storage();
  if (!target) return false;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify({ ...payload, createdAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function readTabletopTransfer(): CrossSurfaceTransfer | null {
  const target = storage();
  if (!target) return null;
  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CrossSurfaceTransfer>;
    const validKind = parsed.kind === "sheet" || parsed.kind === "nexus";
    const validId = typeof parsed.id === "string" && parsed.id.length > 0;
    const validLabel = typeof parsed.label === "string";
    const validTime = typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt);
    if (!validKind || !validId || !validLabel || !validTime) {
      target.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.createdAt! > MAX_AGE_MS) {
      target.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed as CrossSurfaceTransfer;
  } catch {
    return null;
  }
}

export function clearTabletopTransfer() {
  const target = storage();
  if (!target) return;
  try {
    target.removeItem(STORAGE_KEY);
  } catch {
    // A fila é apenas um auxílio de navegação; falha de storage não bloqueia a Mesa.
  }
}
