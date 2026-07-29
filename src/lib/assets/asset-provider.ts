import type { Json } from "@/integrations/supabase/types";
import type { AssetProvider, AssetVisibility } from "@/lib/nexus-contracts";

export interface AssetUploadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface AssetStorageUpload {
  uploadSessionId: string;
  assetId: string;
  workspaceId: string;
  campaignId: string | null;
  bucket: string;
  objectKey: string;
  file: File;
  accessToken: string;
  originalName: string;
  displayName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  visibility: AssetVisibility;
  metadata: { [key: string]: Json | undefined };
  onProgress?: (progress: AssetUploadProgress) => void;
}

export interface AssetStorageUploadResult {
  registeredAsset?: unknown;
}

export interface AssetStorageAccess {
  assetId: string;
  bucket: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface AssetStorageAdapter {
  readonly provider: AssetProvider;
  upload(
    request: AssetStorageUpload,
    signal: AbortSignal,
  ): Promise<AssetStorageUploadResult | void>;
  createTemporaryAccess(request: AssetStorageAccess): Promise<string>;
  remove(bucket: string, objectKey: string, assetId: string): Promise<void>;
}

export type AssetStorageAdapterRegistry = Readonly<
  Partial<Record<AssetProvider, AssetStorageAdapter>>
>;
