import { describe, expect, it } from "vitest";
import { CANONICAL_AUTH_ORIGIN, resolveAuthRedirectOrigin } from "@/lib/auth-redirect";

describe("resolveAuthRedirectOrigin", () => {
  it("uses the configured public site when provided", () => {
    expect(
      resolveAuthRedirectOrigin("http://localhost:3000", "https://nexus.example.com/path"),
    ).toBe("https://nexus.example.com");
  });

  it("never sends email links to local or temporary preview origins", () => {
    expect(resolveAuthRedirectOrigin("http://localhost:3000")).toBe(CANONICAL_AUTH_ORIGIN);
    expect(resolveAuthRedirectOrigin("https://preview-123.lovableproject.com")).toBe(
      CANONICAL_AUTH_ORIGIN,
    );
  });

  it("preserves a stable deployed origin", () => {
    expect(resolveAuthRedirectOrigin("https://tadeon-nexus.lovable.app")).toBe(
      CANONICAL_AUTH_ORIGIN,
    );
  });
});
