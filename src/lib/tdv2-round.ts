type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
/** Public tabletop projection. Unknown fields (including mestre notes) never cross this boundary. */
export type TdvPublicRound = {
  version: 2;
  round: number;
  impulses: number;
  responses: number;
  position: "Favorecida" | "Disputada" | "Exposta";
  revision: number;
};
export function publicTdvRound(value: unknown): TdvPublicRound | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (
    v.version !== 2 ||
    !Number.isSafeInteger(v.round) ||
    Number(v.round) < 1 ||
    !Number.isSafeInteger(v.revision) ||
    Number(v.revision) < 1 ||
    !Number.isInteger(v.impulses) ||
    Number(v.impulses) < 0 ||
    Number(v.impulses) > 2 ||
    ![0, 1].includes(v.responses as number) ||
    !["Favorecida", "Disputada", "Exposta"].includes(v.position as string)
  )
    return null;
  return {
    version: 2,
    round: v.round as number,
    impulses: v.impulses as number,
    responses: v.responses as number,
    position: v.position as TdvPublicRound["position"],
    revision: v.revision as number,
  };
}

export function mergeTdvRound(
  properties: unknown,
  round: TdvPublicRound | null,
): Record<string, Json | undefined> {
  const next = (
    properties && typeof properties === "object" && !Array.isArray(properties)
      ? { ...properties }
      : {}
  ) as Record<string, Json | undefined>;
  delete next.tdv2_round;
  if (round) next.tdv2_round = { ...round };
  return next;
}
