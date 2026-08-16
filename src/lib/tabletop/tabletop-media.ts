export type TabletopMediaKind =
  | "image"
  | "gif"
  | "video"
  | "audio"
  | "model"
  | "unsupported";

export interface TabletopPlaybackState {
  paused: boolean;
  loop: boolean;
  muted: boolean;
  speed: number;
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
  if (/\.(png|jpe?g|webp|avif)$/.test(pathname))
    return "image" satisfies TabletopMediaKind;
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
    speed: Math.max(
      0.1,
      Math.min(4, Number.isFinite(parsedSpeed) ? parsedSpeed : 1),
    ),
  };
}
