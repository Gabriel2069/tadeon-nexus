export type OfficialKnowledgePack = {
  id: string;
  title: string;
  description: string;
  assetPath: string;
  fileName: string;
  pages: number;
  relations: number;
  expectedBytes: number;
  sha256: string;
};

export const TADEON_NEXUS_LOTE_01: OfficialKnowledgePack = {
  id: "tadeon-nexus-lote-01",
  title: "Tadeon Nexus — Lote 01",
  description:
    "Arden, Geografia de Veth, Ciências de Veth, Urdidura do Vazio e Livro de Regras.",
  assetPath: "/nexus-packs/tadeon-nexus-lote-01.zip",
  fileName: "tadeon-nexus-lote-01.zip",
  pages: 186,
  relations: 298,
  expectedBytes: 396_484,
  sha256: "81372d176fb36357c0fea52720b1b0f891a4175ec98d2d346e30e80e837f4598",
};

function toHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function loadOfficialKnowledgePack(
  pack: OfficialKnowledgePack = TADEON_NEXUS_LOTE_01,
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
