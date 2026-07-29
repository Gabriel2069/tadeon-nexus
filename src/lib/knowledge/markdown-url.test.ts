import { describe, expect, it } from "vitest";
import { sanitizeKnowledgeUrl } from "@/lib/knowledge/markdown-url";

describe("knowledge Markdown URLs", () => {
  it("accepts local paths and ordinary web links", () => {
    expect(sanitizeKnowledgeUrl("/mapas/cidade.png?versao=2", true)).toBe(
      "/mapas/cidade.png?versao=2",
    );
    expect(sanitizeKnowledgeUrl("https://example.com/regras")).toBe(
      "https://example.com/regras",
    );
    expect(sanitizeKnowledgeUrl("http://example.com/regras")).toBe(
      "http://example.com/regras",
    );
  });

  it("requires HTTPS for remote images", () => {
    expect(sanitizeKnowledgeUrl("https://example.com/mapa.webp", true)).toBe(
      "https://example.com/mapa.webp",
    );
    expect(sanitizeKnowledgeUrl("http://example.com/mapa.webp", true)).toBeNull();
  });

  it("blocks protocol-relative, credentialed and executable URLs", () => {
    expect(sanitizeKnowledgeUrl("//tracker.example/imagem.png", true)).toBeNull();
    expect(sanitizeKnowledgeUrl("/\\tracker.example/imagem.png", true)).toBeNull();
    expect(
      sanitizeKnowledgeUrl("https://usuario:segredo@example.com/regras"),
    ).toBeNull();
    expect(sanitizeKnowledgeUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeKnowledgeUrl("data:text/html,conteudo")).toBeNull();
  });
});
