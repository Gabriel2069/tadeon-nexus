export type KnowledgeErrorCode =
  | "KNOWLEDGE_AUTH_REQUIRED"
  | "KNOWLEDGE_DISABLED"
  | "KNOWLEDGE_FORBIDDEN"
  | "KNOWLEDGE_NOT_FOUND"
  | "KNOWLEDGE_CONFLICT"
  | "KNOWLEDGE_INVALID_INPUT"
  | "KNOWLEDGE_LINK_LIMIT_EXCEEDED"
  | "KNOWLEDGE_ALIAS_CONFLICT"
  | "KNOWLEDGE_SLUG_CONFLICT"
  | "KNOWLEDGE_UNKNOWN";

const USER_MESSAGES: Record<KnowledgeErrorCode, string> = {
  KNOWLEDGE_AUTH_REQUIRED: "Entre novamente para continuar.",
  KNOWLEDGE_DISABLED: "O Nexus ainda não está disponível neste ambiente.",
  KNOWLEDGE_FORBIDDEN: "Você não tem permissão para realizar esta ação.",
  KNOWLEDGE_NOT_FOUND: "A página não foi encontrada ou não está mais disponível.",
  KNOWLEDGE_CONFLICT:
    "Esta página mudou em outro lugar. Recarregue para comparar antes de salvar.",
  KNOWLEDGE_INVALID_INPUT: "Revise os dados da página e tente novamente.",
  KNOWLEDGE_LINK_LIMIT_EXCEEDED:
    "Esta página ultrapassa o limite de 1.000 wikilinks ou títulos. Divida o conteúdo antes de salvar.",
  KNOWLEDGE_ALIAS_CONFLICT:
    "Este alias já identifica outra página no mesmo espaço.",
  KNOWLEDGE_SLUG_CONFLICT:
    "Já existe uma página com este endereço no mesmo espaço.",
  KNOWLEDGE_UNKNOWN: "Não foi possível concluir a operação. Tente novamente.",
};

export class KnowledgeServiceError extends Error {
  readonly userMessage: string;

  constructor(
    readonly code: KnowledgeErrorCode,
    options?: { cause?: unknown },
  ) {
    super(code, options);
    this.name = "KnowledgeServiceError";
    this.userMessage = USER_MESSAGES[code];
  }
}

function readErrorText(error: unknown) {
  if (!error || typeof error !== "object") return "";
  const fields = error as Record<string, unknown>;
  return [fields.code, fields.message, fields.details, fields.hint]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

export function toKnowledgeServiceError(
  error: unknown,
  fallback: KnowledgeErrorCode = "KNOWLEDGE_UNKNOWN",
) {
  if (error instanceof KnowledgeServiceError) return error;
  const text = readErrorText(error);

  if (
    text.includes("jwt") ||
    text.includes("auth required") ||
    text.includes("not authenticated")
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_AUTH_REQUIRED", {
      cause: error,
    });
  }
  if (
    text.includes("feature_disabled") ||
    (text.includes("knowledge_create_forbidden") && text.includes("flag"))
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_DISABLED", { cause: error });
  }
  if (
    text.includes("42501") ||
    text.includes("row-level security") ||
    text.includes("forbidden") ||
    text.includes("permission denied")
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_FORBIDDEN", { cause: error });
  }
  if (text.includes("knowledge_status_forbidden")) {
    return new KnowledgeServiceError("KNOWLEDGE_FORBIDDEN", { cause: error });
  }
  if (
    text.includes("knowledge_aliases_workspace_scope_key") ||
    text.includes("knowledge_aliases_campaign_scope_key")
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_ALIAS_CONFLICT", {
      cause: error,
    });
  }
  if (
    text.includes("knowledge_nodes_workspace_slug_active_key") ||
    text.includes("knowledge_nodes_campaign_slug_active_key")
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_SLUG_CONFLICT", {
      cause: error,
    });
  }
  if (text.includes("knowledge_link_limit_exceeded")) {
    return new KnowledgeServiceError("KNOWLEDGE_LINK_LIMIT_EXCEEDED", {
      cause: error,
    });
  }
  if (text.includes("knowledge_conflict")) {
    return new KnowledgeServiceError("KNOWLEDGE_CONFLICT", {
      cause: error,
    });
  }
  if (
    text.includes("23514") ||
    text.includes("22p02") ||
    text.includes("invalid")
  ) {
    return new KnowledgeServiceError("KNOWLEDGE_INVALID_INPUT", {
      cause: error,
    });
  }
  return new KnowledgeServiceError(fallback, { cause: error });
}
