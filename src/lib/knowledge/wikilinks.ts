export interface WikilinkReference {
  raw: string;
  target: string;
  normalizedTarget: string;
  label: string | null;
  section: string | null;
  start: number;
  end: number;
}

function maskInlineCode(line: string) {
  return line.replace(/(`+)([\s\S]*?)\1/g, (match) => " ".repeat(match.length));
}

function maskMarkdownCode(markdown: string) {
  let fencedBy: { character: string; length: number } | null = null;
  let output = "";

  for (const line of markdown.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (!line) continue;
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fence) {
      const marker = fence[1];
      if (!fencedBy) {
        fencedBy = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fencedBy.character &&
        marker.length >= fencedBy.length
      ) {
        fencedBy = null;
      }
      output += line.replace(/[^\n]/g, " ");
      continue;
    }
    output += fencedBy ? line.replace(/[^\n]/g, " ") : maskInlineCode(line);
  }

  return output;
}

function isEscaped(text: string, index: number) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) {
    slashes++;
  }
  return slashes % 2 === 1;
}

export function normalizeKnowledgeLookup(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function slugifyKnowledgeTitle(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96)
    .replace(/-+$/g, "");
  return slug || "sem-titulo";
}

export function extractWikilinks(markdown: string): WikilinkReference[] {
  const masked = maskMarkdownCode(markdown);
  const references: WikilinkReference[] = [];
  const pattern = /\[\[([^\]\n]{1,300})\]\]/g;

  for (const match of masked.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (isEscaped(markdown, start)) continue;

    const raw = markdown.slice(start, start + match[0].length);
    const inner = raw.slice(2, -2).trim();
    const pipeIndex = inner.indexOf("|");
    const targetWithSection =
      pipeIndex >= 0 ? inner.slice(0, pipeIndex).trim() : inner;
    const label =
      pipeIndex >= 0 ? inner.slice(pipeIndex + 1).trim() || null : null;
    const sectionIndex = targetWithSection.indexOf("#");
    const target =
      sectionIndex >= 0
        ? targetWithSection.slice(0, sectionIndex).trim()
        : targetWithSection.trim();
    const section =
      sectionIndex >= 0
        ? targetWithSection.slice(sectionIndex + 1).trim() || null
        : null;

    if (!target) continue;
    references.push({
      raw,
      target,
      normalizedTarget: normalizeKnowledgeLookup(target),
      label,
      section,
      start,
      end: start + raw.length,
    });
  }

  return references;
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[\s>*#+=-]+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

