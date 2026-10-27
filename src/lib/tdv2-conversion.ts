import { newTdvCharacter, LINK_STATES, uid, type TdvCharacter, type TdvRecord } from "./tdv2";
export function draftFromLegacy(row: Record<string, unknown>): TdvCharacter {
  const c = newTdvCharacter(),
    identity = (row.identity_data ?? {}) as Record<string, unknown>,
    description = (row.description ?? {}) as Record<string, unknown>;
  const links = Array.isArray(identity.links) ? (identity.links as Record<string, unknown>[]) : [];
  const records: TdvRecord[] = [];
  const groups = [
    ["weapons", "Arma"],
    ["inventory", "Equipamento"],
    ["abilities", "Lavor"],
    ["plots", "Trama"],
    ["fragments_items", "Fragmento"],
    ["defense_items", "Equipamento"],
  ] as const;
  for (const [key, kind] of groups) {
    for (const item of (Array.isArray(row[key]) ? row[key] : []) as Record<string, unknown>[]) {
      const fields: Record<string, string> = Object.fromEntries(
        Object.entries(item)
          .filter(([k]) => k !== "id" && k !== "nome")
          .map(([k, v]) => [k, typeof v === "string" ? v : (JSON.stringify(v) ?? "")]),
      );
      Object.assign(fields, {
        Descrição: String(item.descricao ?? ""),
        "Registro de origem": key,
        "Porte e acesso": String(item.extra ?? item.condicoesUso ?? ""),
      });
      if (kind === "Arma")
        Object.assign(fields, {
          Família: String(item.familia ?? item.tipo ?? ""),
          Alcance: String(item.alcance ?? ""),
          Manejo: String(item.maos ?? ""),
          Propriedades: String(item.propriedades ?? ""),
          Impacto: "",
          "Dano-base": "",
          Integridade: "Apto",
          "Dano registrado anteriormente": String(item.dano ?? ""),
        });
      if (kind === "Lavor")
        Object.assign(fields, {
          Expressão: String(item.descricao ?? ""),
          Vertente: "",
          Gatilho: "",
          Gesto: "",
          "Preço/limite": "",
          "Prática anterior": String(item.modificador ?? ""),
        });
      if (kind === "Trama")
        Object.assign(fields, {
          Alvo: String(item.alvo ?? ""),
          Alcance: String(item.alcance ?? ""),
          Duração: String(item.duracao ?? ""),
          Resistência: String(item.resistencia ?? ""),
          Assinatura: String(item.assinatura ?? ""),
        });
      records.push({
        id: String(item.id ?? uid()),
        kind,
        name: String(item.nome ?? item.name ?? "Sem nome"),
        fields,
      });
    }
  }
  return {
    ...c,
    records,
    face: {
      ...c.face,
      origin: String(row.origin ?? ""),
      occupation: String(row.occupation ?? ""),
      conviction: String(identity.conviction ?? row.motivation ?? ""),
      limit: String(identity.limit ?? ""),
      mark: { ...c.face.mark, manifestation: String(row.brand ?? "") },
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
