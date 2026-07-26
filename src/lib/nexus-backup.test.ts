import { describe, expect, it } from "vitest";
import { createNexusBackup, parseNexusBackup } from "@/lib/nexus-backup";

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
