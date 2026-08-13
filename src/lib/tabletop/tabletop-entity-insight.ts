import { z } from "zod";

const finiteResource = z.number().finite().min(-1_000_000).max(1_000_000);

export const tabletopSheetSummarySchema = z
  .object({
    sheetId: z.uuid(),
    name: z.string().trim().min(1).max(160),
    occupation: z.string().trim().max(160),
    brand: z.string().trim().max(160),
    origin: z.string().trim().max(160),
    exposure: finiteResource,
    equilibrium: finiteResource,
    condition: z.string().trim().max(160),
    resources: z
      .object({
        pv: finiteResource,
        pe: finiteResource,
        ps: finiteResource,
        pa: finiteResource,
      })
      .strict(),
    activeConditions: z.array(z.string().trim().min(1).max(80)).max(12),
  })
  .strict();

export type TabletopSheetSummary = z.infer<typeof tabletopSheetSummarySchema>;

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function boundedText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function boundedNumber(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(-1_000_000, Math.min(1_000_000, numeric))
    : 0;
}

function pushConditionNames(value: unknown, names: string[], fallback = "") {
  if (typeof value === "string") {
    const name = boundedText(value, 80);
    if (name && name !== "Normal") names.push(name);
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) pushConditionNames(entry, names, fallback);
    return;
  }
  if (value === true) {
    if (fallback) names.push(boundedText(fallback, 80));
    return;
  }
  const condition = objectValue(value);
  if (Object.keys(condition).length === 0) return;
  if (condition.active === false || condition.value === false) return;
  if (condition.active === true || condition.value === true) {
    const name = boundedText(
      condition.name ?? condition.label ?? condition.id ?? fallback,
      80,
    );
    if (name && name !== "Normal") names.push(name);
    return;
  }
  for (const [key, entry] of Object.entries(condition))
    pushConditionNames(entry, names, key);
}

export function activeTabletopConditionNames(value: unknown) {
  const names: string[] = [];
  if (Array.isArray(value)) pushConditionNames(value, names);
  else {
    for (const [key, entry] of Object.entries(objectValue(value)))
      pushConditionNames(entry, names, key);
  }
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(0, 12);
}

export function normalizeTabletopSheetSummary(
  row: Record<string, unknown>,
): TabletopSheetSummary {
  const stats = objectValue(row.stats);
  return tabletopSheetSummarySchema.parse({
    sheetId: row.id,
    name: boundedText(row.name, 160) || "Ficha sem nome",
    occupation: boundedText(row.occupation, 160),
    brand: boundedText(row.brand, 160),
    origin: boundedText(row.origin, 160),
    exposure: boundedNumber(row.exposure),
    equilibrium: boundedNumber(row.equilibrium),
    condition: boundedText(row.condition, 160),
    resources: {
      pv: boundedNumber(stats.pv_current),
      pe: boundedNumber(stats.pe_current),
      ps: boundedNumber(stats.ps_current),
      pa: boundedNumber(stats.pa_current),
    },
    activeConditions: activeTabletopConditionNames(row.conditions),
  });
}
