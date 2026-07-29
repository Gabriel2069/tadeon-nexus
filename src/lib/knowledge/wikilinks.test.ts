import { describe, expect, it } from "vitest";
import {
  extractMarkdownHeadings,
  extractWikilinks,
  markdownToPlainText,
  normalizeKnowledgeHeading,
  normalizeKnowledgeLookup,
  parseWikilinkToken,
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
      normalizedSection: "conflitos",
    });
  });

  it("recognizes UUID links, aliases and embeds without changing the target", () => {
    const uuid = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
    const links = extractWikilinks(
      `[[${uuid}#Visão Áurea|registro]] ![[Myrova|mapa]]`,
    );

    expect(links[0]).toMatchObject({
      target: uuid,
      targetIsUuid: true,
      label: "registro",
      normalizedSection: "visao-aurea",
      embedded: false,
    });
    expect(links[1]).toMatchObject({
      target: "Myrova",
      targetIsUuid: false,
      label: "mapa",
      embedded: true,
    });
  });

  it("ignores frontmatter, comments, escaped links and fenced or inline code", () => {
    const markdown = [
      "---",
      "alias: [[Metadado]]",
      "---",
      "<!-- [[Comentário]] -->",
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

  it("distinguishes odd and even escape sequences", () => {
    const markdown = String.raw`\[[Ímpar]] \\[[Par]]`;
    expect(extractWikilinks(markdown).map((link) => link.target)).toEqual([
      "Par",
    ]);
  });

  it("preserves CRLF positions and repeated occurrences", () => {
    const markdown = "Primeira [[Cidade]]\r\nOutra [[Cidade|cidade antiga]].";
    const links = extractWikilinks(markdown);

    expect(links).toHaveLength(2);
    expect(markdown.slice(links[0].start, links[0].end)).toBe("[[Cidade]]");
    expect(markdown.slice(links[1].start, links[1].end)).toBe(
      "[[Cidade|cidade antiga]]",
    );
  });

  it("extracts stable Unicode heading anchors and suffixes duplicates", () => {
    const headings = extractMarkdownHeadings(
      "# Visão Áurea\n## Visão Áurea\n### `Ruptura`\n```\n# Ignorado\n```",
    );

    expect(headings).toMatchObject([
      { text: "Visão Áurea", anchorSlug: "visao-aurea", level: 1, occurrence: 1 },
      {
        text: "Visão Áurea",
        anchorSlug: "visao-aurea-2",
        level: 2,
        occurrence: 2,
      },
      { text: "Ruptura", anchorSlug: "ruptura", level: 3, occurrence: 1 },
    ]);
    expect(normalizeKnowledgeHeading("  Seção: Véu! ")).toBe("secao-veu");
  });

  it("rejects malformed tokens", () => {
    expect(parseWikilinkToken("[[]]")).toBeNull();
    expect(parseWikilinkToken("[[Sem final]")).toBeNull();
    expect(extractWikilinks("[[Válido]] [[ ]] [[Sem final]")).toHaveLength(1);
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

  it("derives searchable plain text without retaining markup or metadata", () => {
    expect(
      markdownToPlainText(
        "---\nalias: segredo\n---\n# Reino\nVeja **agora** [[Cidade|a capital]] e [o mapa](/mapa).",
      ),
    ).toBe("Reino Veja agora a capital Cidade e o mapa.");
  });
});
