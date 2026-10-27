export type OfficialKnowledgePack = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  assetPath: string;
  fileName: string;
  pages: number;
  relations: number;
  expectedBytes: number;
  sha256: string;
  recommended?: boolean;
};

export const TADEON_NEXUS_CANONICO_ATUAL: OfficialKnowledgePack = {
  id: "tadeon-nexus-canonico-atual",
  title: "Nexus canônico atual",
  eyebrow: "Biblioteca unificada",
  description:
    "Livro de Regras TdV II v2.0 integrado ao acervo: regras atuais identificadas, fontes anteriores preservadas como histórico para revisão.",
  assetPath: "/nexus-packs/tadeon-nexus-canonico-atual.zip",
  fileName: "tadeon-nexus-canonico-atual.zip",
  pages: 203,
  relations: 314,
  expectedBytes: 510485,
  sha256: "e3063430958304e15a5b39c75fc0767234357c5e48a8a47794755c5ba4e7d17d",
  recommended: true,
};

/** Compatibility name for imports created before the canonical consolidation. */
export const TADEON_NEXUS_LOTE_01 = TADEON_NEXUS_CANONICO_ATUAL;

export const TADEON_NEXUS_OFFICIAL_PACKS: readonly OfficialKnowledgePack[] = [
  TADEON_NEXUS_CANONICO_ATUAL,
] as const;

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function loadOfficialKnowledgePack(
  pack: OfficialKnowledgePack = TADEON_NEXUS_CANONICO_ATUAL,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher(pack.assetPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("KNOWLEDGE_OFFICIAL_PACK_LOAD_FAILED");
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== pack.expectedBytes) {
    throw new Error("KNOWLEDGE_OFFICIAL_PACK_INTEGRITY_FAILED");
  }

  const digest = await crypto.subtle.digest("SHA-256", bytes);
  if (toHex(new Uint8Array(digest)) !== pack.sha256) {
    throw new Error("KNOWLEDGE_OFFICIAL_PACK_INTEGRITY_FAILED");
  }

  return new File([bytes], pack.fileName, {
    type: "application/zip",
    lastModified: 0,
  });
}
