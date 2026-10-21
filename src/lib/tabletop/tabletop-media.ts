import type { TabletopEntity } from "./types";

// Native normalization caps model height at 1 / this proportion of its footprint.
export const TABLETOP_MODEL_HEIGHT_FOOTPRINT = 0.45;

export function tabletopModelEnvelope(entity: TabletopEntity) {
  const properties =
    entity.properties && typeof entity.properties === "object"
      ? (entity.properties as Record<string, unknown>)
      : {};
  if (tabletopMediaKind(properties.mime_type, entity.assetUrl) !== "model") return null;
  const target = Math.max(8, Math.sqrt(Math.max(8, entity.width) * Math.max(8, entity.height)));
  const size = target * Math.max(0.05, Math.min(20, modelNumber(properties.model_scale, 1)));
  return {
    radius: size / Math.SQRT2,
    height: size / TABLETOP_MODEL_HEIGHT_FOOTPRINT,
    base: modelNumber(entity.elevation, 0) + modelNumber(properties.model_elevation_offset, 0),
  };
}

export type TabletopMediaKind = "image" | "gif" | "video" | "audio" | "model" | "unsupported";

export interface TabletopPlaybackState {
  paused: boolean;
  loop: boolean;
  muted: boolean;
  speed: number;
}

function modelNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
const modelSpeed = (value: unknown) => Math.max(0.05, Math.min(4, modelNumber(value, 1)));

export function tabletopModelAnimationTime(properties: Record<string, unknown>, seconds: number) {
  if (properties.model_animation_paused === true)
    return Math.max(0, modelNumber(properties.model_animation_time, 0));
  return Math.max(
    0,
    seconds * modelSpeed(properties.model_animation_speed) +
      modelNumber(properties.model_animation_offset, 0),
  );
}

export function tabletopModelPausePatch(
  properties: Record<string, unknown>,
  paused: boolean,
  seconds: number,
) {
  const time = tabletopModelAnimationTime(properties, seconds);
  return paused
    ? { model_animation_paused: true, model_animation_time: time }
    : {
        model_animation_paused: false,
        model_animation_offset: time - seconds * modelSpeed(properties.model_animation_speed),
      };
}

export function tabletopModelSpeedPatch(
  properties: Record<string, unknown>,
  speed: number,
  seconds: number,
) {
  const next = modelSpeed(speed);
  return {
    model_animation_speed: next,
    model_animation_offset: tabletopModelAnimationTime(properties, seconds) - seconds * next,
  };
}

export function tabletopMediaKind(mimeType: unknown, url = "") {
  const mime = typeof mimeType === "string" ? mimeType.toLowerCase() : "";
  if (mime === "image/gif") return "gif" satisfies TabletopMediaKind;
  if (mime.startsWith("video/")) return "video" satisfies TabletopMediaKind;
  if (mime.startsWith("audio/")) return "audio" satisfies TabletopMediaKind;
  if (mime.startsWith("model/") || mime.includes("gltf"))
    return "model" satisfies TabletopMediaKind;
  if (mime.startsWith("image/")) return "image" satisfies TabletopMediaKind;

  let pathname = url.toLowerCase().split(/[?#]/, 1)[0] ?? "";
  try {
    pathname = new URL(url, "https://tabletop.invalid").pathname.toLowerCase();
  } catch {
    // The safe string fallback above still handles relative signed paths.
  }
  if (pathname.endsWith(".gif")) return "gif" satisfies TabletopMediaKind;
  if (pathname.endsWith(".webm") || pathname.endsWith(".mp4"))
    return "video" satisfies TabletopMediaKind;
  if (/\.(mp3|ogg|oga|wav|m4a|aac|flac)$/.test(pathname))
    return "audio" satisfies TabletopMediaKind;
  if (/\.(glb|gltf)$/.test(pathname)) return "model" satisfies TabletopMediaKind;
  if (/\.(png|jpe?g|webp|avif)$/.test(pathname)) return "image" satisfies TabletopMediaKind;
  return "unsupported" satisfies TabletopMediaKind;
}

export function isTabletopEntityMediaMime(mimeType: string) {
  return tabletopMediaKind(mimeType) !== "unsupported";
}

export function isTabletopVisualMediaMime(mimeType: string) {
  const kind = tabletopMediaKind(mimeType);
  return kind === "image" || kind === "gif" || kind === "video";
}

export function isTabletopAudioMime(mimeType: string, url = "") {
  return tabletopMediaKind(mimeType, url) === "audio";
}

export function isTabletopModelMime(mimeType: string, url = "") {
  return tabletopMediaKind(mimeType, url) === "model";
}

export function isTabletopBackgroundMime(mimeType: string) {
  return tabletopMediaKind(mimeType) === "image";
}

export function normalizeTabletopPlayback(
  properties: Record<string, unknown>,
): TabletopPlaybackState {
  const parsedSpeed = Number(properties.playback_speed);
  return {
    paused: properties.playback_paused === true,
    loop: properties.playback_loop !== false,
    muted: properties.playback_muted !== false,
    speed: Math.max(0.1, Math.min(4, Number.isFinite(parsedSpeed) ? parsedSpeed : 1)),
  };
}
