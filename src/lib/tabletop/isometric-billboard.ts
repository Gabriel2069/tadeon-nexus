import type { TabletopEntity } from "./types";

export type TabletopEntityRenderMode = "flat" | "billboard";

export interface TabletopMatrixCoefficients {
  a: number;
  b: number;
  c: number;
  d: number;
}

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

export function inverseIsometricEntityMatrix(
  rotationDegrees: number,
): TabletopMatrixCoefficients {
  const radians = (rotationDegrees * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  // Inverte Miso * Rotação. O determinante de Miso é 1, portanto o
  // billboard continua acompanhando zoom e câmera sem herdar a deformação.
  const a = cosine - sine;
  const b = 0.5 * (cosine + sine);
  const c = -(sine + cosine);
  const d = 0.5 * (cosine - sine);
  return { a: d, b: -b, c: -c, d: a };
}
