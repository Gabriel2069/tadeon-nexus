import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import {
  NEXUS_VAULT_FORMAT,
  buildKnowledgeArchive,
  inspectArchiveText,
  normalizeArchivePath,
  parseKnowledgeArchive,
} from "@/lib/knowledge/knowledge-portability";

describe("knowledge portability", () => {
  it("parses YAML, aliases, tags, headings, wikilinks and attachment references", () => {
    const archive = zipSync({
      "lore/Myrova.md": strToU8(`---
title: "Myrova ~ coração do mundo"
type: location
aliases:
  - Cidade Antiga
tags: [mundo, cânone]
properties:
  população: "12.000"
---

# História
Myrova aponta para [[Lobo Alvor#Origem|o reino]].

![[../assets/mapa.png]]
`),
      "lore/Lobo Alvor.md": strToU8(`---
title: Lobo Alvor
type: culture
---

# Origem
Texto com ç, ã e emoji 🐺.
`),
      "assets/mapa.png": new Uint8Array([137, 80, 78, 71, 1]),
    });

    const preview = parseKnowledgeArchive(archive, {
      archiveName: "mundo.zip",
    });

    expect(preview.pages).toHaveLength(2);
    const myrova = preview.pages.find((page) =>
      page.title.startsWith("Myrova"),
    );
    const lobo = preview.pages.find((page) => page.title === "Lobo Alvor");
    expect(myrova?.aliases).toEqual(["Cidade Antiga"]);
    expect(myrova?.tags).toEqual(["mundo", "cânone"]);
    expect(myrova?.links[0]).toMatchObject({
      target_key: "lore/Lobo Alvor",
      target_heading_slug: "origem",
    });
    expect(preview.attachments[0]).toMatchObject({
      archive_path: "assets/mapa.png",
      page_keys: ["lore/Myrova"],
      mime_type: "image/png",
    });
    expect(lobo?.content_markdown).toContain("emoji 🐺");
  });

  it("maps unknown source types without discarding the original type", () => {
    const archive = zipSync({
      "criatura.md": strToU8(`---
title: Ser de Névoa
type: bestiary_entry
---
Conteúdo.
`),
    });
    const preview = parseKnowledgeArchive(archive, {
      typeMappings: { bestiary_entry: "creature" },
    });
    expect(preview.pages[0]).toMatchObject({
      node_type: "creature",
      source_type: "bestiary_entry",
    });
  });

  it("exports a reimportable versioned archive preserving special characters", () => {
    const bytes = buildKnowledgeArchive({
      workspace_id: "11111111-1111-4111-8111-111111111111",
      campaign_id: null,
      exported_at: "2026-08-01T00:00:00.000Z",
      pages: [
        {
          key: "cidade",
          path: "locais/Myrova.md",
          original_id: "22222222-2222-4222-8222-222222222222",
          title: "Myrova ~ Cidade d'Água",
          summary: "Símbolos: á, ç, Ω",
          content_markdown: "# Centro\n\n[[Lobo Alvor]]",
          properties: { clima: "úmido" },
          node_type: "location",
          status: "canonical",
          visibility: "workspace",
          icon: "landmark",
          aliases: ["Cidade Antiga"],
          tags: ["mundo"],
        },
      ],
      relations: [],
      attachments: [
        {
          path: "attachments/mapa.png",
          original_asset_id: "33333333-3333-4333-8333-333333333333",
          page_keys: ["cidade"],
          bytes: new Uint8Array([137, 80, 78, 71]),
        },
      ],
    });

    const manifest = inspectArchiveText(bytes, "manifest.yml");
    expect(manifest).toContain(`format: "${NEXUS_VAULT_FORMAT}"`);

    const reimported = parseKnowledgeArchive(bytes);
    expect(reimported.format).toBe(NEXUS_VAULT_FORMAT);
    expect(reimported.pages[0].title).toBe("Myrova ~ Cidade d'Água");
    expect(reimported.pages[0].summary).toBe("Símbolos: á, ç, Ω");
    expect(reimported.pages[0].content_markdown).toContain("[[Lobo Alvor]]");
    expect(reimported.attachments[0].page_keys).toEqual(["locais/Myrova"]);
    expect([...reimported.attachments[0].bytes]).toEqual([137, 80, 78, 71]);
  });

  it("rejects unsafe archive paths", () => {
    expect(() => normalizeArchivePath("../segredo.md")).toThrow(
      "travessia de diretório",
    );
    expect(() => normalizeArchivePath("/absoluto.md")).toThrow(
      "caminho inválido",
    );
  });
});
