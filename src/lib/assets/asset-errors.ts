import { AssetValidationError } from "@/lib/assets/file-validation";

export type AssetServiceErrorCode =
  | "ASSET_ABORTED"
  | "ASSET_AUTH_REQUIRED"
  | "ASSET_FEATURE_DISABLED"
  | "ASSET_FILE_TOO_LARGE"
  | "ASSET_IN_USE"
  | "ASSET_NOT_FOUND"
  | "ASSET_PERMISSION_DENIED"
  | "ASSET_PROVIDER_UNAVAILABLE"
  | "ASSET_QUOTA_EXCEEDED"
  | "ASSET_SESSION_EXPIRED"
  | "ASSET_TYPE_INVALID"
  | "ASSET_UPLOAD_FAILED"
  | "ASSET_UNKNOWN";

const MESSAGES: Record<AssetServiceErrorCode, string> = {
  ASSET_ABORTED: "O envio foi cancelado.",
  ASSET_AUTH_REQUIRED:
    "Sua sessão precisa ser renovada antes de enviar arquivos.",
  ASSET_FEATURE_DISABLED:
    "O Nexus Assets ainda não foi ativado neste ambiente.",
  ASSET_FILE_TOO_LARGE: "O arquivo ultrapassa o limite permitido.",
  ASSET_IN_USE:
    "O arquivo está sendo utilizado. Confirme a exclusão para continuar.",
  ASSET_NOT_FOUND: "O arquivo não foi encontrado ou não está mais disponível.",
  ASSET_PERMISSION_DENIED:
    "Você não possui permissão para acessar esse arquivo.",
  ASSET_PROVIDER_UNAVAILABLE:
    "O provedor de arquivos solicitado ainda não está disponível.",
  ASSET_QUOTA_EXCEEDED: "O espaço reservado para este workspace foi atingido.",
  ASSET_SESSION_EXPIRED:
    "A reserva de envio expirou. Selecione o arquivo novamente.",
  ASSET_TYPE_INVALID: "Esse formato de arquivo não é permitido.",
  ASSET_UPLOAD_FAILED: "Não foi possível concluir o envio do arquivo.",
  ASSET_UNKNOWN: "Não foi possível concluir a operação com o arquivo.",
};

export class AssetServiceError extends Error {
  constructor(
    readonly code: AssetServiceErrorCode,
    options?: { cause?: unknown },
  ) {
    super(MESSAGES[code], options);
    this.name = "AssetServiceError";
  }
}

const DATABASE_CODE_MAP: Array<[needle: string, code: AssetServiceErrorCode]> =
  [
    ["ASSET_FEATURE_DISABLED", "ASSET_FEATURE_DISABLED"],
    ["ASSET_FILE_TOO_LARGE", "ASSET_FILE_TOO_LARGE"],
    ["ASSET_WORKSPACE_QUOTA_EXCEEDED", "ASSET_QUOTA_EXCEEDED"],
    ["ASSET_IN_USE", "ASSET_IN_USE"],
    ["ASSET_SESSION_NOT_FOUND", "ASSET_SESSION_EXPIRED"],
    ["ASSET_OBJECT_NOT_FOUND", "ASSET_UPLOAD_FAILED"],
    ["ASSET_UPLOAD_DENIED", "ASSET_PERMISSION_DENIED"],
    ["ASSET_WORKSPACE_DENIED", "ASSET_PERMISSION_DENIED"],
    ["ASSET_CAMPAIGN_DENIED", "ASSET_PERMISSION_DENIED"],
    ["ASSET_SESSION_UNAUTHORIZED", "ASSET_PERMISSION_DENIED"],
    ["ASSET_R2_DISABLED", "ASSET_PROVIDER_UNAVAILABLE"],
    ["ASSET_R2_CONFIRMATION_REQUIRED", "ASSET_UPLOAD_FAILED"],
    ["ASSET_TYPE_", "ASSET_TYPE_INVALID"],
    ["42501", "ASSET_PERMISSION_DENIED"],
  ];

export function toAssetServiceError(
  error: unknown,
  fallback: AssetServiceErrorCode,
) {
  if (error instanceof AssetServiceError) return error;

  if (error instanceof AssetValidationError) {
    const code: AssetServiceErrorCode =
      error.code === "ASSET_FILE_TOO_LARGE"
        ? "ASSET_FILE_TOO_LARGE"
        : error.code === "ASSET_TYPE_INVALID" ||
            error.code === "ASSET_EXTENSION_MISMATCH"
          ? "ASSET_TYPE_INVALID"
          : fallback;
    return new AssetServiceError(code, { cause: error });
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new AssetServiceError("ASSET_ABORTED", { cause: error });
  }

  const diagnostic =
    error && typeof error === "object"
      ? `${"code" in error ? String(error.code) : ""} ${
          "message" in error ? String(error.message) : ""
        }`
      : "";

  const mapped = DATABASE_CODE_MAP.find(([needle]) =>
    diagnostic.includes(needle),
  )?.[1];
  return new AssetServiceError(mapped ?? fallback, { cause: error });
}
