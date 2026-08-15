import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Tabletop optimistic conflict SQLSTATE regression", () => {
  it("repairs scene-save business conflicts without using retryable 40001", () => {
    const migration = source(
      "supabase/migrations/20260815153908_stop_tabletop_conflict_retry_storm.sql",
    );

    expect(migration).toContain("save_tabletop_scene_state");
    expect(migration).toContain("TABLETOP_VERSION_CONFLICT");
    expect(migration).toContain("position('40001' in definition) > 0");
    expect(migration).toContain("'errcode = ''P0001'''");
    expect(migration).toContain("position('P0001' in definition) = 0");
  });

  it("keeps the client mapping conflict messages after the SQLSTATE changes", () => {
    const persistence = source(
      "src/lib/tabletop/tabletop-persistence-service.ts",
    );

    expect(persistence).toContain(
      'message.includes("TABLETOP_VERSION_CONFLICT")',
    );
    expect(persistence).toContain(
      'new TabletopServiceError("TABLETOP_CONFLICT")',
    );
  });
});
