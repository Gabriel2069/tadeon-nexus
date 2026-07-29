import { Fragment, type ReactNode } from "react";
import { AlertCircle, FileQuestion, Link2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { sanitizeKnowledgeUrl } from "@/lib/knowledge/markdown-url";
import {
  extractMarkdownHeadings,
  isEscapedAt,
  parseWikilinkToken,
} from "@/lib/knowledge/wikilinks";

export interface KnowledgeLinkPreview {
  id: string;
  title: string;
  summary: string;
  nodeType: string;
}

function InlineContent({
  text,
  previews,
  onOpenNode,
  onCreateMissing,
}: {
  text: string;
  previews: Record<string, KnowledgeLinkPreview | null>;
  onOpenNode: (nodeId: string, headingSlug?: string) => void;
  onCreateMissing: (title: string) => void;
}) {
  const pattern =
    /(!?\[[^\]]*]\([^)]+\)|!?\[\[[^\]\n]+]]|`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g;
  const output: ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) output.push(text.slice(cursor, index));
    const token = match[0];

    if (token.startsWith("[[") || token.startsWith("![[")) {
      if (isEscapedAt(text, index)) {
        const previous = output.at(-1);
        if (typeof previous === "string" && previous.endsWith("\\")) {
          output[output.length - 1] = previous.slice(0, -1);
        }
        output.push(token);
        cursor = index + token.length;
        continue;
      }
      const parsed = parseWikilinkToken(token);
      if (!parsed) {
        output.push(token);
        cursor = index + token.length;
        continue;
      }
      const previewKey = `${parsed.normalizedTarget}#${parsed.normalizedSection ?? ""}`;
      const preview = previews[previewKey];
      const label =
        parsed.label ??
        [parsed.target, parsed.section].filter(Boolean).join("#");
      output.push(
        <HoverCard key={`${index}-${token}`} openDelay={280} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className={
                preview
                  ? "inline-flex items-baseline gap-1 rounded px-1 text-[var(--tadeon-knowledge)] underline decoration-primary/35 underline-offset-4 hover:bg-primary/10"
                  : "inline-flex items-baseline gap-1 rounded px-1 text-destructive underline decoration-dashed underline-offset-4 hover:bg-destructive/10"
              }
              onClick={() =>
                preview
                  ? onOpenNode(preview.id, parsed.normalizedSection ?? undefined)
                  : onCreateMissing(parsed.target)
              }
            >
              {preview ? (
                <Link2 className="relative top-0.5 h-3 w-3 shrink-0" />
              ) : (
                <FileQuestion className="relative top-0.5 h-3 w-3 shrink-0" />
              )}
              {label}
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80">
            {preview ? (
              <div>
                <p className="tadeon-eyebrow">{preview.nodeType}</p>
                <p className="mt-1 font-cinzel text-base font-semibold">
                  {preview.title}
                </p>
                <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-muted-foreground">
                  {preview.summary || "Página sem resumo."}
                </p>
              </div>
            ) : (
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Link ainda não resolvido
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Clique para criar “{parsed.target}” no mesmo escopo ou corrigir a seção indicada.
                </p>
              </div>
            )}
          </HoverCardContent>
        </HoverCard>,
      );
    } else if (token.startsWith("![")) {
      const image = token.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
      const url = image ? sanitizeKnowledgeUrl(image[2], true) : null;
      output.push(
        url ? (
          <img
            key={`${index}-${token}`}
            src={url}
            alt={image?.[1] ?? ""}
            loading="lazy"
            className="my-4 max-h-[34rem] max-w-full rounded-xl border object-contain"
          />
        ) : (
          <span
            key={`${index}-${token}`}
            className="text-xs text-muted-foreground"
          >
            [imagem bloqueada]
          </span>
        ),
      );
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)]\(([^)]+)\)$/);
      const url = link ? sanitizeKnowledgeUrl(link[2]) : null;
      output.push(
        url ? (
          <a
            key={`${index}-${token}`}
            href={url}
            target={url.startsWith("/") ? undefined : "_blank"}
            rel={url.startsWith("/") ? undefined : "noopener noreferrer"}
            className="text-primary underline decoration-primary/35 underline-offset-4"
          >
            {link?.[1]}
          </a>
        ) : (
          <span key={`${index}-${token}`}>{link?.[1] ?? token}</span>
        ),
      );
    } else if (token.startsWith("`")) {
      output.push(
        <code
          key={`${index}-${token}`}
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.88em] text-primary"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**")) {
      output.push(
        <strong key={`${index}-${token}`}>{token.slice(2, -2)}</strong>,
      );
    } else {
      output.push(<em key={`${index}-${token}`}>{token.slice(1, -1)}</em>);
    }
    cursor = index + token.length;
  }

  if (cursor < text.length) output.push(text.slice(cursor));
  return <>{output}</>;
}

function Cells({
  line,
  header = false,
  ...props
}: {
  line: string;
  header?: boolean;
  previews: Record<string, KnowledgeLinkPreview | null>;
  onOpenNode: (nodeId: string, headingSlug?: string) => void;
  onCreateMissing: (title: string) => void;
}) {
  const Cell = header ? "th" : "td";
  return (
    <>
      {line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell, index) => (
          <Cell
            key={index}
            scope={header ? "col" : undefined}
            className="border-b border-r px-3 py-2 last:border-r-0"
          >
            <InlineContent text={cell.trim()} {...props} />
          </Cell>
        ))}
    </>
  );
}

export function SafeMarkdown({
  markdown,
  previews,
  onOpenNode,
  onCreateMissing,
}: {
  markdown: string;
  previews: Record<string, KnowledgeLinkPreview | null>;
  onOpenNode: (nodeId: string, headingSlug?: string) => void;
  onCreateMissing: (title: string) => void;
}) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const parsedHeadings = extractMarkdownHeadings(markdown);
  const blocks: ReactNode[] = [];
  let index = 0;
  let headingIndex = 0;
  const inlineProps = { previews, onOpenNode, onCreateMissing };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    const fence = line.match(/^\s*(```|~~~)(.*)$/);
    if (fence) {
      const code: string[] = [];
      const marker = fence[1];
      const language = fence[2].trim();
      index++;
      while (index < lines.length && !lines[index].trim().startsWith(marker)) {
        code.push(lines[index]);
        index++;
      }
      index++;
      blocks.push(
        <div key={`code-${index}`} className="my-5 overflow-hidden rounded-xl border">
          {language && (
            <div className="border-b bg-muted/45 px-4 py-2 font-mono text-[10px] uppercase text-muted-foreground">
              {language}
            </div>
          )}
          <pre className="overflow-x-auto bg-black/20 p-4 text-sm leading-relaxed">
            <code>{code.join("\n")}</code>
          </pre>
        </div>,
      );
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = parsedHeadings[headingIndex]?.anchorSlug ?? `secao-${headingIndex + 1}`;
      headingIndex++;
      const content = (
        <InlineContent text={heading[2]} {...inlineProps} />
      );
      const classes =
        level <= 2
          ? "mt-9 scroll-mt-24 font-cinzel text-2xl font-semibold"
          : "mt-7 scroll-mt-24 font-cinzel text-lg font-semibold";
      blocks.push(
        level === 1 ? (
          <h1 key={`h-${index}`} id={id} className={classes}>
            {content}
          </h1>
        ) : level === 2 ? (
          <h2 key={`h-${index}`} id={id} className={classes}>
            {content}
          </h2>
        ) : level === 3 ? (
          <h3 key={`h-${index}`} id={id} className={classes}>
            {content}
          </h3>
        ) : (
          <h4 key={`h-${index}`} id={id} className={classes}>
            {content}
          </h4>
        ),
      );
      index++;
      continue;
    }

    const callout = line.match(/^>\s*\[!([A-Za-z]+)]\s*(.*)$/);
    if (callout) {
      const body: string[] = [callout[2]];
      index++;
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        body.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }
      blocks.push(
        <aside
          key={`callout-${index}`}
          className="my-5 rounded-xl border border-primary/25 bg-primary/[0.055] p-4"
        >
          <p className="tadeon-eyebrow">{callout[1]}</p>
          <p className="mt-2 leading-relaxed">
            <InlineContent text={body.join(" ")} {...inlineProps} />
          </p>
        </aside>,
      );
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index++;
      }
      blocks.push(
        <blockquote
          key={`quote-${index}`}
          className="my-5 border-l-2 border-primary/45 pl-4 italic text-muted-foreground"
        >
          <InlineContent text={quote.join(" ")} {...inlineProps} />
        </blockquote>,
      );
      continue;
    }

    const checklist = line.match(/^\s*[-*]\s+\[([ xX])]\s+(.+)$/);
    if (checklist) {
      const items: Array<{ checked: boolean; text: string }> = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*]\s+\[([ xX])]\s+(.+)$/);
        if (!item) break;
        items.push({ checked: item[1].toLowerCase() === "x", text: item[2] });
        index++;
      }
      blocks.push(
        <ul key={`checks-${index}`} className="my-4 space-y-2">
          {items.map((item, itemIndex) => (
            <li key={itemIndex} className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={item.checked}
                readOnly
                className="mt-1 accent-[var(--tadeon-flow)]"
              />
              <span className={item.checked ? "text-muted-foreground line-through" : ""}>
                <InlineContent text={item.text} {...inlineProps} />
              </span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ""));
        index++;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="my-4 list-disc space-y-1.5 pl-6">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineContent text={item} {...inlineProps} />
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+[.)]\s+/, ""));
        index++;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="my-4 list-decimal space-y-1.5 pl-6">
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>
              <InlineContent text={item} {...inlineProps} />
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])
    ) {
      const rows = [line];
      index += 2;
      while (index < lines.length && lines[index].includes("|")) {
        rows.push(lines[index]);
        index++;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-5 overflow-x-auto rounded-xl border">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/50 font-semibold">
              <tr>
                <Cells line={rows[0]} header {...inlineProps} />
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <Cells line={row} {...inlineProps} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
      blocks.push(<hr key={`hr-${index}`} className="my-8 border-border/80" />);
      index++;
      continue;
    }

    const paragraph: string[] = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|>\s|```|~~~|\s*[-*+]\s+|\s*\d+[.)]\s+)/.test(
        lines[index],
      )
    ) {
      paragraph.push(lines[index]);
      index++;
    }
    blocks.push(
      <p key={`p-${index}`} className="my-4 leading-7 text-foreground/90">
        <InlineContent text={paragraph.join(" ")} {...inlineProps} />
      </p>,
    );
  }

  return (
    <div className="min-w-0">
      {blocks.map((block, blockIndex) => (
        <Fragment key={blockIndex}>{block}</Fragment>
      ))}
    </div>
  );
}
