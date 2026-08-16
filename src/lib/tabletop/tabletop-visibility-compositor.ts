import type { TabletopFogStroke, TabletopLight, TabletopVisibilityState } from "./tabletop-visibility-service";

export interface TabletopVisibilityFrame {
  illumination: number;
  lights: TabletopLight[];
  fog: TabletopFogStroke[];
  fogCoveredBase: boolean;
  fingerprint: string;
}

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function rounded(value: unknown, precision = 2) {
  return finite(value).toFixed(precision);
}

function pointFingerprint(points: Array<{ x: number; y: number }> | undefined) {
  if (!points?.length) return "-";
  // Visibility polygons can contain hundreds of points. Sampling the ends and
  // every fourth vertex is enough to invalidate the compositor cache while
  // keeping fingerprint generation dramatically cheaper than rebuilding SVG.
  const sampled = points.filter((_, index) => index === 0 || index === points.length - 1 || index % 4 === 0);
  return sampled.map((point) => `${rounded(point.x, 1)},${rounded(point.y, 1)}`).join(";");
}

function lightFingerprint(light: TabletopLight) {
  return [
    light.id,
    light.enabled ? 1 : 0,
    rounded(light.x, 1),
    rounded(light.y, 1),
    rounded(light.radius, 1),
    rounded(light.intensity, 2),
    light.castsShadows ? 1 : 0,
    light.properties?.shape ?? "radial",
    rounded(light.properties?.direction, 1),
    rounded(light.properties?.angle, 1),
    pointFingerprint(light.visibilityPolygon),
  ].join("/");
}

function fogFingerprint(stroke: TabletopFogStroke) {
  return [
    stroke.id,
    stroke.sequenceIndex,
    stroke.operation,
    stroke.shape,
    rounded(stroke.radius, 1),
    pointFingerprint(stroke.points),
  ].join("/");
}

export function buildTabletopVisibilityFrame(state: TabletopVisibilityState): TabletopVisibilityFrame {
  const fog = [...state.fogStrokes].sort((left, right) => left.sequenceIndex - right.sequenceIndex);
  const lights = state.lights.filter((light) => light.enabled && light.intensity > 0);
  const illumination = Math.max(0, Math.min(1, state.globalIllumination));
  const fogCoveredBase = fog.length === 0 || fog[0]?.operation === "reveal";
  const fingerprint = [
    state.version,
    state.fogEnabled ? 1 : 0,
    illumination.toFixed(3),
    lights.map(lightFingerprint).join("|"),
    fog.map(fogFingerprint).join("|"),
  ].join("::");
  return { illumination, lights, fog, fogCoveredBase, fingerprint };
}

const maskCache = new Map<string, string>();
const MAX_MASK_CACHE = 18;

export function cachedTabletopVisibilityMask(key: string, build: () => string) {
  const cached = maskCache.get(key);
  if (cached) {
    maskCache.delete(key);
    maskCache.set(key, cached);
    return cached;
  }
  const value = build();
  maskCache.set(key, value);
  while (maskCache.size > MAX_MASK_CACHE) {
    const oldest = maskCache.keys().next().value as string | undefined;
    if (!oldest) break;
    maskCache.delete(oldest);
  }
  return value;
}

export function clearTabletopVisibilityMaskCache() {
  maskCache.clear();
}
