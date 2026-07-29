import { describe, expect, it } from "vitest";
import {
  AssetValidationError,
  NEXUS_ASSET_MAX_FILE_BYTES,
  assetDisplayNameFromFile,
  buildAssetObjectKey,
  formatAssetBytes,
  getAssetExtension,
  normalizeAssetName,
  validateAssetFile,
} from "@/lib/assets/file-validation";

function captureValidationError(callback: () => unknown) {
  let captured: unknown;
  try {
    callback();
  } catch (error) {
    captured = error;
  }
  expect(captured).toBeInstanceOf(AssetValidationError);
  return captured as AssetValidationError;
}

describe("Nexus Assets file validation", () => {
  it("accepts a whitelisted file when MIME and extension agree", () => {
    expect(
      validateAssetFile({ name: "Mapa.webp", type: "image/webp", size: 2048 }),
    ).toEqual({
      mimeType: "image/webp",
      extension: "webp",
      originalName: "Mapa.webp",
      displayName: "Mapa",
      sizeBytes: 2048,
    });
  });

  it("rejects generic binaries and executable extensions", () => {
    expect(() =>
      validateAssetFile({
        name: "instalador.exe",
        type: "application/octet-stream",
        size: 1024,
      }),
    ).toThrowError(AssetValidationError);
  });

  it("rejects a MIME and extension mismatch", () => {
    const error = captureValidationError(() =>
      validateAssetFile({
        name: "mapa.png",
        type: "application/pdf",
        size: 1024,
      }),
    );
    expect(error.code).toBe("ASSET_EXTENSION_MISMATCH");
  });

  it("rejects empty and oversized files before any request", () => {
    expect(() =>
      validateAssetFile({ name: "vazio.txt", type: "text/plain", size: 0 }),
    ).toThrow();
    const error = captureValidationError(() =>
      validateAssetFile({
        name: "gigante.pdf",
        type: "application/pdf",
        size: NEXUS_ASSET_MAX_FILE_BYTES + 1,
      }),
    );
    expect(error.code).toBe("ASSET_FILE_TOO_LARGE");
  });

  it("strips browser path fragments from display metadata", () => {
    expect(normalizeAssetName("C:\\fakepath\\mapa final.png")).toBe(
      "mapa final.png",
    );
    expect(assetDisplayNameFromFile("../../mapa final.png")).toBe("mapa final");
    expect(getAssetExtension("ARQUIVO.PDF")).toBe("pdf");
  });

  it("builds an internal path only from trusted UUIDs", () => {
    expect(
      buildAssetObjectKey({
        workspaceId: "5fffb105-9018-4a5b-84ef-e895d186a279",
        userId: "284ec295-1d52-43fa-abbc-36c044979d1f",
        assetId: "11111111-1111-4111-8111-111111111111",
        extension: "png",
      }),
    ).toBe(
      "5fffb105-9018-4a5b-84ef-e895d186a279/284ec295-1d52-43fa-abbc-36c044979d1f/11111111-1111-4111-8111-111111111111.png",
    );
  });

  it("rejects traversal attempts instead of normalizing them into keys", () => {
    const error = captureValidationError(() =>
      buildAssetObjectKey({
        workspaceId: "../workspace",
        userId: "284ec295-1d52-43fa-abbc-36c044979d1f",
        assetId: "11111111-1111-4111-8111-111111111111",
        extension: "png",
      }),
    );
    expect(error.code).toBe("ASSET_NAME_INVALID");
  });

  it("formats storage usage consistently", () => {
    expect(formatAssetBytes(0)).toBe("0 B");
    expect(formatAssetBytes(1024)).toBe("1 KiB");
    expect(formatAssetBytes(5 * 1024 * 1024)).toBe("5 MiB");
  });
});
