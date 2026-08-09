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

function activeConditionNames(value: unknown) {
  const names: string[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") names.push(entry);
      else {
        const condition = objectValue(entry);
        if (condition.active !== false)
          names.push(
            boundedText(condition.name ?? condition.label ?? condition.id, 80),
          );
      }
    }
  } else {
    for (const [key, entry] of Object.entries(objectValue(value))) {
      if (entry === true) names.push(key);
      else {
        const condition = objectValue(entry);
        if (condition.active === true || condition.value === true)
          names.push(boundedText(condition.name ?? condition.label ?? key, 80));
      }
    }
  }
  return [...new Set(names.map((name) => name.trim()).filter(Boolean))].slice(
    0,
    12,
  );
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
    activeConditions: activeConditionNames(row.conditions),
  });
}
