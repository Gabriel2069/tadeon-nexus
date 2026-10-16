/** Public visual scalar shared by persistence and the protected player projection. */
const ENTITY_COLORS: Record<string, number> = {
  token: 0x8d3152,
  character: 0x8d3152,
  npc: 0x7b4058,
  creature: 0x70333b,
  object: 0x345d6f,
  tile: 0x345d6f,
  drawing: 0x6a5d3e,
  text: 0x5a5368,
  marker: 0x765c2f,
  note: 0x765c2f,
  area: 0x4b5d47,
  light: 0x8a7538,
  handout_pin: 0x5d4770,
};

export function tabletopEntityColor(type: string, value: unknown): number {
  const props =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const color = props.base_color;
  return typeof color === "number" && Number.isInteger(color) && color >= 0 && color <= 0xffffff
    ? color
    : (ENTITY_COLORS[type] ?? 0x4f5560);
}

export function tabletopColorProperties(type: string, color: number, value: unknown) {
  const props =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return { ...props, base_color: tabletopEntityColor(type, { base_color: color }) };
}
