import type {
  AssetStorageAccess,
  AssetStorageAdapter,
  AssetStorageUpload,
} from "@/lib/assets/asset-provider";
import { AssetServiceError } from "@/lib/assets/asset-errors";

/**
 * Contract placeholder only. The R2 phase will implement this through a
 * Cloudflare Worker. No R2 credential or direct bucket access belongs here.
 */
export class R2StorageAdapter implements AssetStorageAdapter {
  readonly provider = "r2" as const;

  async upload(
    _request: AssetStorageUpload,
    _signal: AbortSignal,
  ): Promise<void> {
    throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
  }

  async createTemporaryAccess(_request: AssetStorageAccess): Promise<string> {
    throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
  }

  async remove(_bucket: string, _objectKey: string): Promise<void> {
    throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
  }
}
