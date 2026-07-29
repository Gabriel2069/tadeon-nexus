import { describe, expect, it } from "vitest";
import {
  extractWikilinks,
  markdownToPlainText,
  normalizeKnowledgeLookup,
  slugifyKnowledgeTitle,
} from "@/lib/knowledge/wikilinks";

describe("wikilinks", () => {
  it("parses labels, headings and exact positions", () => {
    const markdown =
      "Veja [[Cidade de Vidro|a capital]] e [[Regras#Conflitos]].";
    const links = extractWikilinks(markdown);

    expect(links).toHaveLength(2);
    expect(links[0]).toMatchObject({
      target: "Cidade de Vidro",
      label: "a capital",
      section: null,
      start: 5,
    });
    expect(markdown.slice(links[1].start, links[1].end)).toBe(
      "[[Regras#Conflitos]]",
    );
    expect(links[1]).toMatchObject({
      target: "Regras",
      label: null,
      section: "Conflitos",
    });
  });

  it("ignores escaped links and links inside code", () => {
    const markdown = [
      String.raw`\[[Escapado]]`,
      "`[[Código inline]]`",
      "```md",
      "[[Bloco de código]]",
      "```",
      "[[Válido]]",
    ].join("\n");

    expect(extractWikilinks(markdown).map((link) => link.target)).toEqual([
      "Válido",
    ]);
  });

  it("normalizes lookups without destroying portable titles", () => {
    expect(normalizeKnowledgeLookup("  Cidade   de Vidro ")).toBe(
      "cidade de vidro",
    );
    expect(slugifyKnowledgeTitle("Placa Tectônica: Véu!")).toBe(
      "placa-tectonica-veu",
    );
    expect(slugifyKnowledgeTitle("!!!")).toBe("sem-titulo");
  });

  it("derives searchable plain text without retaining markup", () => {
    expect(
      markdownToPlainText(
        "# Reino\nVeja **agora** [[Cidade|a capital]] e [o mapa](/mapa).",
      ),
    ).toBe("Reino Veja agora a capital Cidade e o mapa.");
  });
});

