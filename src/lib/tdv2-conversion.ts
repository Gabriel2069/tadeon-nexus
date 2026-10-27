import { newTdvCharacter, LINK_STATES, uid, type TdvCharacter } from "./tdv2";
export function draftFromLegacy(row: Record<string, unknown>): TdvCharacter {
  const c = newTdvCharacter(),
    identity = (row.identity_data ?? {}) as Record<string, unknown>,
    description = (row.description ?? {}) as Record<string, unknown>;
  const links = Array.isArray(identity.links) ? (identity.links as Record<string, unknown>[]) : [];
  return {
    ...c,
    face: {
      ...c.face,
      origin: String(row.origin ?? ""),
      occupation: String(row.occupation ?? ""),
      conviction: String(identity.conviction ?? row.motivation ?? ""),
      limit: String(identity.limit ?? ""),
      links: links.length
        ? links.map((link) => ({
            id: String(link.id || uid()),
            node: String(link.name || ""),
            nature: String(link.relation || ""),
            state: LINK_STATES.includes(link.state as (typeof LINK_STATES)[number])
              ? (link.state as (typeof LINK_STATES)[number])
              : "Presente",
            offer: "",
            demand: "",
            tension: "",
          }))
        : c.face.links,
    },
    history: String(description.historia ?? ""),
    notes: [
      String(row.notes ?? ""),
      row.brand ? `Marca na edição anterior: ${String(row.brand)}` : "",
      identity.wound ? `Registro anterior: ${String(identity.wound)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}
