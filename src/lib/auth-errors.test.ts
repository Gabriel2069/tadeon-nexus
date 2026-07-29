import { describe, expect, it } from "vitest";
import { getAuthErrorMessage, readAuthUrlError } from "./auth-errors";

describe("getAuthErrorMessage", () => {
  it("traduz credenciais inválidas pelo código estável", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" }, "signin")).toBe(
      "E-mail ou senha incorretos.",
    );
  });

  it("explica quando o e-mail ainda não foi confirmado", () => {
    expect(getAuthErrorMessage({ code: "email_not_confirmed" }, "signin")).toContain(
      "Confirme seu e-mail",
    );
  });

  it("distingue limite de envio de e-mail", () => {
    expect(
      getAuthErrorMessage({ code: "over_email_send_rate_limit" }, "recovery-request"),
    ).toContain("já foi enviado");
  });

  it("explica uma sessão revogada", () => {
    expect(getAuthErrorMessage({ code: "refresh_token_not_found" }, "session")).toContain(
      "sessão expirou",
    );
  });

  it("não repassa mensagens internas desconhecidas", () => {
    expect(
      getAuthErrorMessage({ code: "unknown", message: "sensitive internal detail" }, "signin"),
    ).toBe("Não foi possível entrar agora. Tente novamente.");
  });
});

describe("readAuthUrlError", () => {
  it("lê erros de links no fragmento sem expor outros parâmetros", () => {
    expect(
      readAuthUrlError(
        "https://nexus.example/login#error=access_denied&error_code=otp_expired&error_description=Expired",
      ),
    ).toEqual({ code: "otp_expired", message: "Expired" });
  });

  it("retorna nulo para uma URL de autenticação válida", () => {
    expect(readAuthUrlError("https://nexus.example/reset-password#access_token=secret")).toBeNull();
  });
});
