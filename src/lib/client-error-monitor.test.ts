import { describe, expect, it } from "vitest";
import { sanitizeClientErrorMessage } from "@/lib/client-error-monitor";

describe("sanitizeClientErrorMessage", () => {
  it("removes public and secret-looking credentials", () => {
    expect(
      sanitizeClientErrorMessage(
        "Bearer abc.def.ghi sb_publishable_ABC123 postgresql://user:pass@host/db",
      ),
    ).not.toMatch(/abc\.def|ABC123|user:pass/);
  });

  it("removes e-mail addresses and limits stored text", () => {
    const sanitized = sanitizeClientErrorMessage(
      `Falha para pessoa@example.com ${"x".repeat(700)}`,
    );
    expect(sanitized).not.toContain("pessoa@example.com");
    expect(sanitized.length).toBeLessThanOrEqual(500);
  });
});
