import type { AssetProvider } from "@/lib/nexus-contracts";

export interface AssetUploadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface AssetStorageUpload {
  bucket: string;
  objectKey: string;
  file: File;
  accessToken: string;
  onProgress?: (progress: AssetUploadProgress) => void;
}

export interface AssetStorageAccess {
  bucket: string;
  objectKey: string;
  expiresInSeconds: number;
}

export interface AssetStorageAdapter {
  readonly provider: AssetProvider;
  upload(request: AssetStorageUpload, signal: AbortSignal): Promise<void>;
  createTemporaryAccess(request: AssetStorageAccess): Promise<string>;
  remove(bucket: string, objectKey: string): Promise<void>;
}

export type AssetStorageAdapterRegistry = Readonly<
  Partial<Record<AssetProvider, AssetStorageAdapter>>
>;
