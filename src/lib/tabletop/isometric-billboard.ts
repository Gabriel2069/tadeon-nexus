import type { TabletopEntity } from "./types";

export type TabletopEntityRenderMode = "flat" | "billboard";
export type TabletopBillboardAnchor = "base" | "center";

export interface TabletopBillboardAppearance {
  anchor: TabletopBillboardAnchor;
  scale: number;
  shadow: boolean;
}

export interface TabletopMatrixCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
}

const DEFAULT_ISOMETRIC_MATRIX: TabletopMatrixCoefficients = {
  a: 1,
  b: 0.5,
  c: -1,
  d: 0.5,
};

const DEFAULT_BILLBOARD_TYPES = new Set<TabletopEntity["type"]>([
  "token",
  "creature",
  "npc",
  "character",
  "object",
  "marker",
  "handout_pin",
]);

function entityProperties(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function tabletopEntityRenderMode(
  entity: Pick<TabletopEntity, "type" | "assetUrl" | "properties">,
): TabletopEntityRenderMode {
  const configured = entityProperties(entity.properties).render_mode;
  if (configured === "flat" || configured === "billboard") return configured;
  return entity.assetUrl && DEFAULT_BILLBOARD_TYPES.has(entity.type)
    ? "billboard"
    : "flat";
}

export function tabletopBillboardAppearance(
  entity: Pick<TabletopEntity, "properties">,
): TabletopBillboardAppearance {
  const properties = entityProperties(entity.properties);
  const anchor = properties.billboard_anchor === "center" ? "center" : "base";
  const configuredScale = Number(properties.visual_scale);
  return {
    anchor,
    scale: Number.isFinite(configuredScale)
      ? Math.max(0.5, Math.min(2.5, configuredScale))
      : 1,
    shadow: properties.ground_shadow !== false,
  };
}

export function inverseIsometricEntityMatrix(
  rotationDegrees: number,
  projection: TabletopMatrixCoefficients = DEFAULT_ISOMETRIC_MATRIX,
): TabletopMatrixCoefficients {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  const a = projection.a * cosine + projection.c * sine;
  const b = projection.b * cosine + projection.d * sine;
  const c = -projection.a * sine + projection.c * cosine;
  const d = -projection.b * sine + projection.d * cosine;
  const determinant = a * d - b * c;
  return {
    a: d / determinant,
    b: -b / determinant,
    c: -c / determinant,
    d: a / determinant,
  };
}
