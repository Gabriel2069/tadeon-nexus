import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWLEDGE_NODE_TYPES } from "@/lib/nexus-contracts";
import { parseKnowledgeArchive } from "@/lib/knowledge/knowledge-portability";
import {
  TADEON_NEXUS_LOTE_01,
  TADEON_NEXUS_OFFICIAL_PACKS,
} from "@/lib/knowledge/official-knowledge-packs";

describe("Tadeon Nexus official pack", () => {
  it("exposes one canonical archive instead of duplicated projections", () => {
    expect(TADEON_NEXUS_OFFICIAL_PACKS).toHaveLength(1);
    expect(TADEON_NEXUS_OFFICIAL_PACKS[0].fileName).toBe(
      "tadeon-nexus-canonico-atual.zip",
    );
  });

  it.each(TADEON_NEXUS_OFFICIAL_PACKS)(
    "keeps $title importable and complete",
    (pack) => {
      const bytes = readFileSync(
        resolve(process.cwd(), `public${pack.assetPath}`),
      );
      const preview = parseKnowledgeArchive(new Uint8Array(bytes), {
        archiveName: pack.fileName,
      });

      expect(preview.pages).toHaveLength(pack.pages);
      expect(preview.relations).toHaveLength(pack.relations);
      expect(preview.attachments).toHaveLength(0);
      expect(preview.warnings).toEqual([]);
    },
  );

  it("keeps the complete canonical graph importable", () => {
    const bytes = readFileSync(
      resolve(process.cwd(), `public${TADEON_NEXUS_LOTE_01.assetPath}`),
    );
    const preview = parseKnowledgeArchive(new Uint8Array(bytes), {
      archiveName: TADEON_NEXUS_LOTE_01.fileName,
    });

    expect(preview.pages).toHaveLength(TADEON_NEXUS_LOTE_01.pages);
    expect(preview.relations).toHaveLength(TADEON_NEXUS_LOTE_01.relations);
    expect(preview.attachments).toHaveLength(0);
    expect(preview.warnings).toEqual([]);

    expect(
      preview.pages.filter((page) => page.status === "canonical"),
    ).toHaveLength(130);
    expect(
      preview.pages.filter((page) => page.status === "review"),
    ).toHaveLength(56);
    expect(
      preview.source_types.filter(
        (sourceType) =>
          !KNOWLEDGE_NODE_TYPES.includes(
            sourceType as (typeof KNOWLEDGE_NODE_TYPES)[number],
          ),
      ),
    ).toEqual([]);
    expect(
      preview.pages.flatMap((page) =>
        page.links.filter((link) => !link.target_key && !link.target_is_uuid),
      ),
    ).toEqual([]);
  });
});
