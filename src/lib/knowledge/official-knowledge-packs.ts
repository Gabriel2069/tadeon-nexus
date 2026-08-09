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

export const TADEON_NEXUS_LOTE_01: OfficialKnowledgePack = {
  id: "tadeon-nexus-lote-01",
  title: "Biblioteca completa",
  eyebrow: "Lote oficial 01",
  description:
    "Os cinco volumes finais, as sínteses editoriais e toda a trama de conexões do universo.",
  assetPath: "/nexus-packs/tadeon-nexus-lote-01.zip",
  fileName: "tadeon-nexus-lote-01.zip",
  pages: 186,
  relations: 298,
  expectedBytes: 396_484,
  sha256: "81372d176fb36357c0fea52720b1b0f891a4175ec98d2d346e30e80e837f4598",
  recommended: true,
};

export const TADEON_NEXUS_OFFICIAL_PACKS: readonly OfficialKnowledgePack[] = [
  TADEON_NEXUS_LOTE_01,
  {
    id: "tadeon-nexus-conexoes",
    title: "Atlas de conexões",
    eyebrow: "Síntese entre fontes",
    description:
      "Índices de origem e páginas de síntese para navegar conceitos, lugares, regras e cosmologia em conjunto.",
    assetPath: "/nexus-packs/tadeon-nexus-conexoes.zip",
    fileName: "tadeon-nexus-conexoes.zip",
    pages: 61,
    relations: 173,
    expectedBytes: 46_498,
    sha256: "0fabca3d51bee749e2ed34b96fbd3a3fb01c1cca0af7c84af79cd87903722f39",
  },
  {
    id: "tadeon-nexus-arden",
    title: "Arden",
    eyebrow: "Cenário e narrativa",
    description:
      "O mundo conhecido, suas eras, culturas, tensões e pontos de partida para a campanha.",
    assetPath: "/nexus-packs/tadeon-nexus-arden.zip",
    fileName: "tadeon-nexus-arden.zip",
    pages: 73,
    relations: 72,
    expectedBytes: 85_666,
    sha256: "5d566b00deea496ee83cc4e639785d91029bffab38a3f21cdd5b62c4539bd5bc",
  },
  {
    id: "tadeon-nexus-urdidura",
    title: "Urdidura do Vazio",
    eyebrow: "Cosmologia",
    description:
      "A ontologia do Vazio, Naturezas, Véu, Fluxo, Dobras, Domínios e Canalização.",
    assetPath: "/nexus-packs/tadeon-nexus-urdidura.zip",
    fileName: "tadeon-nexus-urdidura.zip",
    pages: 15,
    relations: 14,
    expectedBytes: 50_584,
    sha256: "2d93323cbb46cfe3c349c2a0e375cc8e69ab545ace2f36dda2817075bc71b83d",
  },
  {
    id: "tadeon-nexus-regras",
    title: "Livro de Regras",
    eyebrow: "Sistema de jogo",
    description:
      "Identidade, testes, habilidades, combate, investigação, selagem e construção de campanhas.",
    assetPath: "/nexus-packs/tadeon-nexus-regras.zip",
    fileName: "tadeon-nexus-regras.zip",
    pages: 24,
    relations: 23,
    expectedBytes: 110_129,
    sha256: "89ccc32c7a9a9096d28f1bd45db3548f6cad4a4d7ba7020c386e6e84c29436c2",
  },
  {
    id: "tadeon-nexus-geografia",
    title: "Geografia de Veth",
    eyebrow: "Observações de Arden IV",
    description:
      "Geologia, relevo, águas, clima, biogeografia e territórios de observação limitada.",
    assetPath: "/nexus-packs/tadeon-nexus-geografia.zip",
    fileName: "tadeon-nexus-geografia.zip",
    pages: 11,
    relations: 10,
    expectedBytes: 62_974,
    sha256: "63349e88c458192793f0427a561d89434ea8767811a600eed10cb99db0312807",
  },
  {
    id: "tadeon-nexus-ciencias",
    title: "Ciências de Veth",
    eyebrow: "Observações de Arden III",
    description:
      "Fundamentos científicos, matrizes energéticas, pneumática, bioalquimia, óptica e integração tecnológica.",
    assetPath: "/nexus-packs/tadeon-nexus-ciencias.zip",
    fileName: "tadeon-nexus-ciencias.zip",
    pages: 7,
    relations: 6,
    expectedBytes: 47_909,
    sha256: "12ac0ed97ca25be60330274f431365aa005ce9a85432db6ecfe0aa30836ec840",
  },
] as const;

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
