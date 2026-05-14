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

export function genId() {
  return Math.random().toString(36).slice(2, 11);
}
