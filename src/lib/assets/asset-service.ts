import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AssetProvider, AssetVisibility } from "@/lib/nexus-contracts";
import type {
  AssetStorageAdapterRegistry,
  AssetUploadProgress,
} from "@/lib/assets/asset-provider";
import {
  AssetServiceError,
  toAssetServiceError,
} from "@/lib/assets/asset-errors";
import {
  NEXUS_ASSET_BUCKET,
  NEXUS_ASSET_PAGE_SIZE,
  buildAssetObjectKey,
  normalizeAssetName,
  validateAssetFile,
} from "@/lib/assets/file-validation";
import { r2StorageAdapter } from "@/lib/assets/r2-storage-adapter";
import { supabaseStorageAdapter } from "@/lib/assets/supabase-storage-adapter";

const assetDatabase = supabase as unknown as SupabaseClient;

export interface NexusAsset {
  id: string;
  workspace_id: string;
  campaign_id: string | null;
  provider: AssetProvider;
  bucket: string;
  object_key: string;
  original_name: string;
  display_name: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  checksum: string | null;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  thumbnail_asset_id: string | null;
  visibility: AssetVisibility;
  status: "pending" | "ready" | "failed";
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  metadata: Json;
}

export interface AssetUsageLink {
  id: string;
  asset_id: string;
  entity_type: string;
  entity_id: string;
  role: string;
  sort_order: number;
  created_at: string;
}

export interface AssetUsageSummary {
  provider: AssetProvider;
  activeFileCount: number;
  activeBytes: number;
  deletedFileCount: number;
  deletedBytes: number;
  maxTotalBytes: number;
  maxFileSizeBytes: number;
}

export interface AssetListOptions {
  workspaceId: string;
  campaignId?: string | null;
  provider?: AssetProvider;
  mimePrefix?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}

export interface AssetListResult {
  assets: NexusAsset[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AssetUploadOptions {
  workspaceId: string;
  campaignId?: string | null;
  file: File;
  displayName?: string;
  visibility?: AssetVisibility;
  provider?: AssetProvider;
  metadata?: Json;
  onProgress?: (progress: AssetUploadProgress) => void;
}

export interface AssetUploadTask {
  readonly promise: Promise<NexusAsset>;
  cancel(): void;
}

export interface OrphanedAssetObject {
  bucket: string;
  objectKey: string;
  sizeBytes: number | null;
  createdAt: string | null;
}

export type ResolvedAssetReference =
  | { kind: "catalog"; asset: NexusAsset }
  | { kind: "legacy"; url: string };

function clampInteger(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(value!)));
}

function safeDisplayName(value: string | undefined, fallback: string) {
  const normalized = value ? normalizeAssetName(value) : "";
  return (normalized || fallback).slice(0, 255);
}

function normalizeMetadata(value: Json | undefined): {
  [key: string]: Json | undefined;
} {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function escapePostgrestPattern(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

async function markUploadSession(
  sessionId: string | undefined,
  status: "uploading" | "cancelled" | "failed",
  errorCode?: string,
) {
  if (!sessionId) return;
  await assetDatabase
    .from("asset_upload_sessions")
    .update({ status, error_code: errorCode ?? null })
    .eq("id", sessionId);
}

export class AssetService {
  constructor(
    private readonly adapters: AssetStorageAdapterRegistry = {
      supabase: supabaseStorageAdapter,
      r2: r2StorageAdapter,
    },
  ) {}

  createUploadTask(options: AssetUploadOptions): AssetUploadTask {
    const controller = new AbortController();

    return {
      cancel: () => controller.abort(),
      promise: this.upload(options, controller.signal),
    };
  }

  private async upload(options: AssetUploadOptions, signal: AbortSignal) {
    let uploadSessionId: string | undefined;

    try {
      const validated = validateAssetFile(options.file);
      const provider = options.provider ?? "supabase";
      const adapter = this.adapters[provider];
      if (!adapter) throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user || !session.access_token) {
        throw new AssetServiceError("ASSET_AUTH_REQUIRED");
      }
      if (signal.aborted) throw new AssetServiceError("ASSET_ABORTED");

      const assetId = crypto.randomUUID();
      const objectKey = buildAssetObjectKey({
        workspaceId: options.workspaceId,
        userId: session.user.id,
        assetId,
        extension: validated.extension,
      });
      const bucket =
        provider === "supabase" ? NEXUS_ASSET_BUCKET : "nexus-assets-r2";

      const { data: uploadSession, error: reservationError } =
        await assetDatabase
          .from("asset_upload_sessions")
          .insert({
            expected_asset_id: assetId,
            user_id: session.user.id,
            workspace_id: options.workspaceId,
            campaign_id: options.campaignId ?? null,
            expected_provider: provider,
            expected_bucket: bucket,
            expected_key: objectKey,
            expected_mime: validated.mimeType,
            expected_extension: validated.extension,
            expected_size: validated.sizeBytes,
          })
          .select("id")
          .single();

      if (reservationError || !uploadSession?.id) {
        throw toAssetServiceError(reservationError, "ASSET_UPLOAD_FAILED");
      }
      uploadSessionId = String(uploadSession.id);

      const displayName = safeDisplayName(
        options.displayName,
        validated.displayName,
      );
      const visibility =
        options.visibility ?? (options.campaignId ? "campaign" : "workspace");
      const metadata = {
        ...normalizeMetadata(options.metadata),
        source_last_modified: options.file.lastModified,
      };

      await markUploadSession(uploadSessionId, "uploading");
      const uploadResult = await adapter.upload(
        {
          uploadSessionId,
          assetId,
          workspaceId: options.workspaceId,
          campaignId: options.campaignId ?? null,
          bucket,
          objectKey,
          file: options.file,
          accessToken: session.access_token,
          originalName: validated.originalName,
          displayName,
          mimeType: validated.mimeType,
          extension: validated.extension,
          sizeBytes: validated.sizeBytes,
          visibility,
          metadata,
          onProgress: options.onProgress,
        },
        signal,
      );
      if (signal.aborted) throw new AssetServiceError("ASSET_ABORTED");
      if (uploadResult?.registeredAsset) {
        return uploadResult.registeredAsset as NexusAsset;
      }

      const { data: asset, error: registrationError } = await assetDatabase
        .rpc("finalize_asset_upload", {
          target_session_id: uploadSessionId,
          target_original_name: validated.originalName,
          target_display_name: displayName,
          target_visibility: visibility,
          target_metadata: metadata,
        })
        .single();

      if (registrationError || !asset) {
        await markUploadSession(
          uploadSessionId,
          "failed",
          "REGISTRATION_FAILED",
        );
        throw toAssetServiceError(registrationError, "ASSET_UPLOAD_FAILED");
      }

      return asset as NexusAsset;
    } catch (error) {
      const normalized = toAssetServiceError(error, "ASSET_UPLOAD_FAILED");
      await markUploadSession(
        uploadSessionId,
        normalized.code === "ASSET_ABORTED" ? "cancelled" : "failed",
        normalized.code,
      );
      throw normalized;
    }
  }

  async list(options: AssetListOptions): Promise<AssetListResult> {
    const page = clampInteger(options.page, 0, 0, 100000);
    const pageSize = clampInteger(
      options.pageSize,
      NEXUS_ASSET_PAGE_SIZE,
      1,
      48,
    );
    const start = page * pageSize;
    const end = start + pageSize - 1;

    let query = assetDatabase
      .from("assets")
      .select("*", { count: "exact" })
      .eq("workspace_id", options.workspaceId)
      .eq("status", "ready")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (!options.includeDeleted) query = query.is("deleted_at", null);
    if (options.campaignId) query = query.eq("campaign_id", options.campaignId);
    if (options.provider) query = query.eq("provider", options.provider);
    if (options.mimePrefix)
      query = query.like("mime_type", `${options.mimePrefix}%`);
    if (options.search?.trim()) {
      const search = escapePostgrestPattern(options.search.trim().slice(0, 80));
      query = query.ilike("display_name", `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");

    const assets = (data ?? []) as NexusAsset[];
    return {
      assets,
      count: count ?? assets.length,
      page,
      pageSize,
      hasMore: start + assets.length < (count ?? assets.length),
    };
  }

  async createTemporaryAccess(asset: NexusAsset, expiresInSeconds = 300) {
    const adapter = this.adapters[asset.provider];
    if (!adapter) throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");
    return adapter.createTemporaryAccess({
      assetId: asset.id,
      bucket: asset.bucket,
      objectKey: asset.object_key,
      expiresInSeconds: clampInteger(expiresInSeconds, 300, 30, 900),
    });
  }

  async rename(assetId: string, displayName: string) {
    const normalized = safeDisplayName(displayName, "Arquivo sem título");
    const { data, error } = await assetDatabase
      .from("assets")
      .update({ display_name: normalized })
      .eq("id", assetId)
      .select("id")
      .maybeSingle();
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");
    if (!data) throw new AssetServiceError("ASSET_NOT_FOUND");
  }

  async softDelete(assetId: string, force = false) {
    const { data, error } = await assetDatabase.rpc("soft_delete_asset", {
      target_asset_id: assetId,
      force_delete: force,
    });
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");
    if (!data) throw new AssetServiceError("ASSET_NOT_FOUND");
  }

  async restore(assetId: string) {
    const { data, error } = await assetDatabase.rpc("restore_asset", {
      target_asset_id: assetId,
    });
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");
    if (!data) throw new AssetServiceError("ASSET_NOT_FOUND");
  }

  async purge(asset: NexusAsset, force = false) {
    await this.softDelete(asset.id, force);
    const adapter = this.adapters[asset.provider];
    if (!adapter) throw new AssetServiceError("ASSET_PROVIDER_UNAVAILABLE");

    try {
      await adapter.remove(asset.bucket, asset.object_key, asset.id);
    } catch (error) {
      await this.restore(asset.id).catch(() => undefined);
      throw toAssetServiceError(error, "ASSET_UNKNOWN");
    }
  }

  async link({
    assetId,
    entityType,
    entityId,
    role = "attachment",
    sortOrder = 0,
  }: {
    assetId: string;
    entityType: string;
    entityId: string;
    role?: string;
    sortOrder?: number;
  }) {
    const { error } = await assetDatabase.from("asset_links").insert({
      asset_id: assetId,
      entity_type: entityType,
      entity_id: entityId,
      role,
      sort_order: sortOrder,
    });
    if (error) throw toAssetServiceError(error, "ASSET_PERMISSION_DENIED");
  }

  async listUsages(assetId: string) {
    const { data, error } = await assetDatabase
      .from("asset_links")
      .select("*")
      .eq("asset_id", assetId)
      .order("sort_order");
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");
    return (data ?? []) as AssetUsageLink[];
  }

  async getUsage(workspaceId: string): Promise<AssetUsageSummary[]> {
    const [
      { data: usage, error: usageError },
      { data: quotas, error: quotaError },
    ] = await Promise.all([
      assetDatabase
        .from("asset_workspace_usage")
        .select("*")
        .eq("workspace_id", workspaceId),
      assetDatabase
        .from("asset_workspace_quotas")
        .select("provider,max_total_bytes,max_file_size_bytes")
        .eq("workspace_id", workspaceId),
    ]);

    if (usageError || quotaError) {
      throw toAssetServiceError(usageError ?? quotaError, "ASSET_UNKNOWN");
    }

    const usageByProvider = new Map(
      (usage ?? []).map((row) => [String(row.provider), row] as const),
    );

    return (quotas ?? []).map((quota) => {
      const provider = String(quota.provider) as AssetProvider;
      const current = usageByProvider.get(provider);
      return {
        provider,
        activeFileCount: Number(current?.active_file_count ?? 0),
        activeBytes: Number(current?.active_bytes ?? 0),
        deletedFileCount: Number(current?.deleted_file_count ?? 0),
        deletedBytes: Number(current?.deleted_bytes ?? 0),
        maxTotalBytes: Number(quota.max_total_bytes),
        maxFileSizeBytes: Number(quota.max_file_size_bytes),
      };
    });
  }

  async findSupabaseOrphans(
    workspaceId: string,
  ): Promise<OrphanedAssetObject[]> {
    const { data: folders, error: folderError } = await supabase.storage
      .from(NEXUS_ASSET_BUCKET)
      .list(workspaceId, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });
    if (folderError)
      throw toAssetServiceError(folderError, "ASSET_PERMISSION_DENIED");

    const objects = (
      await Promise.all(
        (folders ?? []).map(async (folder) => {
          const path = `${workspaceId}/${folder.name}`;
          const { data, error } = await supabase.storage
            .from(NEXUS_ASSET_BUCKET)
            .list(path, {
              limit: 1000,
              sortBy: { column: "name", order: "asc" },
            });
          if (error) throw error;
          return (data ?? [])
            .filter((entry) => entry.id)
            .map((entry) => ({
              bucket: NEXUS_ASSET_BUCKET,
              objectKey: `${path}/${entry.name}`,
              sizeBytes:
                typeof entry.metadata?.size === "number"
                  ? Number(entry.metadata.size)
                  : null,
              createdAt: entry.created_at ?? null,
            }));
        }),
      )
    ).flat();

    if (!objects.length) return [];
    const { data: registered, error } = await assetDatabase
      .from("assets")
      .select("object_key")
      .eq("provider", "supabase")
      .eq("bucket", NEXUS_ASSET_BUCKET)
      .in(
        "object_key",
        objects.map((object) => object.objectKey),
      );
    if (error) throw toAssetServiceError(error, "ASSET_UNKNOWN");

    const known = new Set(
      (registered ?? []).map((row) => String(row.object_key)),
    );
    return objects.filter((object) => !known.has(object.objectKey));
  }
}

export const assetService = new AssetService();

export function resolveAssetReference(
  reference: string | NexusAsset,
): ResolvedAssetReference {
  return typeof reference === "string"
    ? { kind: "legacy", url: reference }
    : { kind: "catalog", asset: reference };
}
