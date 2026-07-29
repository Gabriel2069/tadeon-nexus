import type {
  AssetStorageAccess,
  AssetStorageAdapter,
  AssetStorageUpload,
} from "@/lib/assets/asset-provider";
import { AssetServiceError } from "@/lib/assets/asset-errors";
import {
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_URL,
  resolvePublicSupabaseConfig,
} from "@/integrations/supabase/public-config";
import { supabase } from "@/integrations/supabase/client";

function getPublicStorageConfig() {
  return resolvePublicSupabaseConfig({
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env
      .VITE_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_URL:
      typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined,
    SUPABASE_PUBLISHABLE_KEY:
      typeof process !== "undefined"
        ? process.env.SUPABASE_PUBLISHABLE_KEY
        : undefined,
  });
}

function encodeObjectPath(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

export class SupabaseStorageAdapter implements AssetStorageAdapter {
  readonly provider = "supabase" as const;

  upload(request: AssetStorageUpload, signal: AbortSignal) {
    if (typeof XMLHttpRequest === "undefined") {
      return Promise.reject(new AssetServiceError("ASSET_UPLOAD_FAILED"));
    }
    if (signal.aborted) {
      return Promise.reject(new AssetServiceError("ASSET_ABORTED"));
    }

    const config = getPublicStorageConfig();

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = () => xhr.abort();

      signal.addEventListener("abort", abort, { once: true });
      xhr.open(
        "POST",
        `${config.url}/storage/v1/object/${encodeURIComponent(request.bucket)}/${encodeObjectPath(
          request.objectKey,
        )}`,
      );
      xhr.setRequestHeader("Authorization", `Bearer ${request.accessToken}`);
      xhr.setRequestHeader(
        "apikey",
        config.publishableKey || DEFAULT_SUPABASE_PUBLISHABLE_KEY,
      );
      xhr.setRequestHeader("Content-Type", request.file.type);
      xhr.setRequestHeader("Cache-Control", "3600");
      xhr.setRequestHeader("x-upsert", "false");

      xhr.upload.onprogress = (event) => {
        const total = event.lengthComputable ? event.total : request.file.size;
        request.onProgress?.({
          loadedBytes: event.loaded,
          totalBytes: total,
          percent:
            total > 0
              ? Math.min(100, Math.round((event.loaded / total) * 100))
              : 0,
        });
      };

      xhr.onload = () => {
        signal.removeEventListener("abort", abort);
        if (xhr.status >= 200 && xhr.status < 300) {
          request.onProgress?.({
            loadedBytes: request.file.size,
            totalBytes: request.file.size,
            percent: 100,
          });
          resolve();
          return;
        }
        reject(
          new AssetServiceError(
            xhr.status === 401 ? "ASSET_AUTH_REQUIRED" : "ASSET_UPLOAD_FAILED",
          ),
        );
      };
      xhr.onerror = () => {
        signal.removeEventListener("abort", abort);
        reject(new AssetServiceError("ASSET_UPLOAD_FAILED"));
      };
      xhr.onabort = () => {
        signal.removeEventListener("abort", abort);
        reject(new AssetServiceError("ASSET_ABORTED"));
      };
      xhr.send(request.file);
    });
  }

  async createTemporaryAccess(request: AssetStorageAccess) {
    const { data, error } = await supabase.storage
      .from(request.bucket)
      .createSignedUrl(request.objectKey, request.expiresInSeconds);

    if (error || !data?.signedUrl) {
      throw new AssetServiceError("ASSET_PERMISSION_DENIED", { cause: error });
    }
    return data.signedUrl;
  }

  async remove(bucket: string, objectKey: string) {
    const { error } = await supabase.storage.from(bucket).remove([objectKey]);
    if (error)
      throw new AssetServiceError("ASSET_UPLOAD_FAILED", { cause: error });
  }
}

export const supabaseStorageAdapter = new SupabaseStorageAdapter();

export const SUPABASE_STORAGE_PUBLIC_FALLBACK = Object.freeze({
  url: DEFAULT_SUPABASE_URL,
  publishableKey: DEFAULT_SUPABASE_PUBLISHABLE_KEY,
});
