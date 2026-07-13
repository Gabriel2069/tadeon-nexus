import type { Attributes, SkillBranch } from "@/lib/sheet-types";

export type SceneStatus = "Planejada" | "Em curso" | "Concluída";
export type NpcClassification = "Incidental" | "Secundário" | "Operacional" | "Principal";
export type NpcState = "Pleno" | "Abalado" | "Comprometido" | "Incapacitado" | "Morto";

export interface MasterNpc {
  id: string;
  name: string;
  classification: NpcClassification;
  organization: string;
  occupation: string;
  appearance: string;
  role: string;
  description: string;
  secret: string;
  conviction: string;
  limit: string;
  procedure: string;
  resources: string;
  relationships: string;
  socialTension: string;
  abilities: string;
  inventory: string;
  morale: 1 | 2 | 3 | 4 | 5;
  state: NpcState;
  attributes: Attributes;
  vectors: Record<"luta" | "pontaria" | "intelecto" | "percepcao" | "tecnica" | "social", number>;
  pv: number;
  ps: number;
  pe: number;
  def: number;
  movement: number;
}

export type ClueType = "Direta" | "Fragmento Narrativo" | "Contexto" | "Ligação";
export type ClueDepth = "Superficial" | "Atenta" | "Profunda";

export interface MasterClue {
  id: string;
  title: string;
  content: string;
  type: ClueType;
  depth: ClueDepth;
  discovered: boolean;
  guaranteed: boolean;
  sceneId: string;
  linkedClueIds: string[];
  masterNotes: string;
}

export interface MasterScene {
  id: string;
  title: string;
  type: string;
  status: SceneStatus;
  narrative: string;
  description: string;
  superficialLayer: string;
  attentiveLayer: string;
  deepLayer: string;
  nextStep: string;
  npcIds: string[];
  threatIds: string[];
  clueIds: string[];
}

export interface InterludeActivity {
  id: string;
  character: string;
  kind: "Principal" | "Secundária";
  activity: string;
  outcome: string;
}

export interface MasterInterlude {
  id: string;
  title: string;
  status: SceneStatus;
  time: "Acelerado" | "Tranquilo" | "Prolongado";
  quality: "Hostil" | "Precário" | "Adequado" | "Confortável" | "Luxuoso" | "Refúgio";
  narration: "Superficial" | "Consciente" | "Ancorado" | "Enraizado";
  food: "Sem comida" | "Básica" | "Boa" | "Especial";
  activities: InterludeActivity[];
  notes: string;
}

export type FoldStage =
  | "Pré-Furo"
  | "Furo I"
  | "Furo II"
  | "Furo III"
  | "Âncora I"
  | "Âncora II"
  | "Âncora III"
  | "Zona de Aspecto"
  | "Revérbero";

export interface StitchPoint {
  id: string;
  factor: "Memória" | "Significância" | "Linguagem" | "Alma";
  description: string;
  resolved: boolean;
}

export interface MasterFold {
  id: string;
  name: string;
  stage: FoldStage;
  nature: string;
  tension: number;
  sealed: boolean;
  permanence: number;
  maxPermanence: number;
  environmentalEffect: string;
  pulseConsequence: string;
  stitchPoints: StitchPoint[];
  notes: string;
}

export type ThreatArchetype = "Predador" | "Colosso" | "Manifestação" | "Emboscador" | "Enxame";
export type ThreatArea =
  "Nenhuma" | "Cone curto" | "Linha" | "Explosão pequena" | "Explosão média" | "Explosão grande";

export interface ThreatAttack {
  id: string;
  name: string;
  vector: "Corpo" | "Projétil" | "Manipulação" | "Irradiação" | "Territorial";
  impact: 1 | 2 | 3 | 4 | 5 | 6;
  area: ThreatArea;
  effect: string;
}

export interface ThreatAbility {
  id: string;
  name: string;
  complexity: 1 | 2 | 3 | 4 | 5;
  description: string;
}

export interface MasterThreat {
  id: string;
  name: string;
  taxonomy: string;
  manifestation: string;
  nature: string;
  magnitude: number;
  archetype: ThreatArchetype;
  challengeIndex: 1 | 2 | 3 | 4 | 5;
  attributes: Record<"COR" | "AGI" | "INT" | "MEN", number>;
  ppPurchases: number;
  defPurchases: number;
  rdPurchases: number;
  reactionPurchases: number;
  movementPurchases: number;
  movementModes: string[];
  vectors: Record<"Corpo" | "Projétil" | "Manipulação" | "Irradiação" | "Territorial", number>;
  attacks: ThreatAttack[];
  abilities: ThreatAbility[];
  specialConditions: string;
  stitchManifestation: string;
  stitchCondition: string;
  stitchConsequence: string;
  currentPp: number;
  notes: string;
}

export const CANONICAL_SKILL_BRANCHES: SkillBranch[] = [
  {
    id: "corporeo",
    label: "Corpóreo",
    color: "#ef4444",
    nodes: [
      {
        id: "corp-impacto-bruto",
        name: "Impacto Bruto",
        desc: "+1D20 em ataques corpo a corpo",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "COR", value: 2 }],
      },
      {
        id: "corp-resistencia-natural",
        name: "Resistência Natural",
        desc: "+5 PV permanentes",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "COR", value: 2 }],
      },
      {
        id: "corp-brutal",
        name: "Modificação: Brutal",
        desc: "Armas corpo a corpo ganham +1 dado de dano em críticos",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "COR", value: 2 }],
      },
      {
        id: "corp-postura",
        name: "Postura de Combate",
        desc: "Enquanto não se mover no turno, +1 DEF",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "COR", value: 1 }],
      },
      {
        id: "corp-sequencia",
        name: "Sequência Fluida",
        desc: "Sequências de combate não reduzem dados de ataque",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "COR", value: 3 }],
      },
      {
        id: "corp-arrastao",
        name: "Modificação: Arrastão",
        desc: "Armas pesadas corpo a corpo empurram o alvo 1,5m",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "COR", value: 3 }],
      },
      {
        id: "corp-fortalecer",
        name: "Fortalecer",
        desc: "Gasta 1 PE para +1D20 em um teste físico",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "COR", value: 3 }],
      },
      {
        id: "corp-dilacerante",
        name: "Modificação: Dilacerante",
        desc: "Armas corpo a corpo aplicam Sangrando em crítico",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "COR", value: 4 }],
      },
      {
        id: "corp-forjado",
        name: "Corpo Forjado",
        desc: "Imune a Machucado; progride diretamente para Ferido",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "COR", value: 4 }],
      },
      {
        id: "corp-encarnacao",
        name: "Encarnação do Medo",
        desc: "Em Equilíbrio -5 ou menor, +2D20 em ataques físicos",
        cost: 4,
        minRank: 75,
        requires: [],
        attrReqs: [{ attr: "COR", value: 5 }],
      },
    ],
  },
  {
    id: "conscio",
    label: "Cônscio",
    color: "#10b981",
    nodes: [
      {
        id: "cons-olho",
        name: "Olho Aguçado",
        desc: "+1D20 em Percepção e Investigação",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 2 }],
      },
      {
        id: "cons-mira",
        name: "Modificação: Mira Fria",
        desc: "Ataque Mirado com armas de disparo custa Ação Livre",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 2 }],
      },
      {
        id: "cons-analise",
        name: "Análise Rápida",
        desc: "Uma vez por cena, revela fraqueza e reduz a DEF da criatura em 2 por uma rodada",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 2 }],
      },
      {
        id: "cons-logica",
        name: "Lógica em Campo",
        desc: "Pode usar Lógica no lugar de Tática em Testes Conjuntos",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 1 }],
      },
      {
        id: "cons-precisao",
        name: "Modificação: Precisão Cirúrgica",
        desc: "Ataque Concentrado com disparo tem DT reduzida em 3",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 3 }],
      },
      {
        id: "cons-memoria",
        name: "Memória de Fragmento",
        desc: "Identifica Fragmento já visto sem teste",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 3 }],
      },
      {
        id: "cons-fantasma",
        name: "Presença Fantasma",
        desc: "Gasta 1 PE para não deixar rastros por uma cena",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 3 }],
      },
      {
        id: "cons-ponto-cego",
        name: "Modificação: Ponto Cego",
        desc: "Armas de disparo ignoram Cobertura Parcial",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 4 }],
      },
      {
        id: "cons-fortaleza",
        name: "Mente Fortaleza",
        desc: "+1D20 em resistências a Tramas de Conhecimento",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 4 }],
      },
      {
        id: "cons-luminar",
        name: "Olho do Luminar",
        desc: "Uma vez por sessão, o Mestre responde com verdade a uma pergunta sobre a cena",
        cost: 4,
        minRank: 75,
        requires: [],
        attrReqs: [{ attr: "MEN", value: 5 }],
      },
    ],
  },
  {
    id: "canalizado",
    label: "Canalizado",
    color: "#a855f7",
    nodes: [
      {
        id: "can-fio-estavel",
        name: "Fio Estável",
        desc: "-1 na DT de puxar Fios Menores",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-reserva",
        name: "Reserva de Véu",
        desc: "+2 PE permanentes",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-leitura",
        name: "Leitura Rápida",
        desc: "Identifica natureza de Fragmento com DT 12",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-dupla",
        name: "Trama Dupla",
        desc: "Pode sustentar duas Tramas simultaneamente",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-ancoragem",
        name: "Ancoragem Pessoal",
        desc: "Ritual de 10 minutos recupera 2 PA e move Equilíbrio 1 em direção a zero",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-fio-medio",
        name: "Fio Médio Natural",
        desc: "-2 na DT de puxar Fios Médios",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-selador",
        name: "Selador Nato",
        desc: "Pode liderar Selagem sem Teste de Erudição",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-refluxo",
        name: "Absorção de Refluxo",
        desc: "Uma vez por sessão, converte Refluxo Severo em Normal",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [],
      },
      {
        id: "can-fluxo",
        name: "Tocar o Fluxo",
        desc: "Acesso a Fios de Tempo, sujeito ao requisito narrativo",
        cost: 4,
        minRank: 75,
        requires: [],
        attrReqs: [],
      },
    ],
  },
  {
    id: "cinetico",
    label: "Cinético",
    color: "#3b82f6",
    nodes: [
      {
        id: "cin-passo",
        name: "Passo Silencioso",
        desc: "+1D20 em Furtividade",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "INS", value: 2 }],
      },
      {
        id: "cin-furtivo",
        name: "Modificação: Furtivo",
        desc: "Armas ganham -10 de detecção sonora ao atacar",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "INS", value: 2 }],
      },
      {
        id: "cin-presenca",
        name: "Presença Magnética",
        desc: "+1D20 em Diplomacia e Persuasão",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "PRE", value: 2 }],
      },
      {
        id: "cin-reacao",
        name: "Tempo de Reação",
        desc: "+2 em Iniciativa",
        cost: 1,
        minRank: 0,
        requires: [],
        attrReqs: [{ attr: "INS", value: 1 }],
      },
      {
        id: "cin-disfarce",
        name: "Disfarce Profundo",
        desc: "Pode substituir Encenação por INS em disfarces físicos",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "INS", value: 3 }],
      },
      {
        id: "cin-sala",
        name: "Leitura de Sala",
        desc: "Uma vez por cena, identifica a intenção dos presentes",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "PRE", value: 3 }],
      },
      {
        id: "cin-esquiva",
        name: "Esquiva Instintiva",
        desc: "Esquivar custa Ação Livre uma vez por rodada",
        cost: 2,
        minRank: 25,
        requires: [],
        attrReqs: [{ attr: "INS", value: 3 }],
      },
      {
        id: "cin-sombra",
        name: "Sombra Viva",
        desc: "Pode usar Furtividade para sumir sem cobertura",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "INS", value: 4 }],
      },
      {
        id: "cin-amalgama",
        name: "Voz do Amálgama",
        desc: "PRE pode substituir qualquer atributo em interações sociais",
        cost: 3,
        minRank: 50,
        requires: [],
        attrReqs: [{ attr: "PRE", value: 4 }],
      },
      {
        id: "cin-fios",
        name: "Entre os Fios",
        desc: "Uma vez por sessão, evita automaticamente um ataque ou efeito de Trama",
        cost: 4,
        minRank: 75,
        requires: [],
        attrReqs: [{ attr: "INS", value: 5 }],
      },
    ],
  },
];

export const THREAT_MAGNITUDES = [
  { magnitude: 1, pp: 15, def: 6, reactions: 0, cp: 8 },
  { magnitude: 2, pp: 20, def: 7, reactions: 0, cp: 10 },
  { magnitude: 3, pp: 25, def: 8, reactions: 0, cp: 12 },
  { magnitude: 4, pp: 31, def: 9, reactions: 1, cp: 15 },
  { magnitude: 5, pp: 38, def: 10, reactions: 1, cp: 18 },
  { magnitude: 6, pp: 46, def: 11, reactions: 1, cp: 22 },
  { magnitude: 7, pp: 55, def: 12, reactions: 1, cp: 26 },
  { magnitude: 8, pp: 65, def: 13, reactions: 1, cp: 31 },
  { magnitude: 9, pp: 76, def: 14, reactions: 2, cp: 36 },
  { magnitude: 10, pp: 88, def: 15, reactions: 2, cp: 42 },
  { magnitude: 11, pp: 101, def: 16, reactions: 2, cp: 49 },
  { magnitude: 12, pp: 115, def: 17, reactions: 2, cp: 57 },
  { magnitude: 13, pp: 130, def: 18, reactions: 2, cp: 66 },
  { magnitude: 14, pp: 146, def: 19, reactions: 3, cp: 76 },
  { magnitude: 15, pp: 163, def: 20, reactions: 3, cp: 87 },
  { magnitude: 16, pp: 181, def: 21, reactions: 3, cp: 99 },
  { magnitude: 17, pp: 200, def: 22, reactions: 3, cp: 112 },
  { magnitude: 18, pp: 220, def: 23, reactions: 4, cp: 126 },
  { magnitude: 19, pp: 241, def: 24, reactions: 4, cp: 141 },
  { magnitude: 20, pp: 263, def: 25, reactions: 4, cp: 158 },
] as const;

const IMPACT_COST = [0, 2, 4, 6, 9, 12, 16];
const AREA_COST: Record<ThreatArea, number> = {
  Nenhuma: 0,
  "Cone curto": 2,
  Linha: 2,
  "Explosão pequena": 3,
  "Explosão média": 5,
  "Explosão grande": 8,
};
const ABILITY_COST = [0, 2, 4, 7, 11, 16];
const MOVEMENT_COST: Record<string, number> = {
  Escalada: 1,
  Voo: 5,
  "Teleporte curto": 6,
  "Teleporte médio": 10,
};

export function getThreatBase(magnitude: number) {
  const normalized = Math.max(1, Math.min(20, Math.round(magnitude || 1)));
  return THREAT_MAGNITUDES[normalized - 1];
}

export function threatCpSpent(threat: MasterThreat): number {
  return (
    Math.max(0, threat.ppPurchases) +
    Math.max(0, threat.defPurchases) * 2 +
    Math.max(0, threat.rdPurchases) * 2 +
    Math.max(0, threat.reactionPurchases) * 8 +
    Math.max(0, threat.movementPurchases) +
    threat.movementModes.reduce((sum, mode) => sum + (MOVEMENT_COST[mode] ?? 0), 0) +
    Object.values(threat.vectors).reduce((sum, value) => sum + Math.max(0, value || 0), 0) +
    threat.attacks.reduce(
      (sum, attack) => sum + IMPACT_COST[attack.impact] + AREA_COST[attack.area],
      0,
    ) +
    threat.abilities.reduce((sum, ability) => sum + ABILITY_COST[ability.complexity], 0)
  );
}

export function threatStats(threat: MasterThreat) {
  const base = getThreatBase(threat.magnitude);
  return {
    pp: base.pp + Math.max(0, threat.ppPurchases) * 6,
    def: base.def + Math.max(0, threat.defPurchases),
    rd: Math.max(0, threat.rdPurchases),
    reactions: base.reactions + Math.max(0, threat.reactionPurchases),
    movement: 6 + Math.max(0, threat.movementPurchases) * 3,
    cp: base.cp,
    spent: threatCpSpent(threat),
  };
}

const PARTY_FACTORS: Record<number, number> = {
  2: 0.65,
  3: 0.82,
  4: 1,
  5: 1.15,
  6: 1.28,
  7: 1.4,
};

export function calculateEncounterBalance(
  rankAverage: number,
  participants: number,
  magnitude: number,
) {
  const normalizedParticipants = Math.max(2, Math.min(7, Math.round(participants || 2)));
  const potential = Math.max(0, rankAverage) * PARTY_FACTORS[normalizedParticipants];
  const reference = Math.max(1, Math.min(20, Math.floor(potential / 5) + 1));
  const difference = magnitude - reference;
  const reading =
    difference <= -1
      ? "Leve"
      : difference === 0
        ? "Equilibrado"
        : difference === 1
          ? "Difícil"
          : difference === 2
            ? "Extremo"
            : "Acima da capacidade direta";
  return { participants: normalizedParticipants, potential, reference, difference, reading };
}

export function createEmptyNpc(): MasterNpc {
  return {
    id: "",
    name: "",
    classification: "Incidental",
    organization: "",
    occupation: "",
    appearance: "",
    role: "",
    description: "",
    secret: "",
    conviction: "",
    limit: "",
    procedure: "",
    resources: "",
    relationships: "",
    socialTension: "",
    abilities: "",
    inventory: "",
    morale: 3,
    state: "Pleno",
    attributes: { COR: 1, MEN: 1, INS: 1, PRE: 1, ERU: 1 },
    vectors: { luta: 0, pontaria: 0, intelecto: 0, percepcao: 0, tecnica: 0, social: 0 },
    pv: 0,
    ps: 0,
    pe: 0,
    def: 0,
    movement: 6,
  };
}

export function createEmptyThreat(): MasterThreat {
  return {
    id: "",
    name: "",
    taxonomy: "Criatura do Inverso",
    manifestation: "",
    nature: "",
    magnitude: 1,
    archetype: "Predador",
    challengeIndex: 1,
    attributes: { COR: 1, AGI: 1, INT: 1, MEN: 1 },
    ppPurchases: 0,
    defPurchases: 0,
    rdPurchases: 0,
    reactionPurchases: 0,
    movementPurchases: 0,
    movementModes: [],
    vectors: { Corpo: 0, Projétil: 0, Manipulação: 0, Irradiação: 0, Territorial: 0 },
    attacks: [],
    abilities: [],
    specialConditions: "",
    stitchManifestation: "",
    stitchCondition: "",
    stitchConsequence: "",
    currentPp: 15,
    notes: "",
  };
}

export function createEmptyClue(): MasterClue {
  return {
    id: "",
    title: "",
    content: "",
    type: "Direta",
    depth: "Superficial",
    discovered: false,
    guaranteed: true,
    sceneId: "",
    linkedClueIds: [],
    masterNotes: "",
  };
}

export function createEmptyInterlude(): MasterInterlude {
  return {
    id: "",
    title: "Novo Interlúdio",
    status: "Planejada",
    time: "Tranquilo",
    quality: "Adequado",
    narration: "Consciente",
    food: "Básica",
    activities: [],
    notes: "",
  };
}

export function createEmptyFold(): MasterFold {
  return {
    id: "",
    name: "Nova Dobra",
    stage: "Pré-Furo",
    nature: "",
    tension: 0,
    sealed: false,
    permanence: 0,
    maxPermanence: 3,
    environmentalEffect: "",
    pulseConsequence: "",
    stitchPoints: [],
    notes: "",
  };
}
