export const NEXUS_ASSET_BUCKET = "nexus-assets";
export const NEXUS_ASSET_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const NEXUS_ASSET_PAGE_SIZE = 24;

export const ASSET_MIME_EXTENSIONS = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/webp": ["webp"],
  "image/gif": ["gif"],
  "image/avif": ["avif"],
  "application/pdf": ["pdf"],
  "text/plain": ["txt", "log"],
  "text/markdown": ["md", "markdown"],
  "text/csv": ["csv"],
  "application/json": ["json"],
  "audio/mpeg": ["mp3", "mpeg"],
  "audio/ogg": ["ogg", "oga"],
  "audio/wav": ["wav"],
  "audio/webm": ["webm"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    "pptx",
  ],
} as const;

export type AllowedAssetMime = keyof typeof ASSET_MIME_EXTENSIONS;

export type AssetValidationCode =
  | "ASSET_EMPTY"
  | "ASSET_FILE_TOO_LARGE"
  | "ASSET_NAME_INVALID"
  | "ASSET_TYPE_INVALID"
  | "ASSET_EXTENSION_MISMATCH";

export class AssetValidationError extends Error {
  constructor(
    readonly code: AssetValidationCode,
    message: string,
  ) {
    super(message);
    this.name = "AssetValidationError";
  }
}

export interface AssetFileDescriptor {
  name: string;
  size: number;
  type: string;
}

export interface ValidatedAssetFile {
  mimeType: AllowedAssetMime;
  extension: string;
  originalName: string;
  displayName: string;
  sizeBytes: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stripControlCharacters(value: string) {
  return Array.from(value)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x1f && codePoint !== 0x7f;
    })
    .join("");
}

export function normalizeAssetName(name: string) {
  const basename = stripControlCharacters(
    name.split(/[/\\]/).pop() ?? "",
  ).trim();
  return basename.slice(0, 255);
}

export function getAssetExtension(name: string) {
  const normalized = normalizeAssetName(name);
  const separator = normalized.lastIndexOf(".");
  if (separator <= 0 || separator === normalized.length - 1) return "";
  return normalized.slice(separator + 1).toLowerCase();
}

export function assetDisplayNameFromFile(name: string) {
  const normalized = normalizeAssetName(name);
  const separator = normalized.lastIndexOf(".");
  const withoutExtension =
    separator > 0 ? normalized.slice(0, separator) : normalized;
  return (withoutExtension.trim() || "Arquivo sem título").slice(0, 255);
}

export function isAllowedAssetMime(value: string): value is AllowedAssetMime {
  return Object.prototype.hasOwnProperty.call(
    ASSET_MIME_EXTENSIONS,
    value.toLowerCase(),
  );
}

export function validateAssetFile(
  file: AssetFileDescriptor,
): ValidatedAssetFile {
  const originalName = normalizeAssetName(file.name);
  if (!originalName) {
    throw new AssetValidationError(
      "ASSET_NAME_INVALID",
      "O arquivo precisa ter um nome válido.",
    );
  }

  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new AssetValidationError(
      "ASSET_EMPTY",
      "O arquivo está vazio ou possui tamanho inválido.",
    );
  }

  if (file.size > NEXUS_ASSET_MAX_FILE_BYTES) {
    throw new AssetValidationError(
      "ASSET_FILE_TOO_LARGE",
      "O arquivo ultrapassa o limite de 25 MiB.",
    );
  }

  const mimeType = file.type.toLowerCase();
  if (!isAllowedAssetMime(mimeType)) {
    throw new AssetValidationError(
      "ASSET_TYPE_INVALID",
      "Esse formato de arquivo não é permitido no Nexus.",
    );
  }

  const extension = getAssetExtension(originalName);
  if (
    !(ASSET_MIME_EXTENSIONS[mimeType] as readonly string[]).includes(extension)
  ) {
    throw new AssetValidationError(
      "ASSET_EXTENSION_MISMATCH",
      "A extensão do arquivo não corresponde ao formato informado.",
    );
  }

  return {
    mimeType,
    extension,
    originalName,
    displayName: assetDisplayNameFromFile(originalName),
    sizeBytes: file.size,
  };
}

export function buildAssetObjectKey({
  workspaceId,
  userId,
  assetId,
  extension,
}: {
  workspaceId: string;
  userId: string;
  assetId: string;
  extension: string;
}) {
  if (
    !UUID_PATTERN.test(workspaceId) ||
    !UUID_PATTERN.test(userId) ||
    !UUID_PATTERN.test(assetId) ||
    !/^[a-z0-9]{1,10}$/.test(extension)
  ) {
    throw new AssetValidationError(
      "ASSET_NAME_INVALID",
      "Não foi possível gerar um caminho interno seguro.",
    );
  }

  return `${workspaceId}/${userId}/${assetId}.${extension}`;
}

export function formatAssetBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KiB", "MiB", "GiB"] as const;
  const order = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** order;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: order ? 1 : 0 })} ${units[order]}`;
}
