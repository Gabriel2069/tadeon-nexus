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
    skills: ["Acrobacia", "Atletismo", "Combate", "Furtividade"],
  },
  {
    attr: "MEN",
    label: "Mente",
    skills: ["Investigação", "Percepção", "Sobrevivência", "Vontade"],
  },
  {
    attr: "INS",
    label: "Instinto",
    skills: ["Iniciativa", "Pontaria", "Reflexos", "Intuição"],
  },
  {
    attr: "PRE",
    label: "Presença",
    skills: ["Atuação", "Diplomacia", "Enganação", "Intimidação"],
  },
  {
    attr: "ERU",
    label: "Erudição",
    skills: ["Ciências", "Medicina", "Ocultismo", "Tecnologia"],
  },
];

export const ALL_SKILLS = SKILL_GROUPS.flatMap((g) => g.skills);

export function getRankBase(exposure: number, rankTable: RankRow[]) {
  const r = Math.floor((exposure || 0) / 5) * 5;
  const found = [...rankTable].reverse().find((row) => row.rank <= r);
  return found ?? { rank: 0, pv: 10, ps: 10, pe: 5, pa: 0, def: 10, pm: 0 };
}

export function calcTotalPM(exposure: number, rankTable: RankRow[]): number {
  const normalizedRank = Math.floor((exposure || 0) / 5) * 5;
  const base = getRankBase(exposure, rankTable);
  return base.pm + Math.floor(normalizedRank / 5) * 2;
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
  pv: { base: 10, freeLevels: 3, increment: 5 },
  ps: { base: 10, freeLevels: 3, increment: 5 },
  pe: { base: 10, freeLevels: 3, increment: 5 },
  def: { base: 10, freeLevels: 3, increment: 5 },
};
export function upgradeCostAt(rule: UpgradeCostRule, currentLevel: number): number {
  if (currentLevel < rule.freeLevels) return rule.base;
  return rule.base + (currentLevel - (rule.freeLevels - 1)) * rule.increment;
}

export type ConditionKey = "fisica" | "mental" | "energetica" | "outras";
export type ConditionOptionsMap = Record<ConditionKey, string[]>;
export const DEFAULT_CONDITION_OPTIONS: ConditionOptionsMap = {
  fisica: ["Normal", "Sangrando", "Atordoado", "Ferido", "Inconsciente"],
  mental: ["Normal", "Em pânico", "Confuso", "Aterrorizado", "Drenado"],
  energetica: ["Normal", "Drenado", "Sobrecarregado", "Em ressonância", "Apagado"],
  outras: ["Normal", "Marcado", "Possuído", "Amaldiçoado"],
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
