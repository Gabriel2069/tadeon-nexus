import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { Json } from "@/integrations/supabase/types";
import {
  KNOWLEDGE_NODE_STATUSES,
  KNOWLEDGE_NODE_TYPES,
  KNOWLEDGE_RELATION_DIRECTIONS,
  KNOWLEDGE_VISIBILITIES,
  RELATION_TYPES,
  type KnowledgeNodeStatus,
  type KnowledgeNodeType,
  type KnowledgeRelationDirection,
  type KnowledgeVisibility,
  type RelationType,
} from "@/lib/nexus-contracts";
import {
  extractMarkdownHeadings,
  extractWikilinks,
  markdownToPlainText,
  normalizeKnowledgeLookup,
  slugifyKnowledgeTitle,
} from "@/lib/knowledge/wikilinks";

export const NEXUS_VAULT_FORMAT = "tadeon-nexus-vault";
export const NEXUS_VAULT_VERSION = 1;
export const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
export const MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
export const MAX_ARCHIVE_ENTRIES = 2_000;
export const MAX_IMPORT_PAGES = 500;
export const MAX_IMPORT_RELATIONS = 2_000;

const TEXT_DECODER = new TextDecoder("utf-8", { fatal: true });
const NODE_TYPE_SET = new Set<string>(KNOWLEDGE_NODE_TYPES);
const STATUS_SET = new Set<string>(KNOWLEDGE_NODE_STATUSES);
const VISIBILITY_SET = new Set<string>(KNOWLEDGE_VISIBILITIES);
const RELATION_SET = new Set<string>(RELATION_TYPES);
const DIRECTION_SET = new Set<string>(KNOWLEDGE_RELATION_DIRECTIONS);

export type ImportConflictAction = "skip" | "copy";

export interface KnowledgeImportLink {
  raw: string;
  target: string;
  normalized_target: string;
  target_is_uuid: boolean;
  target_key: string | null;
  target_heading: string | null;
  target_heading_slug: string | null;
  start_position: number;
  end_position: number;
}

export interface KnowledgeImportHeading {
  anchor_slug: string;
  heading_text: string;
  level: number;
  occurrence: number;
  start_position: number;
}

export interface KnowledgeImportPage {
  import_key: string;
  source_path: string;
  title: string;
  slug: string;
  summary: string;
  content_markdown: string;
  plain_text: string;
  properties: Json;
  node_type: KnowledgeNodeType;
  source_type: string;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  icon: string | null;
  aliases: string[];
  tags: string[];
  conflict_action: ImportConflictAction;
  links: KnowledgeImportLink[];
  headings: KnowledgeImportHeading[];
}

export interface KnowledgeImportRelation {
  source_key: string;
  target_key: string;
  relation_type: RelationType;
  label: string;
  direction: KnowledgeRelationDirection;
  visibility: KnowledgeVisibility;
  properties: Json;
}

export interface KnowledgeImportAttachment {
  archive_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  page_keys: string[];
  bytes: Uint8Array;
}

export interface KnowledgeVaultPreview {
  format: string;
  version: number;
  archive_name: string;
  pages: KnowledgeImportPage[];
  relations: KnowledgeImportRelation[];
  attachments: KnowledgeImportAttachment[];
  source_types: string[];
  warnings: string[];
}

export interface KnowledgeVaultManifest {
  format: typeof NEXUS_VAULT_FORMAT;
  version: typeof NEXUS_VAULT_VERSION;
  exported_at: string;
  workspace_id?: string;
  campaign_id?: string | null;
  pages: Array<{
    key: string;
    path: string;
    original_id?: string;
  }>;
  relations: KnowledgeImportRelation[];
  attachments: Array<{
    path: string;
    original_asset_id?: string;
    page_keys: string[];
  }>;
}

export interface KnowledgeExportPage {
  key: string;
  path: string;
  original_id: string;
  title: string;
  summary: string;
  content_markdown: string;
  properties: Json;
  node_type: KnowledgeNodeType;
  status: KnowledgeNodeStatus;
  visibility: KnowledgeVisibility;
  icon: string | null;
  aliases: string[];
  tags: string[];
}

export interface KnowledgeExportAttachment {
  path: string;
  original_asset_id: string;
  page_keys: string[];
  bytes: Uint8Array;
}

export interface KnowledgeExportSnapshot {
  workspace_id: string;
  campaign_id: string | null;
  pages: KnowledgeExportPage[];
  relations: KnowledgeImportRelation[];
  attachments: KnowledgeExportAttachment[];
  exported_at?: string;
}

export class KnowledgeArchiveError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "KnowledgeArchiveError";
  }
}

function inspectZipDirectory(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumEocd = 22;
  const firstCandidate = Math.max(0, bytes.byteLength - 65_557);
  let eocd = -1;
  for (
    let offset = bytes.byteLength - minimumEocd;
    offset >= firstCandidate;
    offset--
  ) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_INVALID",
      "O diretório central do ZIP não foi encontrado.",
    );
  }

  const disk = view.getUint16(eocd + 4, true);
  const directoryDisk = view.getUint16(eocd + 6, true);
  const entries = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (
    disk !== 0 ||
    directoryDisk !== 0 ||
    entries === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff ||
    entries > MAX_ARCHIVE_ENTRIES ||
    directoryOffset + directorySize > eocd
  ) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_LIMIT_EXCEEDED",
      "ZIP multipart, ZIP64 ou com arquivos demais não é suportado.",
    );
  }

  let cursor = directoryOffset;
  let totalUncompressed = 0;
  for (let index = 0; index < entries; index++) {
    if (cursor + 46 > eocd || view.getUint32(cursor, true) !== 0x02014b50) {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_ARCHIVE_INVALID",
        "O diretório central do ZIP está corrompido.",
      );
    }
    const flags = view.getUint16(cursor + 8, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    if (flags & 0x1 || uncompressedSize === 0xffffffff) {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_ARCHIVE_UNSUPPORTED",
        "ZIP criptografado ou ZIP64 não é suportado.",
      );
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_ARCHIVE_LIMIT_EXCEEDED",
        "O conteúdo declarado do ZIP ultrapassa 200 MiB.",
      );
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function asStringArray(value: unknown) {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return [
    ...new Set(source.map((item) => String(item).trim()).filter(Boolean)),
  ];
}

function asJsonObject(value: unknown): Json {
  return isRecord(value) ? (value as Json) : {};
}

function pickEnum<T extends string>(
  value: unknown,
  allowed: Set<string>,
  fallback: T,
): T {
  const normalized = asString(value);
  return (allowed.has(normalized) ? normalized : fallback) as T;
}

export function normalizeArchivePath(input: string) {
  const path = input.replace(/\\/g, "/").replace(/^\.\//, "");
  if (
    !path ||
    path.length > 500 ||
    path.startsWith("/") ||
    /^[a-z]:\//i.test(path) ||
    path.includes("\0")
  ) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_PATH_INVALID",
      "O arquivo ZIP contém um caminho inválido.",
    );
  }
  const segments = path.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_PATH_INVALID",
      "O arquivo ZIP contém travessia de diretório.",
    );
  }
  return segments.join("/");
}

function pathWithoutExtension(path: string) {
  return path.replace(/\.[^/.]+$/, "");
}

function basename(path: string) {
  return path.split("/").pop() ?? path;
}

function extension(path: string) {
  const match = path.match(/\.([a-z0-9]{1,12})$/i);
  return match?.[1].toLowerCase() ?? "";
}

function mimeForPath(path: string) {
  const known: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    pdf: "application/pdf",
    txt: "text/plain",
    log: "text/plain",
    csv: "text/csv",
    json: "application/json",
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    ogg: "audio/ogg",
    oga: "audio/ogg",
    wav: "audio/wav",
    webm: "video/webm",
    mp4: "video/mp4",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  };
  return known[extension(path)] ?? "application/octet-stream";
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match)
    return { attributes: {} as Record<string, unknown>, body: markdown };
  let attributes: unknown;
  try {
    attributes = parseYaml(match[1]) ?? {};
  } catch (error) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_YAML_INVALID",
      `Frontmatter YAML inválido: ${error instanceof Error ? error.message : "erro desconhecido"}`,
    );
  }
  if (!isRecord(attributes)) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_YAML_INVALID",
      "O frontmatter precisa ser um objeto YAML.",
    );
  }
  return { attributes, body: markdown.slice(match[0].length) };
}

function attachmentTargets(markdown: string) {
  const targets = new Set<string>();
  for (const link of extractWikilinks(markdown)) {
    if (link.embedded && extension(link.target)) targets.add(link.target);
  }
  for (const match of markdown.matchAll(
    /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g,
  )) {
    try {
      targets.add(decodeURIComponent(match[1].replace(/^<|>$/g, "")));
    } catch {
      targets.add(match[1].replace(/^<|>$/g, ""));
    }
  }
  return [...targets];
}

function resolveRelativeArchivePath(sourcePath: string, target: string) {
  if (target.startsWith("/") || /^[a-z]:\//i.test(target)) return null;
  const stack = sourcePath.split("/").slice(0, -1);
  for (const segment of target.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (!stack.length) return null;
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  if (!stack.length) return null;
  try {
    return normalizeArchivePath(stack.join("/"));
  } catch {
    return null;
  }
}

function resolveArchiveTarget(
  sourcePath: string,
  target: string,
  available: Set<string>,
) {
  const normalizedTarget = target.replace(/\\/g, "/").replace(/^\.\//, "");
  const relativeTarget = resolveRelativeArchivePath(
    sourcePath,
    normalizedTarget,
  );
  const candidates = [
    normalizedTarget,
    `${normalizedTarget}.md`,
    relativeTarget,
    relativeTarget ? `${relativeTarget}.md` : null,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const safe = normalizeArchivePath(candidate);
      if (available.has(safe)) return safe;
    } catch {
      continue;
    }
  }
  const targetBase = basename(
    pathWithoutExtension(normalizedTarget),
  ).toLocaleLowerCase("pt-BR");
  const matches = [...available].filter(
    (path) =>
      basename(pathWithoutExtension(path)).toLocaleLowerCase("pt-BR") ===
      targetBase,
  );
  return matches.length === 1 ? matches[0] : null;
}

function parseManifest(
  entries: Record<string, Uint8Array>,
  warnings: string[],
): Partial<KnowledgeVaultManifest> {
  const manifestPath = Object.keys(entries).find((path) =>
    /(^|\/)manifest\.ya?ml$/i.test(path),
  );
  if (!manifestPath) return {};
  let parsed: unknown;
  try {
    parsed = parseYaml(TEXT_DECODER.decode(entries[manifestPath]));
  } catch (error) {
    warnings.push(
      `Manifesto ignorado: ${error instanceof Error ? error.message : "YAML inválido"}.`,
    );
    return {};
  }
  if (!isRecord(parsed)) {
    warnings.push("Manifesto ignorado porque não contém um objeto.");
    return {};
  }
  if (
    parsed.format !== NEXUS_VAULT_FORMAT ||
    Number(parsed.version) !== NEXUS_VAULT_VERSION
  ) {
    warnings.push(
      "Manifesto externo ou de versão não suportada; os Markdown serão importados como cofre genérico.",
    );
    return {};
  }
  return parsed as unknown as KnowledgeVaultManifest;
}

export function parseKnowledgeArchive(
  bytes: Uint8Array,
  options: {
    archiveName?: string;
    typeMappings?: Record<string, KnowledgeNodeType>;
  } = {},
): KnowledgeVaultPreview {
  if (!bytes.length || bytes.length > MAX_ARCHIVE_BYTES) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_SIZE_INVALID",
      "O ZIP está vazio ou ultrapassa 50 MiB.",
    );
  }
  inspectZipDirectory(bytes);

  let rawEntries: Record<string, Uint8Array>;
  try {
    rawEntries = unzipSync(bytes);
  } catch {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_INVALID",
      "Não foi possível abrir o arquivo ZIP.",
    );
  }

  const inputEntries = Object.entries(rawEntries).filter(
    ([path]) => !path.endsWith("/"),
  );
  if (inputEntries.length > MAX_ARCHIVE_ENTRIES) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_LIMIT_EXCEEDED",
      "O ZIP possui arquivos demais.",
    );
  }

  const entries: Record<string, Uint8Array> = {};
  let uncompressedBytes = 0;
  for (const [rawPath, value] of inputEntries) {
    const path = normalizeArchivePath(rawPath);
    uncompressedBytes += value.byteLength;
    if (uncompressedBytes > MAX_UNCOMPRESSED_BYTES) {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_ARCHIVE_LIMIT_EXCEEDED",
        "O conteúdo descompactado ultrapassa 200 MiB.",
      );
    }
    entries[path] = value;
  }

  const warnings: string[] = [];
  const manifest = parseManifest(entries, warnings);
  const markdownPaths = Object.keys(entries)
    .filter((path) => /\.md$/i.test(path))
    .sort((left, right) => left.localeCompare(right));
  if (!markdownPaths.length || markdownPaths.length > MAX_IMPORT_PAGES) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_PAGE_LIMIT_INVALID",
      "O ZIP precisa conter de 1 a 500 arquivos Markdown.",
    );
  }

  const pathSet = new Set(Object.keys(entries));
  const keyByMarkdownPath = new Map(
    markdownPaths.map((path) => [path, pathWithoutExtension(path)]),
  );
  const pages = markdownPaths.map((path): KnowledgeImportPage => {
    let markdown: string;
    try {
      markdown = TEXT_DECODER.decode(entries[path]);
    } catch {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_MARKDOWN_ENCODING_INVALID",
        `${path} não está em UTF-8 válido.`,
      );
    }
    const { attributes, body } = parseFrontmatter(markdown);
    const sourceType =
      asString(attributes.type) ||
      asString(attributes.node_type) ||
      "free_note";
    const mappedType =
      options.typeMappings?.[sourceType] ??
      (NODE_TYPE_SET.has(sourceType)
        ? (sourceType as KnowledgeNodeType)
        : "free_note");
    const title =
      asString(attributes.title) ||
      basename(pathWithoutExtension(path)).replace(/[-_]+/g, " ").trim() ||
      "Sem título";
    const importKey = pathWithoutExtension(path);
    const links = extractWikilinks(body).map((link): KnowledgeImportLink => {
      const targetPath = resolveArchiveTarget(path, link.target, pathSet);
      return {
        raw: link.raw,
        target: link.target,
        normalized_target: link.normalizedTarget,
        target_is_uuid: link.targetIsUuid,
        target_key: targetPath
          ? (keyByMarkdownPath.get(targetPath) ?? null)
          : null,
        target_heading: link.section,
        target_heading_slug: link.normalizedSection,
        start_position: link.start,
        end_position: link.end,
      };
    });
    const headings = extractMarkdownHeadings(body).map(
      (heading): KnowledgeImportHeading => ({
        anchor_slug: heading.anchorSlug,
        heading_text: heading.text,
        level: heading.level,
        occurrence: heading.occurrence,
        start_position: heading.start,
      }),
    );
    const known = new Set([
      "title",
      "type",
      "node_type",
      "summary",
      "status",
      "visibility",
      "icon",
      "aliases",
      "alias",
      "tags",
      "properties",
      "slug",
    ]);
    const extraFrontmatter = Object.fromEntries(
      Object.entries(attributes).filter(([key]) => !known.has(key)),
    );
    const baseProperties = isRecord(attributes.properties)
      ? attributes.properties
      : {};
    const properties = {
      ...baseProperties,
      ...(Object.keys(extraFrontmatter).length
        ? { imported_frontmatter: extraFrontmatter }
        : {}),
      nexus_source_path: path,
    } as Json;

    return {
      import_key: importKey,
      source_path: path,
      title: title.slice(0, 200),
      slug: slugifyKnowledgeTitle(asString(attributes.slug) || title),
      summary: asString(attributes.summary).slice(0, 2000),
      content_markdown: body,
      plain_text: markdownToPlainText(body),
      properties,
      node_type: mappedType,
      source_type: sourceType,
      status: pickEnum(
        attributes.status,
        STATUS_SET,
        "draft" as KnowledgeNodeStatus,
      ),
      visibility: pickEnum(
        attributes.visibility,
        VISIBILITY_SET,
        "author" as KnowledgeVisibility,
      ),
      icon: asString(attributes.icon).slice(0, 80) || null,
      aliases: asStringArray(attributes.aliases ?? attributes.alias).slice(
        0,
        50,
      ),
      tags: asStringArray(attributes.tags)
        .map((tag) => tag.replace(/^#/, "").trim())
        .filter(Boolean)
        .slice(0, 100),
      conflict_action: "skip",
      links,
      headings,
    };
  });

  const pageKeys = new Set(pages.map((page) => page.import_key));
  const relations = (
    Array.isArray(manifest.relations) ? manifest.relations : []
  )
    .filter(
      (item): item is KnowledgeImportRelation =>
        isRecord(item) &&
        pageKeys.has(asString(item.source_key)) &&
        pageKeys.has(asString(item.target_key)),
    )
    .slice(0, MAX_IMPORT_RELATIONS)
    .map((item) => ({
      source_key: asString(item.source_key),
      target_key: asString(item.target_key),
      relation_type: pickEnum(
        item.relation_type,
        RELATION_SET,
        "related_to" as RelationType,
      ),
      label: asString(item.label).slice(0, 160),
      direction: pickEnum(
        item.direction,
        DIRECTION_SET,
        "directed" as KnowledgeRelationDirection,
      ),
      visibility: pickEnum(
        item.visibility,
        VISIBILITY_SET,
        "workspace" as KnowledgeVisibility,
      ),
      properties: asJsonObject(item.properties),
    }));

  const linkedPagesByAttachment = new Map<string, Set<string>>();
  for (const page of pages) {
    for (const target of attachmentTargets(page.content_markdown)) {
      const resolved = resolveArchiveTarget(page.source_path, target, pathSet);
      if (!resolved || /\.md$/i.test(resolved)) continue;
      const keys = linkedPagesByAttachment.get(resolved) ?? new Set<string>();
      keys.add(page.import_key);
      linkedPagesByAttachment.set(resolved, keys);
    }
  }
  if (Array.isArray(manifest.attachments)) {
    for (const item of manifest.attachments) {
      if (!isRecord(item)) continue;
      const path = asString(item.path);
      if (!path || !entries[path]) continue;
      const keys = linkedPagesByAttachment.get(path) ?? new Set<string>();
      for (const key of asStringArray(item.page_keys)) {
        if (pageKeys.has(key)) keys.add(key);
      }
      linkedPagesByAttachment.set(path, keys);
    }
  }

  const manifestPath = Object.keys(entries).find((path) =>
    /(^|\/)manifest\.ya?ml$/i.test(path),
  );
  const attachments = Object.entries(entries)
    .filter(
      ([path]) =>
        !/\.md$/i.test(path) &&
        path !== manifestPath &&
        !/(^|\/)export-report\.txt$/i.test(path),
    )
    .map(([path, value]): KnowledgeImportAttachment => ({
      archive_path: path,
      original_name: basename(path),
      mime_type: mimeForPath(path),
      size_bytes: value.byteLength,
      page_keys: [...(linkedPagesByAttachment.get(path) ?? [])],
      bytes: value,
    }));
  const unsupported = attachments.filter(
    (attachment) => attachment.mime_type === "application/octet-stream",
  );
  if (unsupported.length) {
    warnings.push(
      `${unsupported.length} anexo(s) possuem formato não permitido e serão bloqueados no dry-run.`,
    );
  }

  return {
    format:
      manifest.format === NEXUS_VAULT_FORMAT
        ? NEXUS_VAULT_FORMAT
        : "markdown-vault",
    version:
      Number(manifest.version) === NEXUS_VAULT_VERSION
        ? NEXUS_VAULT_VERSION
        : 0,
    archive_name: options.archiveName ?? "cofre.zip",
    pages,
    relations,
    attachments,
    source_types: [...new Set(pages.map((page) => page.source_type))].sort(),
    warnings,
  };
}

export async function parseKnowledgeVaultFile(
  file: File,
  typeMappings?: Record<string, KnowledgeNodeType>,
) {
  if (file.size > MAX_ARCHIVE_BYTES) {
    throw new KnowledgeArchiveError(
      "KNOWLEDGE_ARCHIVE_SIZE_INVALID",
      "O ZIP ultrapassa 50 MiB.",
    );
  }
  return parseKnowledgeArchive(new Uint8Array(await file.arrayBuffer()), {
    archiveName: file.name,
    typeMappings,
  });
}

function safeExportPath(path: string, fallback: string) {
  try {
    const normalized = normalizeArchivePath(path);
    return /\.md$/i.test(normalized) ? normalized : `${normalized}.md`;
  } catch {
    return `pages/${slugifyKnowledgeTitle(fallback)}.md`;
  }
}

export function buildKnowledgeArchive(snapshot: KnowledgeExportSnapshot) {
  const entries: Record<string, Uint8Array> = {};
  const usedPaths = new Set<string>();
  const manifestPages: KnowledgeVaultManifest["pages"] = [];
  const resolvedKeys = new Map<string, string>();

  for (const page of snapshot.pages) {
    let path = safeExportPath(page.path, page.title);
    let suffix = 2;
    const base = path.replace(/\.md$/i, "");
    while (usedPaths.has(path)) path = `${base}-${suffix++}.md`;
    usedPaths.add(path);
    const frontmatter = {
      title: page.title,
      type: page.node_type,
      summary: page.summary || undefined,
      status: page.status,
      visibility: page.visibility,
      icon: page.icon || undefined,
      aliases: page.aliases.length ? page.aliases : undefined,
      tags: page.tags.length ? page.tags : undefined,
      properties: page.properties,
      nexus_original_id: page.original_id,
    };
    const yaml = stringifyYaml(frontmatter, {
      lineWidth: 0,
      defaultStringType: "QUOTE_DOUBLE",
      defaultKeyType: "PLAIN",
    }).trimEnd();
    entries[path] = strToU8(`---\n${yaml}\n---\n\n${page.content_markdown}`);
    const resolvedKey = pathWithoutExtension(path);
    resolvedKeys.set(page.key, resolvedKey);
    manifestPages.push({
      key: resolvedKey,
      path,
      original_id: page.original_id,
    });
  }

  const manifestAttachments = snapshot.attachments.map((attachment) => {
    const path = normalizeArchivePath(attachment.path);
    if (entries[path]) {
      throw new KnowledgeArchiveError(
        "KNOWLEDGE_EXPORT_PATH_CONFLICT",
        `Caminho duplicado na exportação: ${path}`,
      );
    }
    entries[path] = attachment.bytes;
    return {
      path,
      original_asset_id: attachment.original_asset_id,
      page_keys: attachment.page_keys.map(
        (key) => resolvedKeys.get(key) ?? key,
      ),
    };
  });

  const manifest: KnowledgeVaultManifest = {
    format: NEXUS_VAULT_FORMAT,
    version: NEXUS_VAULT_VERSION,
    exported_at: snapshot.exported_at ?? new Date().toISOString(),
    workspace_id: snapshot.workspace_id,
    campaign_id: snapshot.campaign_id,
    pages: manifestPages,
    relations: snapshot.relations.map((relation) => ({
      ...relation,
      source_key: resolvedKeys.get(relation.source_key) ?? relation.source_key,
      target_key: resolvedKeys.get(relation.target_key) ?? relation.target_key,
    })),
    attachments: manifestAttachments,
  };
  entries["manifest.yml"] = strToU8(
    stringifyYaml(manifest, {
      lineWidth: 0,
      defaultStringType: "QUOTE_DOUBLE",
      defaultKeyType: "PLAIN",
    }),
  );
  entries["export-report.txt"] = strToU8(
    [
      "Tadeon Nexus ~ relatório de exportação",
      `Formato: ${NEXUS_VAULT_FORMAT}@${NEXUS_VAULT_VERSION}`,
      `Páginas: ${snapshot.pages.length}`,
      `Relações: ${snapshot.relations.length}`,
      `Anexos: ${snapshot.attachments.length}`,
      `Gerado em: ${manifest.exported_at}`,
      "",
    ].join("\n"),
  );
  return zipSync(entries, { level: 6 });
}

export function inspectArchiveText(bytes: Uint8Array, path: string) {
  const entries = unzipSync(bytes);
  const value = entries[path];
  return value ? strFromU8(value) : null;
}

export function portableLookup(value: string) {
  return normalizeKnowledgeLookup(value);
}
