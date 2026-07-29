import { describe, expect, it } from "vitest";
import {
  AssetServiceError,
  toAssetServiceError,
} from "@/lib/assets/asset-errors";

describe("Nexus Assets error normalization", () => {
  it("never exposes raw database messages to the interface", () => {
    const error = toAssetServiceError(
      {
        code: "P0001",
        message: "ASSET_UPLOAD_DENIED: internal database details",
      },
      "ASSET_UNKNOWN",
    );

    expect(error).toBeInstanceOf(AssetServiceError);
    expect(error.code).toBe("ASSET_PERMISSION_DENIED");
    expect(error.message).toBe(
      "Você não possui permissão para acessar esse arquivo.",
    );
    expect(error.message).not.toContain("internal database details");
  });

  it("maps disabled R2 to an unavailable provider without leaking implementation details", () => {
    const error = toAssetServiceError(
      { code: "P0001", message: "ASSET_R2_DISABLED" },
      "ASSET_UNKNOWN",
    );

    expect(error.code).toBe("ASSET_PROVIDER_UNAVAILABLE");
  });
});
