import { describe, expect, it } from "vitest";
import {
  encodeR2ObjectPath,
  extractBearerToken,
  isOriginAllowed,
  normalizeMime,
  sanitizeAssetName,
} from "@/server/nexus-assets-r2";

describe("Nexus Assets R2 Worker boundary", () => {
  it("accepts a bounded bearer token and rejects malformed authorization", () => {
    expect(
      extractBearerToken(
        new Request("https://nexus.example/api/nexus-assets/request-upload", {
          headers: { Authorization: "Bearer header.payload.signature" },
        }),
      ),
    ).toBe("header.payload.signature");
    expect(() =>
      extractBearerToken(
        new Request("https://nexus.example/api/nexus-assets/request-upload"),
      ),
    ).toThrow();
  });

  it("allows same-origin requests and only explicitly configured extra origins", () => {
    const environment = {
      NEXUS_ALLOWED_ORIGINS: "https://preview.example,http://localhost:3000",
    };
    const requestUrl = "https://nexus.example/api/nexus-assets/request-upload";

    expect(
      isOriginAllowed("https://nexus.example", requestUrl, environment),
    ).toBe(true);
    expect(
      isOriginAllowed("https://preview.example", requestUrl, environment),
    ).toBe(true);
    expect(
      isOriginAllowed("https://attacker.example", requestUrl, environment),
    ).toBe(false);
  });

  it("encodes each key segment without changing the storage hierarchy", () => {
    expect(encodeR2ObjectPath("workspace/user/mapa final.webp")).toBe(
      "workspace/user/mapa%20final.webp",
    );
  });

  it("sanitizes browser paths and MIME parameters before registration", () => {
    expect(
      sanitizeAssetName("C:\\fakepath\\Mapa final.webp", "arquivo.webp"),
    ).toBe("Mapa final.webp");
    expect(normalizeMime("image/webp; charset=binary")).toBe("image/webp");
  });
});
