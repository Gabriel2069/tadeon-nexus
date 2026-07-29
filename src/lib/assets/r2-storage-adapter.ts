import { supabase } from "@/integrations/supabase/client";
import type {
  AssetStorageAccess,
  AssetStorageAdapter,
  AssetStorageUpload,
  AssetStorageUploadResult,
} from "@/lib/assets/asset-provider";
import {
  AssetServiceError,
  type AssetServiceErrorCode,
} from "@/lib/assets/asset-errors";

const WORKER_BASE_PATH = "/api/nexus-assets";

const WORKER_ERROR_CODES = new Set<AssetServiceErrorCode>([
  "ASSET_ABORTED",
  "ASSET_AUTH_REQUIRED",
  "ASSET_FEATURE_DISABLED",
  "ASSET_FILE_TOO_LARGE",
  "ASSET_IN_USE",
  "ASSET_NOT_FOUND",
  "ASSET_PERMISSION_DENIED",
  "ASSET_PROVIDER_UNAVAILABLE",
  "ASSET_QUOTA_EXCEEDED",
  "ASSET_SESSION_EXPIRED",
  "ASSET_TYPE_INVALID",
  "ASSET_UPLOAD_FAILED",
  "ASSET_UNKNOWN",
]);

function isWorkerErrorCode(value: unknown): value is AssetServiceErrorCode {
  return (
    typeof value === "string" &&
    WORKER_ERROR_CODES.has(value as AssetServiceErrorCode)
  );
}

async function workerJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${WORKER_BASE_PATH}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const code =
      payload &&
      typeof payload === "object" &&
      "code" in payload &&
      isWorkerErrorCode(payload.code)
        ? payload.code
        : response.status === 401
          ? "ASSET_AUTH_REQUIRED"
          : response.status === 403
            ? "ASSET_PERMISSION_DENIED"
            : response.status === 404
              ? "ASSET_NOT_FOUND"
              : response.status === 503
                ? "ASSET_PROVIDER_UNAVAILABLE"
                : "ASSET_UPLOAD_FAILED";
    throw new AssetServiceError(code);
  }

  return (await response.json()) as T;
}

function assertR2SignedUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".r2.cloudflarestorage.com")
  ) {
    throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
  }
  return url.toString();
}

function uploadDirectly(
  url: string,
  request: AssetStorageUpload,
  signal: AbortSignal,
) {
  if (typeof XMLHttpRequest === "undefined") {
    return Promise.reject(new AssetServiceError("ASSET_UPLOAD_FAILED"));
  }
  if (signal.aborted) {
    return Promise.reject(new AssetServiceError("ASSET_ABORTED"));
  }

  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();

    signal.addEventListener("abort", abort, { once: true });
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", request.mimeType);

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
      reject(new AssetServiceError("ASSET_UPLOAD_FAILED"));
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

async function currentAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token)
    throw new AssetServiceError("ASSET_AUTH_REQUIRED");
  return session.access_token;
}

export class R2StorageAdapter implements AssetStorageAdapter {
  readonly provider = "r2" as const;

  async upload(
    request: AssetStorageUpload,
    signal: AbortSignal,
  ): Promise<AssetStorageUploadResult> {
    const authorization = await workerJson<{ uploadUrl: string }>(
      "/request-upload",
      request.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          uploadSessionId: request.uploadSessionId,
          assetId: request.assetId,
          bucket: request.bucket,
          objectKey: request.objectKey,
          mimeType: request.mimeType,
          extension: request.extension,
          sizeBytes: request.sizeBytes,
        }),
        signal,
      },
    );

    await uploadDirectly(
      assertR2SignedUrl(authorization.uploadUrl),
      request,
      signal,
    );
    if (signal.aborted) throw new AssetServiceError("ASSET_ABORTED");

    const completed = await workerJson<{ asset: unknown }>(
      "/complete-upload",
      request.accessToken,
      {
        method: "POST",
        body: JSON.stringify({
          uploadSessionId: request.uploadSessionId,
          assetId: request.assetId,
          workspaceId: request.workspaceId,
          campaignId: request.campaignId,
          bucket: request.bucket,
          objectKey: request.objectKey,
          originalName: request.originalName,
          displayName: request.displayName,
          mimeType: request.mimeType,
          extension: request.extension,
          sizeBytes: request.sizeBytes,
          visibility: request.visibility,
          metadata: request.metadata,
        }),
        signal,
      },
    );

    return { registeredAsset: completed.asset };
  }

  async createTemporaryAccess(request: AssetStorageAccess): Promise<string> {
    const accessToken = await currentAccessToken();
    const result = await workerJson<{ url: string }>(
      `/${encodeURIComponent(request.assetId)}/access?expires=${request.expiresInSeconds}`,
      accessToken,
    );
    return assertR2SignedUrl(result.url);
  }

  async remove(
    _bucket: string,
    _objectKey: string,
    assetId: string,
  ): Promise<void> {
    const accessToken = await currentAccessToken();
    await workerJson<{ removed: true }>(
      `/${encodeURIComponent(assetId)}`,
      accessToken,
      { method: "DELETE" },
    );
  }
}

export const r2StorageAdapter = new R2StorageAdapter();
