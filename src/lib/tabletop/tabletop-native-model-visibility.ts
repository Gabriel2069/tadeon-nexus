import type { TabletopBrowserRuntime } from "./tabletop-player-runtime";
import { buildTabletopVisibilityFrame, cachedTabletopVisibilityMask } from "./tabletop-visibility-compositor";
import type { TabletopFogStroke, TabletopLight, TabletopVisibilityState } from "./tabletop-visibility-service";

interface LocalPoint {
  x: number;
  y: number;
}

function finite(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function localPoint(runtime: TabletopBrowserRuntime, point: LocalPoint): LocalPoint {
  const client = runtime.worldToClient(point);
  const bounds = runtime.host.getBoundingClientRect();
  return { x: client.x - bounds.left, y: client.y - bounds.top };
}

function screenRadius(runtime: TabletopBrowserRuntime, origin: LocalPoint, radius: number) {
  const center = localPoint(runtime, origin);
  const edge = localPoint(runtime, { x: origin.x + radius, y: origin.y });
  return Math.max(0.5, Math.hypot(edge.x - center.x, edge.y - center.y));
}

function points(pointsValue: LocalPoint[]) {
  return pointsValue.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function fogShape(runtime: TabletopBrowserRuntime, stroke: TabletopFogStroke, fill: string) {
  const source = stroke.points;
  if (source.length === 0) return "";
  if (stroke.shape === "brush") {
    return source.map((point) => {
      const center = localPoint(runtime, point);
      const radius = screenRadius(runtime, point, stroke.radius);
      return `<circle cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="${fill}"/>`;
    }).join("");
  }
  if (stroke.shape === "polygon") {
    if (source.length < 3) return "";
    return `<polygon points="${points(source.map((point) => localPoint(runtime, point)))}" fill="${fill}"/>`;
  }
  const first = localPoint(runtime, source[0]);
  const last = localPoint(runtime, source.at(-1) ?? source[0]);
  const left = Math.min(first.x, last.x);
  const top = Math.min(first.y, last.y);
  const width = Math.max(1, Math.abs(last.x - first.x));
  const height = Math.max(1, Math.abs(last.y - first.y));
  if (stroke.shape === "ellipse") {
    return `<ellipse cx="${(left + width / 2).toFixed(2)}" cy="${(top + height / 2).toFixed(2)}" rx="${(width / 2).toFixed(2)}" ry="${(height / 2).toFixed(2)}" fill="${fill}"/>`;
  }
  return `<rect x="${left.toFixed(2)}" y="${top.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" fill="${fill}"/>`;
}

function lightShape(runtime: TabletopBrowserRuntime, light: TabletopLight) {
  if (!light.enabled || light.intensity <= 0) return "";
  if (light.visibilityPolygon && light.visibilityPolygon.length >= 3) {
    return `<polygon points="${points(light.visibilityPolygon.map((point) => localPoint(runtime, point)))}" fill="white"/>`;
  }
  // A shadow-casting light without an authoritative polygon must never broaden
  // player vision. Fail closed instead of approximating through secret walls.
  if (light.castsShadows) return "";

  const center = localPoint(runtime, light);
  const radius = screenRadius(runtime, light, light.radius);
  const shape = light.properties?.shape ?? "radial";
  if (shape === "radial") {
    return `<circle cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="white"/>`;
  }

  const direction = (finite(light.properties?.direction) * Math.PI) / 180;
  const angle = clamp(finite(light.properties?.angle, 90), 1, 359);
  if (shape === "cone") {
    const half = (angle * Math.PI) / 360;
    const steps = Math.max(8, Math.ceil(angle / 12));
    const worldPoints: LocalPoint[] = [{ x: light.x, y: light.y }];
    for (let index = 0; index <= steps; index += 1) {
      const ray = direction - half + (index / steps) * half * 2;
      worldPoints.push({
        x: light.x + Math.cos(ray) * light.radius,
        y: light.y + Math.sin(ray) * light.radius,
      });
    }
    return `<polygon points="${points(worldPoints.map((point) => localPoint(runtime, point)))}" fill="white"/>`;
  }

  const normal = direction + Math.PI / 2;
  const halfWidth = shape === "line" ? Math.max(6, light.radius * 0.08) : light.radius * 0.42;
  const depth = light.radius;
  const worldPoints = [
    { x: light.x + Math.cos(normal) * halfWidth, y: light.y + Math.sin(normal) * halfWidth },
    { x: light.x + Math.cos(direction) * depth + Math.cos(normal) * halfWidth, y: light.y + Math.sin(direction) * depth + Math.sin(normal) * halfWidth },
    { x: light.x + Math.cos(direction) * depth - Math.cos(normal) * halfWidth, y: light.y + Math.sin(direction) * depth - Math.sin(normal) * halfWidth },
    { x: light.x - Math.cos(normal) * halfWidth, y: light.y - Math.sin(normal) * halfWidth },
  ];
  return `<polygon points="${points(worldPoints.map((point) => localPoint(runtime, point)))}" fill="white"/>`;
}

export function tabletopNativeVisibilityNeedsMask(state: TabletopVisibilityState | undefined) {
  if (!state) return false;
  return state.fogEnabled || state.globalIllumination < 0.999;
}

function cameraFingerprint(runtime: TabletopBrowserRuntime) {
  const bounds = runtime.host.getBoundingClientRect();
  const origin = localPoint(runtime, { x: 0, y: 0 });
  const xAxis = localPoint(runtime, { x: 1, y: 0 });
  const yAxis = localPoint(runtime, { x: 0, y: 1 });
  return [
    bounds.width.toFixed(1),
    bounds.height.toFixed(1),
    origin.x.toFixed(2),
    origin.y.toFixed(2),
    xAxis.x.toFixed(2),
    xAxis.y.toFixed(2),
    yAxis.x.toFixed(2),
    yAxis.y.toFixed(2),
  ].join(":");
}

export function tabletopNativeVisibilityFingerprint(runtime: TabletopBrowserRuntime, state: TabletopVisibilityState | undefined) {
  if (!state) return "none";
  return `${buildTabletopVisibilityFrame(state).fingerprint}::${cameraFingerprint(runtime)}`;
}

export function buildTabletopNativeVisibilityMask(runtime: TabletopBrowserRuntime, state: TabletopVisibilityState) {
  const frame = buildTabletopVisibilityFrame(state);
  const key = `${frame.fingerprint}::${cameraFingerprint(runtime)}`;
  return cachedTabletopVisibilityMask(key, () => {
    const bounds = runtime.host.getBoundingClientRect();
    const width = Math.max(1, Math.round(bounds.width));
    const height = Math.max(1, Math.round(bounds.height));
    const lights = frame.lights.map((light) => lightShape(runtime, light)).join("");
    // frame.fog is state.fogStrokes ordered once by the shared compositor.
    const fogBase = !state.fogEnabled || !frame.fogCoveredBase ? "white" : "black";
    const fogShapes = state.fogEnabled
      ? frame.fog.map((stroke) => fogShape(runtime, stroke, stroke.operation === "reveal" ? "white" : "black")).join("")
      : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="dark" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white" fill-opacity="${frame.illumination.toFixed(3)}"/>${lights}</mask><mask id="fog" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${fogBase}"/>${fogShapes}</mask></defs><g mask="url(#fog)"><rect width="${width}" height="${height}" fill="white" mask="url(#dark)"/></g></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  });
}

export function applyTabletopNativeVisibilityMask(
  canvas: HTMLCanvasElement,
  runtime: TabletopBrowserRuntime,
  state: TabletopVisibilityState | undefined,
) {
  if (!tabletopNativeVisibilityNeedsMask(state) || !state) {
    canvas.style.maskImage = "none";
    canvas.style.setProperty("-webkit-mask-image", "none");
    return;
  }
  const mask = buildTabletopNativeVisibilityMask(runtime, state);
  canvas.style.maskImage = mask;
  canvas.style.maskRepeat = "no-repeat";
  canvas.style.maskSize = "100% 100%";
  canvas.style.setProperty("-webkit-mask-image", mask);
  canvas.style.setProperty("-webkit-mask-repeat", "no-repeat");
  canvas.style.setProperty("-webkit-mask-size", "100% 100%");
}
