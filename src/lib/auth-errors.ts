export type AuthAction =
  | "signin"
  | "signup"
  | "recovery-request"
  | "password-update"
  | "account-update"
  | "session"
  | "link";

interface AuthErrorLike {
  code?: string;
  message?: string;
  name?: string;
  status?: number;
}

const DEFAULT_MESSAGES: Record<AuthAction, string> = {
  signin: "Não foi possível entrar agora. Tente novamente.",
  signup: "Não foi possível concluir o cadastro agora. Tente novamente.",
  "recovery-request": "Não foi possível enviar o e-mail de redefinição agora.",
  "password-update": "Não foi possível salvar a nova senha. Solicite outro link.",
  "account-update": "Não foi possível atualizar a conta agora. Tente novamente.",
  session: "Não foi possível validar sua sessão. Tente novamente.",
  link: "Este link de acesso é inválido ou expirou.",
};

function normalizeError(error: unknown): AuthErrorLike {
  if (!error || typeof error !== "object") {
    return { message: typeof error === "string" ? error : undefined };
  }

  const candidate = error as Record<string, unknown>;
  return {
    code: typeof candidate.code === "string" ? candidate.code.toLowerCase() : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    name: typeof candidate.name === "string" ? candidate.name : undefined,
    status: typeof candidate.status === "number" ? candidate.status : undefined,
  };
}

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const normalized = normalizeError(error);
  const code = normalized.code;
  const raw = normalized.message?.toLowerCase() ?? "";

  if (
    normalized.name === "AuthRetryableFetchError" ||
    /failed to fetch|network|fetch failed|load failed/.test(raw)
  ) {
    return "Não foi possível alcançar o servidor. Verifique sua conexão e tente novamente.";
  }

  if (normalized.status === 429 || code === "over_request_rate_limit") {
    return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
  }

  switch (code) {
    case "invalid_credentials":
    case "invalid_grant":
      return "E-mail ou senha incorretos.";
    case "email_not_confirmed":
      return "Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.";
    case "user_banned":
      return "Esta conta está temporariamente indisponível. Procure o mestre da mesa.";
    case "over_email_send_rate_limit":
      return "Um e-mail já foi enviado há pouco. Aguarde antes de solicitar outro.";
    case "signup_disabled":
      return "Novos cadastros estão temporariamente desativados.";
    case "email_exists":
    case "user_already_exists":
    case "identity_already_exists":
      return "Este e-mail já está cadastrado. Entre ou redefina sua senha.";
    case "email_address_invalid":
    case "validation_failed":
      return "Informe um endereço de e-mail válido.";
    case "weak_password":
      return "A senha não atende aos requisitos de segurança. Use ao menos 8 caracteres.";
    case "same_password":
      return "Escolha uma senha diferente da atual.";
    case "reauthentication_needed":
      return "Entre novamente antes de alterar estes dados.";
    case "refresh_token_not_found":
    case "refresh_token_already_used":
    case "session_not_found":
      return "Sua sessão expirou ou foi encerrada em outro dispositivo. Entre novamente.";
    case "otp_expired":
    case "flow_state_expired":
    case "bad_code_verifier":
    case "invalid_token":
      return "Este link é inválido, expirou ou já foi utilizado. Solicite outro.";
    case "unexpected_failure":
      return "O serviço de acesso encontrou uma falha temporária. Tente novamente em instantes.";
    default:
      break;
  }

  if (/invalid login credentials/.test(raw)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/.test(raw)) {
    return "Confirme seu e-mail antes de entrar. Verifique também a pasta de spam.";
  }
  if (/weak password|password.*(?:6|8)/.test(raw)) {
    return "A senha não atende aos requisitos de segurança. Use ao menos 8 caracteres.";
  }

  return DEFAULT_MESSAGES[action];
}

export interface AuthUrlError {
  code?: string;
  message?: string;
}

export function readAuthUrlError(href: string): AuthUrlError | null {
  try {
    const url = new URL(href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const sources = [url.searchParams, hashParams];

    for (const params of sources) {
      const code = params.get("error_code") ?? params.get("error");
      const message = params.get("error_description");
      if (code || message) {
        return {
          code: code ?? undefined,
          message: message ?? undefined,
        };
      }
    }
  } catch {
    return null;
  }

  return null;
}
