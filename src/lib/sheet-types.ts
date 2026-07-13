// Shared types for character sheet
export interface Attributes {
  COR: number;
  MEN: number;
  INS: number;
  PRE: number;
  ERU: number;
}

export interface Stats {
  pv_current: number;
  pv_mod: number;
  ps_current: number;
  ps_mod: number;
  pe_current: number;
  pe_mod: number;
  pa_current: number;
  pa_mod: number;
  def_equip: number;
  def_mod: number;
  pm_current: number;
  pm_mod: number;
}

export interface Conditions {
  fisica: string;
  mental: string;
  energetica: string;
  outras: string;
}

export interface StatUpgrades {
  pv: number;
  ps: number;
  pe: number;
  def: number;
}

export interface Weapon {
  id: string;
  nome: string;
  tipo: string;
  alcance: string;
  dano: string;
  critico: string;
  peso: number;
  extra: string;
}

export interface InventoryItem {
  id: string;
  nome: string;
  descricao: string;
  espaco: number;
}

export interface Ability {
  id: string;
  nome: string;
  descricao: string;
  modificador: string;
}

export interface Plot {
  id: string;
  nome: string;
  uso: string;
  alcance: string;
  dano: string;
  efeito: string;
  dt_descricao: string;
}

export interface SkillNode {
  id: string;
  name: string;
  desc: string;
  cost: number;
  minRank: number;
  requires: string[];
  attrReqs: { attr: keyof Attributes; value: number }[];
}

export interface SkillBranch {
  id: string;
  label: string;
  color: string;
  nodes: SkillNode[];
}

export interface RankRow {
  rank: number;
  pv: number;
  ps: number;
  pe: number;
  pa: number;
  def: number;
  pm: number;
}

export const SKILL_GROUPS: { attr: keyof Attributes; label: string; skills: string[] }[] = [
  {
    attr: "COR",
    label: "Corpo",
    skills: ["Acrobacia", "Atletismo", "Fortitude", "Furtividade", "Ímpeto", "Luta"],
  },
  {
    attr: "MEN",
    label: "Mente",
    skills: ["Canalização", "Concentração", "Investigação", "Lógica", "Tática", "Vontade"],
  },
  {
    attr: "INS",
    label: "Instinto",
    skills: ["Adestramento", "Iniciativa", "Intuição", "Percepção", "Reflexo", "Sobrevivência"],
  },
  {
    attr: "PRE",
    label: "Presença",
    skills: ["Atualidades", "Convicção", "Diplomacia", "Encenação", "Intimidação", "Persuasão"],
  },
  {
    attr: "ERU",
    label: "Erudição",
    skills: ["Ciências", "Crime", "Medicina", "Pilotagem", "Pontaria", "Tecnologia"],
  },
];

export const ALL_SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);

export function getRankBase(exposure: number, rankTable: RankRow[]) {
  const r = Math.floor((exposure || 0) / 5) * 5;
  const source = rankTable.length ? rankTable : CANONICAL_RANK_TABLE;
  const found = [...source].sort((a, b) => b.rank - a.rank).find((row) => row.rank <= r);
  return found ?? CANONICAL_RANK_TABLE[0];
}

export function calcTotalPM(exposure: number, rankTable: RankRow[]): number {
  return getRankBase(exposure, rankTable).pm;
}

export function genId() {
  return Math.random().toString(36).slice(2, 11);
}

export interface UpgradeCostRule {
  base: number;
  freeLevels: number;
  increment: number;
}
export type UpgradeCosts = Record<"pv" | "ps" | "pe" | "def", UpgradeCostRule>;
export const DEFAULT_UPGRADE_COSTS: UpgradeCosts = {
  pv: { base: 1, freeLevels: 1, increment: 1 },
  ps: { base: 1, freeLevels: 1, increment: 1 },
  pe: { base: 1, freeLevels: 1, increment: 1 },
  def: { base: 2, freeLevels: 1, increment: 2 },
};
export function upgradeCostAt(rule: UpgradeCostRule, currentLevel: number): number {
  if (currentLevel < rule.freeLevels) return rule.base;
  return rule.base + (currentLevel - (rule.freeLevels - 1)) * rule.increment;
}

export type ConditionKey = "fisica" | "mental" | "energetica" | "outras";
export type ConditionOptionsMap = Record<ConditionKey, string[]>;
export const DEFAULT_CONDITION_OPTIONS: ConditionOptionsMap = {
  fisica: [
    "Normal",
    "Machucado",
    "Ferido",
    "Incapacitado",
    "Morrendo",
    "Sangrando",
    "Em Chamas",
    "Inconsciente",
  ],
  mental: ["Normal", "Abalado", "Apavorado", "Colapso", "Perdição", "Frustrado", "Fascinado"],
  energetica: ["Normal", "Fadigado", "Sobrecarregado", "Esgotado", "Refluxo"],
  outras: [
    "Normal",
    "Caído",
    "Imóvel",
    "Cego",
    "Surdo",
    "Agarrado",
    "Envenenado",
    "Doente",
    "Asfixiado",
  ],
};
export const CONDITION_META: Record<ConditionKey, { label: string; color: string; rgb: string }> = {
  fisica: { label: "Física", color: "#ef4444", rgb: "239, 68, 68" },
  mental: { label: "Mental", color: "#facc15", rgb: "250, 204, 21" },
  energetica: { label: "Energética", color: "#22c55e", rgb: "34, 197, 94" },
  outras: { label: "Outras", color: "#a16207", rgb: "161, 98, 7" },
};

export interface Description {
  historia: string;
  personalidade: string;
  objetivos: string;
  observacoes: string;
}

export const SKILL_ABILITY_PREFIX = "skill:";

export const DEFAULT_TRAINING_COSTS: [number, number, number] = [1, 2, 3];

export const CANONICAL_RANK_TABLE: RankRow[] = [
  { rank: 0, pv: 15, ps: 13, pe: 5, pa: 0, def: 5, pm: 0 },
  { rank: 5, pv: 18, ps: 14, pe: 6, pa: 0, def: 6, pm: 8 },
  { rank: 10, pv: 21, ps: 15, pe: 7, pa: 1, def: 7, pm: 8 },
  { rank: 15, pv: 24, ps: 16, pe: 8, pa: 1, def: 8, pm: 10 },
  { rank: 20, pv: 27, ps: 18, pe: 9, pa: 2, def: 9, pm: 10 },
  { rank: 25, pv: 30, ps: 20, pe: 10, pa: 2, def: 10, pm: 12 },
  { rank: 30, pv: 33, ps: 22, pe: 11, pa: 2, def: 11, pm: 12 },
  { rank: 35, pv: 36, ps: 24, pe: 12, pa: 3, def: 12, pm: 14 },
  { rank: 40, pv: 39, ps: 26, pe: 13, pa: 3, def: 13, pm: 14 },
  { rank: 45, pv: 42, ps: 28, pe: 14, pa: 3, def: 14, pm: 16 },
  { rank: 50, pv: 45, ps: 30, pe: 15, pa: 3, def: 15, pm: 16 },
  { rank: 55, pv: 48, ps: 32, pe: 16, pa: 4, def: 16, pm: 18 },
  { rank: 60, pv: 51, ps: 34, pe: 17, pa: 4, def: 17, pm: 18 },
  { rank: 65, pv: 54, ps: 36, pe: 18, pa: 4, def: 18, pm: 20 },
  { rank: 70, pv: 57, ps: 38, pe: 19, pa: 4, def: 19, pm: 20 },
  { rank: 75, pv: 60, ps: 40, pe: 20, pa: 4, def: 20, pm: 22 },
  { rank: 80, pv: 63, ps: 42, pe: 21, pa: 5, def: 21, pm: 22 },
  { rank: 85, pv: 66, ps: 44, pe: 22, pa: 5, def: 22, pm: 23 },
  { rank: 90, pv: 69, ps: 46, pe: 23, pa: 5, def: 23, pm: 23 },
  { rank: 95, pv: 72, ps: 48, pe: 24, pa: 5, def: 24, pm: 24 },
  { rank: 100, pv: 75, ps: 50, pe: 25, pa: 5, def: 25, pm: 25 },
];

export interface EquilibriumEffect {
  value: number;
  state: string;
  benefit: string;
  penalty: string;
}

const EQUILIBRIUM_STATES: Record<number, Omit<EquilibriumEffect, "value">> = {
  10: {
    state: "Chama Pura",
    benefit: "+3D20 Conhecimento",
    penalty: "-3D20 Medo; COR e INS em Desvantagem",
  },
  9: {
    state: "Dissolução Racional",
    benefit: "+3D20 Conhecimento",
    penalty: "-2D20 Medo; -1D20 COR e INS",
  },
  8: { state: "Abstração Profunda", benefit: "+2D20 Conhecimento", penalty: "-2D20 Medo" },
  7: { state: "Mente Dominante", benefit: "+2D20 Conhecimento", penalty: "-1D20 Medo" },
  6: { state: "Razão Sobreposta", benefit: "+1D20 Conhecimento", penalty: "-1D20 Medo" },
  5: {
    state: "Ponto de Inflexão",
    benefit: "+1D20 Conhecimento",
    penalty: "Fio Maior de Medo bloqueado",
  },
  4: { state: "Inclinação Racional", benefit: "+1D20 Conhecimento", penalty: "—" },
  3: { state: "Levemente Racional", benefit: "+1 treino mental", penalty: "—" },
  2: { state: "Clareza Leve", benefit: "—", penalty: "—" },
  1: { state: "Toque de Razão", benefit: "—", penalty: "—" },
  0: { state: "Humano Pleno", benefit: "—", penalty: "—" },
  [-1]: { state: "Toque de Instinto", benefit: "—", penalty: "—" },
  [-2]: { state: "Sensação Leve", benefit: "—", penalty: "—" },
  [-3]: { state: "Levemente Visceral", benefit: "+1 treino físico", penalty: "—" },
  [-4]: { state: "Inclinação ao Medo", benefit: "+1D20 Medo", penalty: "—" },
  [-5]: {
    state: "Ponto de Inflexão",
    benefit: "+1D20 Medo",
    penalty: "Fio Maior de Conhecimento bloqueado",
  },
  [-6]: { state: "Instinto Sobreposto", benefit: "+1D20 Medo", penalty: "-1D20 Conhecimento" },
  [-7]: { state: "Corpo Dominante", benefit: "+2D20 Medo", penalty: "-1D20 Conhecimento" },
  [-8]: { state: "Visceral Profundo", benefit: "+2D20 Medo", penalty: "-2D20 Conhecimento" },
  [-9]: {
    state: "Dissolução Instintiva",
    benefit: "+3D20 Medo",
    penalty: "-2D20 Conhecimento; -1D20 MEN e ERU",
  },
  [-10]: {
    state: "Inverso Puro",
    benefit: "+3D20 Medo",
    penalty: "-3D20 Conhecimento; MEN e ERU em Desvantagem",
  },
};

export function getEquilibriumEffect(value: number): EquilibriumEffect {
  const normalized = Math.max(-10, Math.min(10, Math.round(value || 0)));
  return { value: normalized, ...EQUILIBRIUM_STATES[normalized] };
}

export function totalUpgradeSpend(upgrades: StatUpgrades, costs: UpgradeCosts): number {
  return (Object.keys(upgrades) as (keyof StatUpgrades)[]).reduce((sum, key) => {
    const levels = Math.max(0, Number(upgrades[key]) || 0);
    let spent = 0;
    for (let level = 0; level < levels; level += 1) spent += upgradeCostAt(costs[key], level);
    return sum + spent;
  }, 0);
}

export function totalTrainingSpend(
  skills: Record<string, number>,
  trainingCosts: [number, number, number],
): number {
  return Object.values(skills || {}).reduce((sum, bonus) => {
    const tiers = bonus >= 15 ? 3 : bonus >= 10 ? 2 : bonus >= 5 ? 1 : 0;
    return sum + trainingCosts.slice(0, tiers).reduce((tierSum, cost) => tierSum + cost, 0);
  }, 0);
}

export function totalBranchSpend(purchasedSkills: string[], branches: SkillBranch[]): number {
  const purchased = new Set(purchasedSkills || []);
  return branches
    .flatMap((branch) => branch.nodes)
    .filter((node) => purchased.has(node.id))
    .reduce((sum, node) => sum + Math.max(0, Number(node.cost) || 0), 0);
}

export function calculatePMSpent(params: {
  statUpgrades: StatUpgrades;
  skills: Record<string, number>;
  purchasedSkills: string[];
  branches: SkillBranch[];
  upgradeCosts: UpgradeCosts;
  trainingCosts: [number, number, number];
}): number {
  return (
    totalUpgradeSpend(params.statUpgrades, params.upgradeCosts) +
    totalTrainingSpend(params.skills, params.trainingCosts) +
    totalBranchSpend(params.purchasedSkills, params.branches)
  );
}

export function calculateSheetMaximums(params: {
  attributes: Attributes;
  stats: Stats;
  upgrades: StatUpgrades;
  rank: RankRow;
  armor: number;
}) {
  const { attributes, stats, upgrades, rank, armor } = params;
  return {
    pv: rank.pv + attributes.COR * 3 + stats.pv_mod + upgrades.pv * 3,
    ps: rank.ps + attributes.MEN * 3 + stats.ps_mod + upgrades.ps * 2,
    pe: rank.pe + attributes.PRE * 2 + stats.pe_mod + upgrades.pe,
    pa: rank.pa + attributes.ERU + stats.pa_mod,
    def: rank.def + attributes.INS + armor + stats.def_mod + upgrades.def,
  };
}
