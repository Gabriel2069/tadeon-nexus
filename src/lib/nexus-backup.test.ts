import { describe, expect, it } from "vitest";
import { createNexusBackup, parseNexusBackup, snapshotDatabaseName } from "@/lib/nexus-backup";

describe("nexus backup", () => {
  it("creates and validates a compatible backup", () => {
    const backup = createNexusBackup([{ id: "sheet-1" }], [{ id: "settings-1" }]);
    expect(parseNexusBackup(backup)).toEqual(backup);
  });

  it("rejects unknown formats", () => {
    expect(() =>
      parseNexusBackup({
        app: "Outro sistema",
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        characterSheets: [],
        gameSettings: [],
      }),
    ).toThrow(/compatível/);
  });
});

describe("backup import review", () => {
  it("rejects impossible dates before preview or download", () => {
    const backup = createNexusBackup([], []);
    expect(() => parseNexusBackup({ ...backup, exportedAt: "not-a-date" })).toThrow(/compatível/);
  });
  it("rejects missing identifiers, arrays and duplicated records", () => {
    for (const rows of [[{}], [{ id: "" }], [[]], [{ id: "a" }, { id: "a" }]]) {
      expect(() =>
        parseNexusBackup(createNexusBackup(rows as Record<string, unknown>[], [])),
      ).toThrow(/inválidos/);
    }
  });
  it("permits the same identifier in different tables", () => {
    const backup = createNexusBackup([{ id: "same" }], [{ id: "same" }]);
    expect(parseNexusBackup(backup)).toEqual(backup);
  });
});

it("isolates local history by account and rejects non-master scopes", () => {
  expect(snapshotDatabaseName({ userId: "a", role: "mestre" })).not.toBe(
    snapshotDatabaseName({ userId: "b", role: "mestre" }),
  );
  expect(() => snapshotDatabaseName({ userId: "a", role: "jogador" })).toThrow(/restrito/);
  expect(() => snapshotDatabaseName({ userId: "", role: "mestre" })).toThrow(/restrito/);
});
