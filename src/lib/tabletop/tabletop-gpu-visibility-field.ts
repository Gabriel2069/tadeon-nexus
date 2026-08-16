import type { TabletopScene } from "./types";
import type {
  TabletopFogStroke,
  TabletopLight,
  TabletopVisibilityState,
} from "./tabletop-visibility-service";
import { buildTabletopVisibilityFrame } from "./tabletop-visibility-compositor";

export interface TabletopGpuVisibilityField {
  width: number;
  height: number;
  sceneWidth: number;
  sceneHeight: number;
  values: Uint8Array<ArrayBuffer>;
  fingerprint: string;
  resolution: number;
}

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function pointInPolygon(x: number, y: number, points: Array<{ x: number; y: number }>) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const left = points[i];
    const right = points[j];
    const intersect =
      left.y > y !== right.y > y &&
      x < ((right.x - left.x) * (y - left.y)) / Math.max(1e-7, right.y - left.y) + left.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function lightContains(light: TabletopLight, x: number, y: number) {
  if (light.visibilityPolygon && light.visibilityPolygon.length >= 3)
    return pointInPolygon(x, y, light.visibilityPolygon);
  if (light.castsShadows) return false;
  const dx = x - light.x;
  const dy = y - light.y;
  const radius = Math.max(1, light.radius);
  const distance = Math.hypot(dx, dy);
  const shape = light.properties?.shape ?? "radial";
  if (shape === "radial") return distance <= radius;
  const direction = ((Number(light.properties?.direction) || 0) * Math.PI) / 180;
  const forward = dx * Math.cos(direction) + dy * Math.sin(direction);
  const side = -dx * Math.sin(direction) + dy * Math.cos(direction);
  if (shape === "line") return forward >= 0 && forward <= radius && Math.abs(side) <= Math.max(6, radius * 0.08);
  if (shape === "rectangle") return forward >= 0 && forward <= radius && Math.abs(side) <= radius * 0.42;
  const angle = Math.max(1, Math.min(359, Number(light.properties?.angle) || 90));
  const theta = Math.atan2(dy, dx);
  let delta = theta - direction;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return distance <= radius && Math.abs(delta) <= (angle * Math.PI) / 360;
}

function fogBounds(stroke: TabletopFogStroke) {
  const first = stroke.points[0] ?? { x: 0, y: 0 };
  const last = stroke.points.at(-1) ?? first;
  return {
    x1: Math.min(first.x, last.x),
    y1: Math.min(first.y, last.y),
    x2: Math.max(first.x, last.x),
    y2: Math.max(first.y, last.y),
  };
}

function fogContains(stroke: TabletopFogStroke, x: number, y: number) {
  if (!stroke.points.length) return false;
  if (stroke.shape === "brush")
    return stroke.points.some((point) => Math.hypot(x - point.x, y - point.y) <= stroke.radius);
  if (stroke.shape === "polygon") return stroke.points.length >= 3 && pointInPolygon(x, y, stroke.points);
  const bounds = fogBounds(stroke);
  if (stroke.shape === "rectangle")
    return x >= bounds.x1 && x <= bounds.x2 && y >= bounds.y1 && y <= bounds.y2;
  const cx = (bounds.x1 + bounds.x2) / 2;
  const cy = (bounds.y1 + bounds.y2) / 2;
  const rx = Math.max(0.5, (bounds.x2 - bounds.x1) / 2);
  const ry = Math.max(0.5, (bounds.y2 - bounds.y1) / 2);
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}

function lightContribution(light: TabletopLight, x: number, y: number) {
  if (!lightContains(light, x, y)) return 0;
  const distance = Math.hypot(x - light.x, y - light.y);
  const normalized = clamp(distance / Math.max(1, light.radius));
  const falloff = Math.max(0.1, Number(light.properties?.falloff) || 1.4);
  return clamp(light.intensity * (1 - normalized ** falloff));
}

const fieldCache = new Map<string, TabletopGpuVisibilityField>();
const MAX_FIELD_CACHE = 10;

function cacheField(field: TabletopGpuVisibilityField) {
  fieldCache.delete(field.fingerprint);
  fieldCache.set(field.fingerprint, field);
  while (fieldCache.size > MAX_FIELD_CACHE) {
    const key = fieldCache.keys().next().value as string | undefined;
    if (!key) break;
    fieldCache.delete(key);
  }
  return field;
}

export function buildTabletopGpuVisibilityField(
  scene: TabletopScene,
  state: TabletopVisibilityState,
  options: { maxEdge?: number; levelId?: string | null } = {},
): TabletopGpuVisibilityField {
  const frame = buildTabletopVisibilityFrame(state);
  const maxEdge = Math.max(96, Math.min(1024, options.maxEdge ?? 384));
  const scale = Math.min(1, maxEdge / Math.max(scene.width, scene.height));
  const width = Math.max(32, Math.ceil(scene.width * scale));
  const height = Math.max(32, Math.ceil(scene.height * scale));
  const levelId = options.levelId ?? null;
  const lights = frame.lights.filter((light) => !levelId || !light.levelId || light.levelId === levelId);
  const fog = frame.fog.filter((stroke) => !levelId || !stroke.levelId || stroke.levelId === levelId);
  const fingerprint = [
    "gpu-field-v1",
    scene.id,
    scene.width,
    scene.height,
    width,
    height,
    levelId ?? "all",
    frame.fingerprint,
  ].join("::");
  const cached = fieldCache.get(fingerprint);
  if (cached) {
    fieldCache.delete(fingerprint);
    fieldCache.set(fingerprint, cached);
    return cached;
  }

  const values = new Uint8Array(new ArrayBuffer(width * height));
  const fogMask = new Uint8Array(new ArrayBuffer(width * height));
  const baseFog = !state.fogEnabled || !frame.fogCoveredBase ? 255 : 0;
  fogMask.fill(baseFog);
  const cellWidth = scene.width / width;
  const cellHeight = scene.height / height;

  for (let yIndex = 0; yIndex < height; yIndex += 1) {
    const y = (yIndex + 0.5) * cellHeight;
    for (let xIndex = 0; xIndex < width; xIndex += 1) {
      const x = (xIndex + 0.5) * cellWidth;
      let lighting = frame.illumination;
      for (const light of lights) lighting = Math.max(lighting, lightContribution(light, x, y));
      values[yIndex * width + xIndex] = Math.round(clamp(lighting) * 255);
    }
  }

  if (state.fogEnabled) {
    for (const stroke of fog) {
      const next = stroke.operation === "reveal" ? 255 : 0;
      for (let yIndex = 0; yIndex < height; yIndex += 1) {
        const y = (yIndex + 0.5) * cellHeight;
        for (let xIndex = 0; xIndex < width; xIndex += 1) {
          const x = (xIndex + 0.5) * cellWidth;
          if (fogContains(stroke, x, y)) fogMask[yIndex * width + xIndex] = next;
        }
      }
    }
  }

  for (let index = 0; index < values.length; index += 1)
    values[index] = Math.round((values[index] * fogMask[index]) / 255);

  return cacheField({
    width,
    height,
    sceneWidth: scene.width,
    sceneHeight: scene.height,
    values,
    fingerprint,
    resolution: scale,
  });
}

export function sampleTabletopGpuVisibilityField(
  field: TabletopGpuVisibilityField,
  x: number,
  y: number,
) {
  const ix = Math.max(0, Math.min(field.width - 1, Math.floor((x / Math.max(1, field.sceneWidth)) * field.width)));
  const iy = Math.max(0, Math.min(field.height - 1, Math.floor((y / Math.max(1, field.sceneHeight)) * field.height)));
  return field.values[iy * field.width + ix] / 255;
}

export function uploadTabletopGpuVisibilityField(
  gl: WebGL2RenderingContext,
  field: TabletopGpuVisibilityField,
  target?: WebGLTexture | null,
) {
  const texture = target ?? gl.createTexture();
  if (!texture) throw new Error("TABLETOP_VISIBILITY_TEXTURE_CREATE_FAILED");
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R8,
    field.width,
    field.height,
    0,
    gl.RED,
    gl.UNSIGNED_BYTE,
    field.values,
  );
  return texture;
}

export function clearTabletopGpuVisibilityFieldCache() {
  fieldCache.clear();
}
