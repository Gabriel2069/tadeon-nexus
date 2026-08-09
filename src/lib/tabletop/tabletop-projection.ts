import type { Point } from "./types";

export type TabletopProjectionMode = "plan" | "isometric";

export interface TabletopViewOrientation {
  yaw: number;
  tilt: number;
  elevationScale: number;
}

export interface TabletopViewState extends TabletopViewOrientation {
  projection: TabletopProjectionMode;
  x: number;
  y: number;
  zoom: number;
  levelId: string | null;
}

export interface TabletopProjectionMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
}

export const DEFAULT_TABLETOP_VIEW_ORIENTATION: TabletopViewOrientation = {
  yaw: 45,
  tilt: 0.5,
  elevationScale: 1,
};

export function normalizeTabletopViewOrientation(
  value: Partial<TabletopViewOrientation>,
): TabletopViewOrientation {
  const finite = (candidate: number | undefined, fallback: number) =>
    Number.isFinite(candidate) ? Number(candidate) : fallback;
  const yaw = finite(value.yaw, DEFAULT_TABLETOP_VIEW_ORIENTATION.yaw);
  return {
    yaw: ((yaw % 360) + 360) % 360,
    tilt: Math.max(
      0.18,
      Math.min(0.9, finite(value.tilt, DEFAULT_TABLETOP_VIEW_ORIENTATION.tilt)),
    ),
    elevationScale: Math.max(
      0.25,
      Math.min(
        2.5,
        finite(
          value.elevationScale,
          DEFAULT_TABLETOP_VIEW_ORIENTATION.elevationScale,
        ),
      ),
    ),
  };
}

export function normalizeTabletopViewState(
  value: Partial<TabletopViewState>,
): TabletopViewState {
  const orientation = normalizeTabletopViewOrientation(value);
  const coordinate = (candidate: unknown) => {
    const number = Number(candidate);
    return Math.max(
      -1_000_000,
      Math.min(1_000_000, Number.isFinite(number) ? number : 0),
    );
  };
  const zoom = Number(value.zoom);
  return {
    projection: value.projection === "isometric" ? "isometric" : "plan",
    x: coordinate(value.x),
    y: coordinate(value.y),
    zoom: Math.max(0.15, Math.min(4, Number.isFinite(zoom) ? zoom : 1)),
    levelId:
      typeof value.levelId === "string" && value.levelId.length > 0
        ? value.levelId
        : null,
    ...orientation,
  };
}

export function tabletopProjectionMatrix(
  mode: TabletopProjectionMode,
  orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
): TabletopProjectionMatrix {
  if (mode === "plan") return { a: 1, b: 0, c: 0, d: 1 };
  const normalized = normalizeTabletopViewOrientation(orientation);
  const angle = (normalized.yaw * Math.PI) / 180;
  const normalization = Math.SQRT1_2;
  return {
    a: Math.cos(angle) / normalization,
    b: (Math.sin(angle) * normalized.tilt) / normalization,
    c: -Math.sin(angle) / normalization,
    d: (Math.cos(angle) * normalized.tilt) / normalization,
  };
}

export function projectTabletopPoint(
  point: Point,
  mode: TabletopProjectionMode,
  orientation?: TabletopViewOrientation,
): Point {
  const matrix = tabletopProjectionMatrix(mode, orientation);
  return {
    x: matrix.a * point.x + matrix.c * point.y,
    y: matrix.b * point.x + matrix.d * point.y,
  };
}

export function unprojectTabletopPoint(
  point: Point,
  mode: TabletopProjectionMode,
  orientation?: TabletopViewOrientation,
): Point {
  const matrix = tabletopProjectionMatrix(mode, orientation);
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 1e-9) return { x: 0, y: 0 };
  return {
    x: (matrix.d * point.x - matrix.c * point.y) / determinant,
    y: (-matrix.b * point.x + matrix.a * point.y) / determinant,
  };
}

export function tabletopElevationOffset(
  elevation: number,
  orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
): Point {
  const normalized = normalizeTabletopViewOrientation(orientation);
  return unprojectTabletopPoint(
    { x: 0, y: -elevation * normalized.elevationScale },
    "isometric",
    normalized,
  );
}

export function elevateTabletopPoint(
  point: Point,
  elevation: number,
  orientation: TabletopViewOrientation = DEFAULT_TABLETOP_VIEW_ORIENTATION,
): Point {
  const offset = tabletopElevationOffset(elevation, orientation);
  return { x: point.x + offset.x, y: point.y + offset.y };
}
