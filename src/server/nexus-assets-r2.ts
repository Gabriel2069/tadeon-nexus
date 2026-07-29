import { AwsClient } from "aws4fetch";
import {
  DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  DEFAULT_SUPABASE_URL,
} from "@/integrations/supabase/public-config";

const API_PREFIX = "/api/nexus-assets";
const MAX_JSON_BODY_LENGTH = 64 * 1024;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,62}$/;
const SAFE_OBJECT_KEY_PATTERN =
  /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/i;

export interface NexusAssetsR2Environment {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  NEXUS_ALLOWED_ORIGINS?: string;
}

type WorkerErrorCode =
  | "ASSET_AUTH_REQUIRED"
  | "ASSET_FILE_TOO_LARGE"
  | "ASSET_NOT_FOUND"
  | "ASSET_PERMISSION_DENIED"
  | "ASSET_PROVIDER_UNAVAILABLE"
  | "ASSET_SESSION_EXPIRED"
  | "ASSET_TYPE_INVALID"
  | "ASSET_UPLOAD_FAILED"
  | "ASSET_UNKNOWN";

class R2ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: WorkerErrorCode,
  ) {
    super(code);
    this.name = "R2ApiError";
  }
}

interface AuthenticatedUser {
  id: string;
}

interface UploadSessionRow {
  id: string;
  expected_asset_id: string;
  user_id: string;
  workspace_id: string;
  campaign_id: string | null;
  expected_provider: "r2";
  expected_bucket: string;
  expected_key: string;
  expected_mime: string;
  expected_extension: string;
  expected_size: number;
  expires_at: string;
  status: "initiated" | "uploading";
}

interface R2AssetRow {
  id: string;
  provider: "r2";
  bucket: string;
  object_key: string;
  mime_type: string;
  extension: string;
  size_bytes: number;
  display_name: string;
  deleted_at: string | null;
}

interface R2Config {
  accountId: string;
  bucket: string;
  client: AwsClient;
}

function jsonHeaders(origin?: string | null) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }
  return headers;
}

function jsonResponse(body: unknown, status = 200, origin?: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders(origin),
  });
}

export function extractBearerToken(request: Request) {
  const value = request.headers.get("Authorization") ?? "";
  const match = value.match(/^Bearer ([A-Za-z0-9._~-]+)$/);
  if (!match || match[1].length > 8192) {
    throw new R2ApiError(401, "ASSET_AUTH_REQUIRED");
  }
  return match[1];
}

function configuredOrigins(environment: NexusAssetsR2Environment) {
  return new Set(
    (environment.NEXUS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function isOriginAllowed(
  origin: string | null,
  requestUrl: string,
  environment: NexusAssetsR2Environment,
) {
  if (!origin) return true;
  if (origin === new URL(requestUrl).origin) return true;
  return configuredOrigins(environment).has(origin);
}

function assertAllowedOrigin(
  request: Request,
  environment: NexusAssetsR2Environment,
) {
  const origin = request.headers.get("Origin");
  if (!isOriginAllowed(origin, request.url, environment)) {
    throw new R2ApiError(403, "ASSET_PERMISSION_DENIED");
  }
  return origin;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function asString(value: unknown, maxLength = 512) {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength
  ) {
    throw new R2ApiError(400, "ASSET_UNKNOWN");
  }
  return value;
}

function asPositiveInteger(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 100 * 1024 * 1024
  ) {
    throw new R2ApiError(400, "ASSET_FILE_TOO_LARGE");
  }
  return value;
}

export function sanitizeAssetName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const basename = value.split(/[/\\]/).pop() ?? "";
  const sanitized = Array.from(basename)
    .filter((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint > 0x1f && codePoint !== 0x7f;
    })
    .join("")
    .trim();
  return (sanitized || fallback).slice(0, 255);
}

export function normalizeMime(value: string) {
  return value.split(";", 1)[0].trim().toLowerCase();
}

async function readJsonObject(request: Request) {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_JSON_BODY_LENGTH) {
    throw new R2ApiError(413, "ASSET_UNKNOWN");
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BODY_LENGTH) {
    throw new R2ApiError(413, "ASSET_UNKNOWN");
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || Array.isArray(value) || typeof value !== "object") {
      throw new Error("not an object");
    }
    return value as Record<string, unknown>;
  } catch {
    throw new R2ApiError(400, "ASSET_UNKNOWN");
  }
}

function supabaseConfiguration(environment: NexusAssetsR2Environment) {
  return {
    url: environment.SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
    publishableKey:
      environment.SUPABASE_PUBLISHABLE_KEY?.trim() ||
      DEFAULT_SUPABASE_PUBLISHABLE_KEY,
  };
}

async function userSupabaseRequest(
  environment: NexusAssetsR2Environment,
  path: string,
  accessToken: string,
  init?: RequestInit,
) {
  const config = supabaseConfiguration(environment);
  return fetch(new URL(path, config.url), {
    ...init,
    headers: {
      Accept: "application/json",
      apikey: config.publishableKey,
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
}

async function serviceSupabaseRequest(
  environment: NexusAssetsR2Environment,
  path: string,
  init?: RequestInit,
) {
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new R2ApiError(503, "ASSET_PROVIDER_UNAVAILABLE");
  }
  const config = supabaseConfiguration(environment);
  return fetch(new URL(path, config.url), {
    ...init,
    headers: {
      Accept: "application/json",
      apikey: secretKey,
      ...init?.headers,
    },
  });
}

async function validateUser(
  environment: NexusAssetsR2Environment,
  accessToken: string,
): Promise<AuthenticatedUser> {
  const response = await userSupabaseRequest(
    environment,
    "/auth/v1/user",
    accessToken,
  );
  if (!response.ok) throw new R2ApiError(401, "ASSET_AUTH_REQUIRED");
  const payload = (await response.json()) as { id?: unknown };
  if (!isUuid(payload.id)) throw new R2ApiError(401, "ASSET_AUTH_REQUIRED");
  return { id: payload.id };
}

async function parseSupabaseRows<T>(
  response: Response,
  fallback: WorkerErrorCode,
): Promise<T[]> {
  if (!response.ok) {
    if (response.status === 401) {
      throw new R2ApiError(401, "ASSET_AUTH_REQUIRED");
    }
    if (response.status === 403) {
      throw new R2ApiError(403, "ASSET_PERMISSION_DENIED");
    }
    throw new R2ApiError(400, fallback);
  }
  const value = (await response.json()) as unknown;
  if (!Array.isArray(value))
    throw new R2ApiError(502, "ASSET_PROVIDER_UNAVAILABLE");
  return value as T[];
}

async function getUploadSession(
  environment: NexusAssetsR2Environment,
  accessToken: string,
  userId: string,
  sessionId: string,
) {
  const query = new URLSearchParams({
    id: `eq.${sessionId}`,
    user_id: `eq.${userId}`,
    expected_provider: "eq.r2",
    status: "in.(initiated,uploading)",
    select:
      "id,expected_asset_id,user_id,workspace_id,campaign_id,expected_provider,expected_bucket,expected_key,expected_mime,expected_extension,expected_size,expires_at,status",
  });
  const response = await userSupabaseRequest(
    environment,
    `/rest/v1/asset_upload_sessions?${query}`,
    accessToken,
  );
  const [session] = await parseSupabaseRows<UploadSessionRow>(
    response,
    "ASSET_SESSION_EXPIRED",
  );
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    throw new R2ApiError(409, "ASSET_SESSION_EXPIRED");
  }
  return session;
}

function getR2Config(environment: NexusAssetsR2Environment): R2Config {
  const accountId = environment.R2_ACCOUNT_ID?.trim();
  const accessKeyId = environment.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = environment.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = environment.R2_BUCKET_NAME?.trim();

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !SAFE_BUCKET_PATTERN.test(bucket)
  ) {
    throw new R2ApiError(503, "ASSET_PROVIDER_UNAVAILABLE");
  }

  return {
    accountId,
    bucket,
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
  };
}

export function encodeR2ObjectPath(objectKey: string) {
  return objectKey.split("/").map(encodeURIComponent).join("/");
}

function r2ObjectUrl(config: R2Config, objectKey: string) {
  return `https://${config.accountId}.r2.cloudflarestorage.com/${encodeURIComponent(
    config.bucket,
  )}/${encodeR2ObjectPath(objectKey)}`;
}

async function presignR2(
  config: R2Config,
  objectKey: string,
  method: "GET" | "PUT",
  expiresInSeconds: number,
  mimeType?: string,
) {
  const url = new URL(r2ObjectUrl(config, objectKey));
  url.searchParams.set("X-Amz-Expires", String(expiresInSeconds));
  const request = new Request(url, {
    method,
    headers: mimeType ? { "Content-Type": mimeType } : undefined,
  });
  const signed = await config.client.sign(request, {
    aws: { signQuery: true },
  });
  return signed.url;
}

async function r2Head(config: R2Config, objectKey: string) {
  return config.client.fetch(r2ObjectUrl(config, objectKey), {
    method: "HEAD",
  });
}

function assertSessionMatches(
  session: UploadSessionRow,
  body: Record<string, unknown>,
  config: R2Config,
) {
  const assetId = asString(body.assetId, 36);
  const bucket = asString(body.bucket, 63);
  const objectKey = asString(body.objectKey);
  const mimeType = normalizeMime(asString(body.mimeType, 160));
  const extension = asString(body.extension, 10).toLowerCase();
  const sizeBytes = asPositiveInteger(body.sizeBytes);

  if (
    !isUuid(assetId) ||
    bucket !== config.bucket ||
    !SAFE_OBJECT_KEY_PATTERN.test(objectKey) ||
    session.expected_asset_id !== assetId ||
    session.expected_bucket !== bucket ||
    session.expected_key !== objectKey ||
    session.expected_mime !== mimeType ||
    session.expected_extension !== extension ||
    Number(session.expected_size) !== sizeBytes
  ) {
    throw new R2ApiError(400, "ASSET_TYPE_INVALID");
  }

  return { assetId, bucket, objectKey, mimeType, extension, sizeBytes };
}

async function handleRequestUpload(
  request: Request,
  environment: NexusAssetsR2Environment,
  accessToken: string,
  user: AuthenticatedUser,
  origin: string | null,
) {
  const body = await readJsonObject(request);
  const sessionId = asString(body.uploadSessionId, 36);
  if (!isUuid(sessionId)) throw new R2ApiError(400, "ASSET_SESSION_EXPIRED");

  const session = await getUploadSession(
    environment,
    accessToken,
    user.id,
    sessionId,
  );
  const config = getR2Config(environment);
  const expected = assertSessionMatches(session, body, config);
  const uploadUrl = await presignR2(
    config,
    expected.objectKey,
    "PUT",
    300,
    expected.mimeType,
  );

  return jsonResponse(
    {
      uploadUrl,
      expiresIn: 300,
      assetId: expected.assetId,
    },
    200,
    origin,
  );
}

async function getAsset(
  environment: NexusAssetsR2Environment,
  accessToken: string,
  assetId: string,
) {
  const query = new URLSearchParams({
    id: `eq.${assetId}`,
    provider: "eq.r2",
    select: "*",
  });
  const response = await userSupabaseRequest(
    environment,
    `/rest/v1/assets?${query}`,
    accessToken,
  );
  const [asset] = await parseSupabaseRows<R2AssetRow>(
    response,
    "ASSET_NOT_FOUND",
  );
  if (!asset) throw new R2ApiError(404, "ASSET_NOT_FOUND");
  return asset;
}

function normalizedMetadata(value: unknown) {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  const serialized = JSON.stringify(value);
  if (serialized.length > 8192) throw new R2ApiError(413, "ASSET_UNKNOWN");
  return value as Record<string, unknown>;
}

async function writeR2Confirmation(
  environment: NexusAssetsR2Environment,
  session: UploadSessionRow,
  expected: ReturnType<typeof assertSessionMatches>,
  etag: string | null,
) {
  const response = await serviceSupabaseRequest(
    environment,
    "/rest/v1/r2_asset_confirmations?on_conflict=session_id",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        session_id: session.id,
        asset_id: expected.assetId,
        user_id: session.user_id,
        workspace_id: session.workspace_id,
        bucket: expected.bucket,
        object_key: expected.objectKey,
        mime_type: expected.mimeType,
        extension: expected.extension,
        size_bytes: expected.sizeBytes,
        etag,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      }),
    },
  );
  if (!response.ok) {
    throw new R2ApiError(502, "ASSET_PROVIDER_UNAVAILABLE");
  }
}

async function clearR2Confirmation(
  environment: NexusAssetsR2Environment,
  sessionId: string,
) {
  const query = new URLSearchParams({ session_id: `eq.${sessionId}` });
  await serviceSupabaseRequest(
    environment,
    `/rest/v1/r2_asset_confirmations?${query}`,
    { method: "DELETE" },
  ).catch(() => undefined);
}

async function handleCompleteUpload(
  request: Request,
  environment: NexusAssetsR2Environment,
  accessToken: string,
  user: AuthenticatedUser,
  origin: string | null,
) {
  const body = await readJsonObject(request);
  const sessionId = asString(body.uploadSessionId, 36);
  if (!isUuid(sessionId)) throw new R2ApiError(400, "ASSET_SESSION_EXPIRED");

  const requestedAssetId = asString(body.assetId, 36);
  if (!isUuid(requestedAssetId)) throw new R2ApiError(400, "ASSET_UNKNOWN");
  const existing = await getAsset(
    environment,
    accessToken,
    requestedAssetId,
  ).catch((error) => {
    if (error instanceof R2ApiError && error.code === "ASSET_NOT_FOUND") {
      return null;
    }
    throw error;
  });
  if (existing) return jsonResponse({ asset: existing }, 200, origin);

  const session = await getUploadSession(
    environment,
    accessToken,
    user.id,
    sessionId,
  );
  const config = getR2Config(environment);
  const expected = assertSessionMatches(session, body, config);
  const head = await r2Head(config, expected.objectKey);
  if (!head.ok) throw new R2ApiError(409, "ASSET_UPLOAD_FAILED");

  const actualSize = Number(head.headers.get("Content-Length") ?? -1);
  const actualMime = normalizeMime(head.headers.get("Content-Type") ?? "");
  if (actualSize !== expected.sizeBytes || actualMime !== expected.mimeType) {
    throw new R2ApiError(409, "ASSET_TYPE_INVALID");
  }

  await writeR2Confirmation(
    environment,
    session,
    expected,
    head.headers.get("ETag"),
  );

  const visibility =
    body.visibility === "private" ||
    body.visibility === "workspace" ||
    body.visibility === "campaign"
      ? body.visibility
      : null;
  if (!visibility || (visibility === "campaign" && !session.campaign_id)) {
    await clearR2Confirmation(environment, session.id);
    throw new R2ApiError(400, "ASSET_PERMISSION_DENIED");
  }

  const metadata = {
    ...normalizedMetadata(body.metadata),
    r2_etag: head.headers.get("ETag"),
    r2_verified_at: new Date().toISOString(),
  };
  const response = await userSupabaseRequest(
    environment,
    "/rest/v1/assets?select=*",
    accessToken,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: expected.assetId,
        workspace_id: session.workspace_id,
        campaign_id: session.campaign_id,
        provider: "r2",
        bucket: expected.bucket,
        object_key: expected.objectKey,
        original_name: sanitizeAssetName(
          body.originalName,
          `arquivo.${expected.extension}`,
        ),
        display_name: sanitizeAssetName(body.displayName, "Arquivo sem título"),
        mime_type: expected.mimeType,
        extension: expected.extension,
        size_bytes: expected.sizeBytes,
        visibility,
        created_by: user.id,
        metadata,
      }),
    },
  );

  try {
    const [asset] = await parseSupabaseRows<R2AssetRow>(
      response,
      "ASSET_UPLOAD_FAILED",
    );
    if (!asset) throw new R2ApiError(502, "ASSET_UPLOAD_FAILED");
    return jsonResponse({ asset }, 200, origin);
  } catch (error) {
    await clearR2Confirmation(environment, session.id);
    throw error;
  }
}

async function handleAccess(
  request: Request,
  environment: NexusAssetsR2Environment,
  accessToken: string,
  assetId: string,
  origin: string | null,
) {
  const asset = await getAsset(environment, accessToken, assetId);
  if (asset.deleted_at) throw new R2ApiError(404, "ASSET_NOT_FOUND");
  const config = getR2Config(environment);
  if (asset.bucket !== config.bucket) {
    throw new R2ApiError(503, "ASSET_PROVIDER_UNAVAILABLE");
  }
  const requestedExpiry = Number(
    new URL(request.url).searchParams.get("expires") ?? 300,
  );
  const expiresIn = Number.isFinite(requestedExpiry)
    ? Math.min(900, Math.max(30, Math.trunc(requestedExpiry)))
    : 300;
  const url = await presignR2(config, asset.object_key, "GET", expiresIn);
  return jsonResponse({ url, expiresIn }, 200, origin);
}

async function handleHead(
  environment: NexusAssetsR2Environment,
  accessToken: string,
  assetId: string,
  origin: string | null,
) {
  const asset = await getAsset(environment, accessToken, assetId);
  if (asset.deleted_at) throw new R2ApiError(404, "ASSET_NOT_FOUND");
  const config = getR2Config(environment);
  if (asset.bucket !== config.bucket) {
    throw new R2ApiError(503, "ASSET_PROVIDER_UNAVAILABLE");
  }
  const response = await r2Head(config, asset.object_key);
  if (!response.ok) throw new R2ApiError(404, "ASSET_NOT_FOUND");
  const headers = jsonHeaders(origin);
  headers.set(
    "Content-Length",
    response.headers.get("Content-Length") ?? String(asset.size_bytes),
  );
  headers.set("Content-Type", asset.mime_type);
  return new Response(null, { status: 200, headers });
}

async function handleDelete(
  environment: NexusAssetsR2Environment,
  accessToken: string,
  assetId: string,
  origin: string | null,
) {
  const asset = await getAsset(environment, accessToken, assetId);
  if (!asset.deleted_at) {
    throw new R2ApiError(409, "ASSET_PERMISSION_DENIED");
  }
  const config = getR2Config(environment);
  if (asset.bucket !== config.bucket) {
    throw new R2ApiError(503, "ASSET_PROVIDER_UNAVAILABLE");
  }
  const response = await config.client.fetch(
    r2ObjectUrl(config, asset.object_key),
    { method: "DELETE" },
  );
  if (!response.ok && response.status !== 404) {
    throw new R2ApiError(502, "ASSET_UPLOAD_FAILED");
  }
  return jsonResponse({ removed: true }, 200, origin);
}

export async function handleNexusAssetsR2Request(
  request: Request,
  environment: NexusAssetsR2Environment,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${API_PREFIX}/`)) return null;

  let origin: string | null = null;
  try {
    origin = assertAllowedOrigin(request, environment);
    if (request.method === "OPTIONS") {
      const headers = jsonHeaders(origin);
      headers.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type",
      );
      headers.set(
        "Access-Control-Allow-Methods",
        "GET, HEAD, POST, DELETE, OPTIONS",
      );
      headers.set("Access-Control-Max-Age", "600");
      return new Response(null, { status: 204, headers });
    }

    const accessToken = extractBearerToken(request);
    const user = await validateUser(environment, accessToken);

    if (
      request.method === "POST" &&
      url.pathname === `${API_PREFIX}/request-upload`
    ) {
      return await handleRequestUpload(
        request,
        environment,
        accessToken,
        user,
        origin,
      );
    }
    if (
      request.method === "POST" &&
      url.pathname === `${API_PREFIX}/complete-upload`
    ) {
      return await handleCompleteUpload(
        request,
        environment,
        accessToken,
        user,
        origin,
      );
    }

    const accessMatch = url.pathname.match(
      new RegExp(`^${API_PREFIX}/([0-9a-f-]{36})/access$`, "i"),
    );
    if (request.method === "GET" && accessMatch && isUuid(accessMatch[1])) {
      return await handleAccess(
        request,
        environment,
        accessToken,
        accessMatch[1],
        origin,
      );
    }

    const assetMatch = url.pathname.match(
      new RegExp(`^${API_PREFIX}/([0-9a-f-]{36})$`, "i"),
    );
    if (assetMatch && isUuid(assetMatch[1])) {
      if (request.method === "HEAD") {
        return await handleHead(
          environment,
          accessToken,
          assetMatch[1],
          origin,
        );
      }
      if (request.method === "DELETE") {
        return await handleDelete(
          environment,
          accessToken,
          assetMatch[1],
          origin,
        );
      }
    }

    throw new R2ApiError(404, "ASSET_NOT_FOUND");
  } catch (error) {
    if (error instanceof R2ApiError) {
      return jsonResponse({ code: error.code }, error.status, origin);
    }
    console.error(
      "[Nexus Assets R2] request failed without exposing internal details.",
    );
    return jsonResponse({ code: "ASSET_UNKNOWN" }, 500, origin);
  }
}
