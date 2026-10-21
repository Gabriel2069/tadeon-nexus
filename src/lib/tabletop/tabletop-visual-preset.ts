import type { TabletopEntity, TabletopEntitySeed } from "./types";

/** Only visual authorship belongs in a reusable piece; never copy actor ownership or private notes. */
const VISUAL_KEYS = [
  "mime_type",
  "render_mode",
  "billboard_anchor",
  "billboard_scale",
  "shadow",
  "playback_speed",
  "playback_loop",
  "playback_muted",
  "playback_paused",
  "visual_conditions",
  "icons",
  "aura_color",
  "aura_intensity",
  "base_color",
  "token_volume",
  "token_base_height",
  "model_scale",
  "model_yaw",
  "model_elevation_offset",
  "model_animation_paused",
  "model_animation_speed",
  "model_visible",
  "model_animation",
  "model_animation_name",
  "model_animation_time",
  "model_animation_offset",
] as const;

export function tabletopVisualPreset(entity: TabletopEntity): TabletopEntitySeed {
  const source =
    entity.properties && typeof entity.properties === "object" && !Array.isArray(entity.properties)
      ? (entity.properties as Record<string, unknown>)
      : {};
  const properties: Record<string, unknown> = { base_color: entity.color };
  for (const key of VISUAL_KEYS) if (key in source) properties[key] = structuredClone(source[key]);
  properties.base_color = entity.color;
  return {
    type: entity.type,
    label: entity.label,
    width: entity.width,
    height: entity.height,
    color: entity.color,
    rotation: entity.rotation,
    elevation: entity.elevation,
    assetId: entity.assetId,
    assetUrl: entity.assetUrl,
    properties,
  };
}
