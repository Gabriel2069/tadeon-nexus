import type { Attributes, SkillBranch } from "@/lib/sheet-types";
import { FINAL_SKILL_BRANCHES } from "@/lib/final-skill-branches";

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
  vectors: Record<"fisico" | "tecnico" | "perceptivo" | "social" | "metafisico", number>;
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
  factor: string;
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
  | "Nenhuma"
  | "Engajado"
  | "Próximo"
  | "Distante"
  | "Longo"
  | "Extremo"
  | "Cone curto"
  | "Cone longo"
  | "Linha curta"
  | "Linha longa"
  | "Raio pequeno"
  | "Raio médio"
  | "Raio grande"
  | "Aura curta"
  | "Aura ampla"
  | "Corrente"
  | "Cena"
  | "Território";

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

export const CANONICAL_SKILL_BRANCHES: SkillBranch[] = FINAL_SKILL_BRANCHES;

export const THREAT_MAGNITUDES = [
  { magnitude: 1, pp: 15, def: 15, reactions: 0, cp: 8 },
  { magnitude: 2, pp: 20, def: 15, reactions: 0, cp: 10 },
  { magnitude: 3, pp: 25, def: 16, reactions: 0, cp: 12 },
  { magnitude: 4, pp: 31, def: 16, reactions: 1, cp: 15 },
  { magnitude: 5, pp: 38, def: 17, reactions: 1, cp: 18 },
  { magnitude: 6, pp: 46, def: 17, reactions: 1, cp: 22 },
  { magnitude: 7, pp: 55, def: 17, reactions: 1, cp: 26 },
  { magnitude: 8, pp: 65, def: 19, reactions: 1, cp: 31 },
  { magnitude: 9, pp: 76, def: 19, reactions: 2, cp: 36 },
  { magnitude: 10, pp: 88, def: 20, reactions: 2, cp: 42 },
  { magnitude: 11, pp: 101, def: 20, reactions: 2, cp: 49 },
  { magnitude: 12, pp: 115, def: 20, reactions: 2, cp: 57 },
  { magnitude: 13, pp: 130, def: 21, reactions: 2, cp: 66 },
  { magnitude: 14, pp: 146, def: 21, reactions: 3, cp: 76 },
  { magnitude: 15, pp: 163, def: 21, reactions: 3, cp: 87 },
  { magnitude: 16, pp: 181, def: 22, reactions: 3, cp: 99 },
  { magnitude: 17, pp: 200, def: 23, reactions: 3, cp: 112 },
  { magnitude: 18, pp: 220, def: 23, reactions: 4, cp: 126 },
  { magnitude: 19, pp: 241, def: 23, reactions: 4, cp: 141 },
  { magnitude: 20, pp: 263, def: 23, reactions: 4, cp: 158 },
] as const;

const IMPACT_COST = [0, 2, 4, 6, 9, 12, 16];
const AREA_COST: Record<ThreatArea, number> = {
  Nenhuma: 0,
  Engajado: 0,
  Próximo: 1,
  Distante: 2,
  Longo: 4,
  Extremo: 6,
  "Cone curto": 2,
  "Cone longo": 4,
  "Linha curta": 2,
  "Linha longa": 4,
  "Raio pequeno": 3,
  "Raio médio": 5,
  "Raio grande": 8,
  "Aura curta": 2,
  "Aura ampla": 5,
  Corrente: 4,
  Cena: 10,
  Território: 15,
};
const ABILITY_COST = [0, 2, 4, 7, 11, 16];
const MOVEMENT_COST: Record<string, number> = {
  Escalada: 1,
  Natação: 1,
  Voo: 5,
  "Deslocamento por Costura": 4,
  "Teleporte curto": 6,
  "Teleporte médio": 10,
};

export function getThreatBase(magnitude: number) {
  const normalized = Math.max(1, Math.min(20, Math.round(magnitude || 1)));
  return THREAT_MAGNITUDES[normalized - 1];
}

function progressiveRdCost(purchases: number): number {
  const count = Math.max(0, Math.floor(purchases || 0));
  return Array.from({ length: count }, (_, index) => index + 2).reduce((sum, cost) => sum + cost, 0);
}

export function threatCpSpent(threat: MasterThreat): number {
  return (
    Math.max(0, threat.ppPurchases) +
    Math.max(0, threat.defPurchases) * 2 +
    progressiveRdCost(threat.rdPurchases) +
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
  const reference = Math.max(1, Math.min(20, Math.max(normalizedParticipants, Math.floor(potential / 5) + 1)));
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
    vectors: { fisico: 0, tecnico: 0, perceptivo: 0, social: 0, metafisico: 0 },
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

