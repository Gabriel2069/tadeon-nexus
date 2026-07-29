export interface WikilinkReference {
  raw: string;
  target: string;
  normalizedTarget: string;
  targetIsUuid: boolean;
  label: string | null;
  section: string | null;
  normalizedSection: string | null;
  embedded: boolean;
  start: number;
  end: number;
}

export interface MarkdownHeading {
  text: string;
  anchorSlug: string;
  level: number;
  occurrence: number;
  start: number;
}

function maskPreservingNewlines(value: string) {
  return value.replace(/[^\r\n]/g, " ");
}

function maskInlineCode(line: string) {
  return line.replace(/(`+)([^\n]*?)\1/g, (match) => " ".repeat(match.length));
}

function maskMarkdownSyntax(markdown: string) {
  let fencedBy: { character: string; length: number } | null = null;
  let inFrontmatter = false;
  let frontmatterLines = 0;
  let output = "";
  let offset = 0;

  for (const line of markdown.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (!line) continue;
    const body = line.replace(/\r?\n$/, "");

    if (offset === 0 && body.trim() === "---") {
      inFrontmatter = true;
      frontmatterLines = 1;
      output += maskPreservingNewlines(line);
      offset += line.length;
      continue;
    }

    if (inFrontmatter) {
      frontmatterLines++;
      output += maskPreservingNewlines(line);
      if (frontmatterLines > 1 && body.trim() === "---") {
        inFrontmatter = false;
      }
      offset += line.length;
      continue;
    }

    const fence = body.match(/^\s{0,3}(`{3,}|~{3,})/);
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
      output += maskPreservingNewlines(line);
      offset += line.length;
      continue;
    }

    output += fencedBy ? maskPreservingNewlines(line) : maskInlineCode(line);
    offset += line.length;
  }

  return output.replace(/<!--[\s\S]*?(?:-->|$)/g, (match) =>
    maskPreservingNewlines(match),
  );
}

export function isEscapedAt(text: string, index: number) {
  let slashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) {
    slashes++;
  }
  return slashes % 2 === 1;
}

export function isKnowledgeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

export function normalizeKnowledgeLookup(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function slugifyPortable(value: string, maxLength: number, fallback: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || fallback;
}

export function slugifyKnowledgeTitle(value: string) {
  return slugifyPortable(value, 96, "sem-titulo");
}

export function normalizeKnowledgeHeading(value: string) {
  return slugifyPortable(value, 120, "secao");
}

export function parseWikilinkToken(raw: string) {
  const match = raw.match(/^(!?)\[\[([^\]\r\n]{1,300})\]\]$/);
  if (!match) return null;

  const embedded = match[1] === "!";
  const inner = match[2].trim();
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

  if (!target) return null;
  return {
    raw,
    target,
    normalizedTarget: normalizeKnowledgeLookup(target),
    targetIsUuid: isKnowledgeUuid(target),
    label,
    section,
    normalizedSection: section ? normalizeKnowledgeHeading(section) : null,
    embedded,
  };
}

export function extractWikilinks(markdown: string): WikilinkReference[] {
  const masked = maskMarkdownSyntax(markdown);
  const references: WikilinkReference[] = [];
  const pattern = /!?\[\[([^\]\r\n]{1,300})\]\]/g;

  for (const match of masked.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (isEscapedAt(markdown, start)) continue;

    const raw = markdown.slice(start, start + match[0].length);
    const parsed = parseWikilinkToken(raw);
    if (!parsed) continue;
    references.push({
      ...parsed,
      start,
      end: start + raw.length,
    });
  }

  return references;
}

function cleanHeadingText(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/`+/g, "")
    .replace(/[*_~]+/g, "")
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMarkdownHeadings(markdown: string): MarkdownHeading[] {
  const masked = maskMarkdownSyntax(markdown);
  const maskedLines = masked.match(/[^\n]*(?:\n|$)/g) ?? [];
  const originalLines = markdown.match(/[^\n]*(?:\n|$)/g) ?? [];
  const occurrences = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  let offset = 0;

  maskedLines.forEach((maskedLine, index) => {
    if (!maskedLine) return;
    const body = maskedLine.replace(/\r?\n$/, "");
    const activePrefix = body.match(/^\s{0,3}(#{1,6})[ \t]+/);
    if (activePrefix) {
      const originalBody = (originalLines[index] ?? "").replace(/\r?\n$/, "");
      const originalPrefix = originalBody.match(
        /^\s{0,3}(#{1,6})[ \t]+/,
      );
      if (!originalPrefix) {
        offset += (originalLines[index] ?? maskedLine).length;
        return;
      }
      const rawText = originalBody
        .slice(originalPrefix[0].length)
        .replace(/[ \t]+#+[ \t]*$/, "");
      const text = cleanHeadingText(rawText);
      if (text) {
        const baseSlug = normalizeKnowledgeHeading(text);
        const occurrence = (occurrences.get(baseSlug) ?? 0) + 1;
        occurrences.set(baseSlug, occurrence);
        headings.push({
          text,
          anchorSlug: occurrence === 1 ? baseSlug : `${baseSlug}-${occurrence}`,
          level: originalPrefix[1].length,
          occurrence,
          start: offset,
        });
      }
    }
    offset += (originalLines[index] ?? maskedLine).length;
  });

  return headings;
}

export function markdownToPlainText(markdown: string) {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, "$2 $1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^[\s>*#+=-]+/gm, "")
    .replace(/[*_~]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
