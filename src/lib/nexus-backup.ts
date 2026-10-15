import type { OfflineCacheScope } from "@/lib/offline-cache";

export const NEXUS_BACKUP_VERSION = 1;

export interface NexusBackup {
  app: "Tadeon Nexus";
  formatVersion: 1;
  exportedAt: string;
  characterSheets: Record<string, unknown>[];
  gameSettings: Record<string, unknown>[];
}

export interface StoredSnapshot {
  id: string;
  label: string;
  createdAt: string;
  backup: NexusBackup;
}

export interface SnapshotSummary {
  id: string;
  label: string;
  createdAt: string;
  sheetCount: number;
}

const DATABASE_NAME = "tadeon-nexus";
const STORE_NAME = "snapshots";
const MAX_SNAPSHOTS = 10;

export function createNexusBackup(
  characterSheets: Record<string, unknown>[],
  gameSettings: Record<string, unknown>[],
): NexusBackup {
  return {
    app: "Tadeon Nexus",
    formatVersion: NEXUS_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    characterSheets,
    gameSettings,
  };
}

export function parseNexusBackup(value: unknown): NexusBackup {
  if (!value || typeof value !== "object") throw new Error("Arquivo inválido.");
  const candidate = value as Partial<NexusBackup>;
  if (
    candidate.app !== "Tadeon Nexus" ||
    candidate.formatVersion !== NEXUS_BACKUP_VERSION ||
    typeof candidate.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(candidate.exportedAt)) ||
    !Array.isArray(candidate.characterSheets) ||
    !Array.isArray(candidate.gameSettings)
  ) {
    throw new Error("Este arquivo não é um backup compatível do Tadeon Nexus.");
  }
  const validRows = [candidate.characterSheets, candidate.gameSettings].every((rows) => {
    const identifiers = new Set<string>();
    return rows.every((row) => {
      if (
        !row ||
        typeof row !== "object" ||
        Array.isArray(row) ||
        typeof row.id !== "string" ||
        !row.id.trim() ||
        identifiers.has(row.id)
      )
        return false;
      identifiers.add(row.id);
      return true;
    });
  });
  if (!validRows) throw new Error("O backup contém registros inválidos.");
  return candidate as NexusBackup;
}

export function downloadNexusBackup(backup: NexusBackup, filename?: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download =
    filename ?? `tadeon-nexus-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function snapshotDatabaseName(scope: OfflineCacheScope): string {
  if (!scope.userId || scope.role !== "mestre")
    throw new Error("Histórico restrito à conta de mestre verificada.");
  return `${DATABASE_NAME}.v2.${encodeURIComponent(scope.userId)}.${scope.role}`;
}

function openDatabase(scope: OfflineCacheScope): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Histórico local indisponível neste navegador."));
      return;
    }
    const request = indexedDB.open(snapshotDatabaseName(scope), 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Não foi possível abrir o histórico local."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Não foi possível acessar o histórico local."));
  });
}

export async function listSnapshots(scope: OfflineCacheScope): Promise<SnapshotSummary[]> {
  const database = await openDatabase(scope);
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const rows = await requestResult(
      transaction.objectStore(STORE_NAME).getAll() as IDBRequest<StoredSnapshot[]>,
    );
    return rows
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((row) => ({
        id: row.id,
        label: row.label,
        createdAt: row.createdAt,
        sheetCount: row.backup.characterSheets.length,
      }));
  } finally {
    database.close();
  }
}

export async function getSnapshot(
  id: string,
  scope: OfflineCacheScope,
): Promise<StoredSnapshot | null> {
  const database = await openDatabase(scope);
  try {
    const transaction = database.transaction(STORE_NAME, "readonly");
    const result = await requestResult(
      transaction.objectStore(STORE_NAME).get(id) as IDBRequest<StoredSnapshot | undefined>,
    );
    return result ?? null;
  } finally {
    database.close();
  }
}

export async function saveSnapshot(
  backup: NexusBackup,
  label: string,
  scope: OfflineCacheScope,
): Promise<StoredSnapshot> {
  const database = await openDatabase(scope);
  const snapshot: StoredSnapshot = {
    id: crypto.randomUUID(),
    label: label.trim() || "Ponto de restauração",
    createdAt: new Date().toISOString(),
    backup,
  };
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await transactionWrite(transaction, () => transaction.objectStore(STORE_NAME).put(snapshot));
  } finally {
    database.close();
  }

  const snapshots = await listSnapshots(scope);
  await Promise.all(snapshots.slice(MAX_SNAPSHOTS).map((item) => deleteSnapshot(item.id, scope)));
  return snapshot;
}

export async function deleteSnapshot(id: string, scope: OfflineCacheScope): Promise<void> {
  const database = await openDatabase(scope);
  try {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    await transactionWrite(transaction, () => transaction.objectStore(STORE_NAME).delete(id));
  } finally {
    database.close();
  }
}

function transactionWrite(transaction: IDBTransaction, write: () => IDBRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(new Error("O histórico local não pôde ser gravado."));
    transaction.onerror = () => reject(new Error("O histórico local não pôde ser gravado."));
    write();
  });
}
