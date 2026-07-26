// Shared domain types and canonical rules for the final Tadeon Nexus ruleset.
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
  fisica: string[];
  mental: string[];
  energetica: string[];
  outras: string[];
}

export const EMPTY_CONDITIONS: Conditions = {
  fisica: [],
  mental: [],
  energetica: [],
  outras: [],
};

export function normalizeConditions(value: unknown): Conditions {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const normalizeValue = (entry: unknown): string[] => {
    const values = Array.isArray(entry) ? entry : [entry];
    return Array.from(
      new Set(
        values
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && item !== "Normal"),
      ),
    );
  };

  return {
    fisica: normalizeValue(source.fisica),
    mental: normalizeValue(source.mental),
    energetica: normalizeValue(source.energetica),
    outras: normalizeValue(source.outras),
  };
}

export interface StatUpgrades {
  pv: number;
  ps: number;
  pe: number;
  def: number;
}

export const WEAPON_PROFICIENCIES = ["leigo", "operador", "combatente", "armígero"] as const;
export type WeaponProficiency = (typeof WEAPON_PROFICIENCIES)[number];
export type WeaponProficiencyFamily = "" | "Contato" | "Projeção";
export type InitialSkillDegrees = Record<string, number>;

export type LinkState = "Presente" | "Tensionado" | "Ferido" | "Rompido" | "Costurado";

export interface CharacterLink {
  id: string;
  name: string;
  relation: string;
  state: LinkState;
}

export type LifeCycleTrait =
  | "Formação recente"
  | "Corpo habituado"
  | "Nome reconhecido"
  | "Experiência acumulada"
  | "Responsabilidades"
  | "Cicatriz antiga";

export interface IdentityData {
  conviction: string;
  limit: string;
  wound: string;
  question: string;
  lifeCycleTrait: LifeCycleTrait | "";
  links: CharacterLink[];
}

export const DEFAULT_IDENTITY_DATA: IdentityData = {
  conviction: "",
  limit: "",
  wound: "",
  question: "",
  lifeCycleTrait: "",
  links: [
    { id: "link-1", name: "", relation: "", state: "Presente" },
    { id: "link-2", name: "", relation: "", state: "Presente" },
  ],
};

export interface Weapon {
  id: string;
  nome: string;
  descricao?: string;
  familia?: string;
  categoria?: string;
  proficiencia?: string;
  testeAtaque?: string;
  atributoDano?: string;
  dano: string;
  tipo: string;
  margemAmeaca?: string;
  alcance: string;
  maos?: string;
  propriedades?: string;
  espaco?: number;
  fonte?: string;
  pd?: number;
  rd?: number;
  modificacoes?: string;
  condicoesUso?: string;
  // Legacy fields kept so existing saved sheets remain readable.
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

export type FragmentCategory = "I" | "II" | "III";
export type FragmentSeal = "Selado" | "Não selado";
export type FragmentSafeLimit = "Repuxo" | "Tração" | "Estiramento";

export interface FragmentItem extends InventoryItem {
  selo?: FragmentSeal;
  categoria?: FragmentCategory;
  integridade?: number;
  natureza?: string;
  dominio?: string;
  assinatura?: string;
  limiteSeguro?: FragmentSafeLimit;
  observacoes?: string;
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
  requirementsText?: string;
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
    label: "Corpo e movimento",
    skills: ["Acrobacia", "Atletismo", "Fortitude", "Furtividade", "Luta", "Reflexo"],
  },
  {
    attr: "MEN",
    label: "Atenção e método",
    skills: ["Ciências", "Concentração", "Engenharia", "Lógica", "Medicina", "Tática"],
  },
  {
    attr: "INS",
    label: "Campo e percepção",
    skills: ["Adestramento", "Condução", "Iniciativa", "Intuição", "Percepção", "Sobrevivência"],
  },
  {
    attr: "PRE",
    label: "Expressão e vínculo",
    skills: ["Artes", "Convicção", "Diplomacia", "Encenação", "Intimidação", "Persuasão"],
  },
  {
    attr: "ERU",
    label: "Investigação e Tessitura",
    skills: ["Canalização", "Intrusão", "Investigação", "Pontaria", "Sociedade", "Temperança"],
  },
];

export const ALL_SKILLS = SKILL_GROUPS.flatMap((group) => group.skills);

export function getRankBase(exposure: number, rankTable: RankRow[]) {
  const rank = Math.floor(Math.max(0, exposure || 0) / 5) * 5;
  const source = rankTable.length ? rankTable : CANONICAL_RANK_TABLE;
  const found = [...source].sort((a, b) => b.rank - a.rank).find((row) => row.rank <= rank);
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
  pv: { base: 2, freeLevels: 1, increment: 1 },
  ps: { base: 2, freeLevels: 1, increment: 1 },
  pe: { base: 3, freeLevels: 1, increment: 1 },
  def: { base: 8, freeLevels: 1, increment: 4 },
};

export function upgradeCostAt(rule: UpgradeCostRule, currentLevel: number): number {
  if (currentLevel < rule.freeLevels) return rule.base;
  return rule.base + (currentLevel - (rule.freeLevels - 1)) * rule.increment;
}

export function maxResourceUpgradeLevels(rank: number): number {
  if (rank >= 75) return 8;
  if (rank >= 50) return 6;
  if (rank >= 25) return 4;
  return 2;
}

export function maxDefenseUpgradeLevels(rank: number): number {
  if (rank >= 75) return 3;
  if (rank >= 50) return 2;
  if (rank >= 25) return 1;
  return 0;
}

export function attributePointBudget(rank: number): number {
  return 9 + Math.max(0, Math.min(4, Math.floor(Math.max(0, rank) / 25)));
}

export function attributeValueCap(rank: number): number {
  return Math.min(5, 3 + Math.max(0, Math.floor(Math.max(0, rank) / 25)));
}

export function attributePointsUsed(attributes: Attributes): number {
  return (Object.values(attributes) as number[]).reduce(
    (sum, value) => sum + Math.max(0, Math.min(5, Math.round(Number(value) || 0))),
    0,
  );
}

export function weaponProficiencyMinimumRank(proficiency: WeaponProficiency): number {
  if (proficiency === "armígero") return 50;
  if (proficiency === "combatente") return 25;
  return 0;
}

export function weaponProficiencySpend(proficiency: WeaponProficiency): number {
  if (proficiency === "armígero") return 5;
  if (proficiency === "combatente") return 2;
  return 0;
}

export type ConditionKey = "fisica" | "mental" | "energetica" | "outras";
export type ConditionOptionsMap = Record<ConditionKey, string[]>;

export const DEFAULT_CONDITION_OPTIONS: ConditionOptionsMap = {
  fisica: ["Normal", "Machucado", "Ferido", "Incapacitado", "Sangrando", "Em Chamas"],
  mental: ["Normal", "Abalado", "Apavorado", "Confuso", "Compelido", "Silenciado", "Desorientado"],
  energetica: ["Normal", "Fadigado", "Esgotado", "Saturado", "Instável", "Descompassado"],
  outras: [
    "Normal",
    "Caído",
    "Agarrado",
    "Atordoado",
    "Envenenado",
    "Inconsciente",
    "Cego",
    "Surdo",
    "Doente",
  ],
};

export const CONDITION_META: Record<ConditionKey, { label: string; color: string; rgb: string }> = {
  fisica: { label: "Física", color: "#74242D", rgb: "116, 36, 45" },
  mental: { label: "Mental", color: "#D9D7A4", rgb: "217, 215, 164" },
  energetica: { label: "Energética", color: "#4F6E5D", rgb: "79, 110, 93" },
  outras: { label: "Situação", color: "#716B7B", rgb: "113, 107, 123" },
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
  { rank: 0, pv: 15, ps: 13, pe: 5, pa: 0, def: 10, pm: 0 },
  { rank: 5, pv: 16, ps: 14, pe: 5, pa: 0, def: 10, pm: 5 },
  { rank: 10, pv: 18, ps: 15, pe: 6, pa: 0, def: 10, pm: 10 },
  { rank: 15, pv: 19, ps: 16, pe: 6, pa: 0, def: 10, pm: 15 },
  { rank: 20, pv: 21, ps: 17, pe: 7, pa: 1, def: 10, pm: 20 },
  { rank: 25, pv: 22, ps: 18, pe: 7, pa: 1, def: 11, pm: 27 },
  { rank: 30, pv: 24, ps: 19, pe: 8, pa: 1, def: 11, pm: 34 },
  { rank: 35, pv: 25, ps: 20, pe: 8, pa: 1, def: 11, pm: 41 },
  { rank: 40, pv: 27, ps: 21, pe: 9, pa: 2, def: 11, pm: 48 },
  { rank: 45, pv: 28, ps: 22, pe: 9, pa: 2, def: 11, pm: 55 },
  { rank: 50, pv: 30, ps: 23, pe: 10, pa: 2, def: 12, pm: 64 },
  { rank: 55, pv: 31, ps: 24, pe: 10, pa: 2, def: 12, pm: 73 },
  { rank: 60, pv: 33, ps: 25, pe: 11, pa: 3, def: 12, pm: 82 },
  { rank: 65, pv: 34, ps: 26, pe: 11, pa: 3, def: 12, pm: 91 },
  { rank: 70, pv: 36, ps: 27, pe: 12, pa: 3, def: 12, pm: 100 },
  { rank: 75, pv: 37, ps: 28, pe: 12, pa: 3, def: 13, pm: 111 },
  { rank: 80, pv: 39, ps: 29, pe: 13, pa: 4, def: 13, pm: 122 },
  { rank: 85, pv: 40, ps: 30, pe: 13, pa: 4, def: 13, pm: 133 },
  { rank: 90, pv: 42, ps: 31, pe: 14, pa: 4, def: 13, pm: 144 },
  { rank: 95, pv: 43, ps: 32, pe: 14, pa: 4, def: 13, pm: 157 },
  { rank: 100, pv: 45, ps: 33, pe: 15, pa: 5, def: 14, pm: 170 },
];

export interface EquilibriumEffect {
  value: number;
  state: string;
  benefit: string;
  penalty: string;
}

const EQUILIBRIUM_STATES: Record<number, Omit<EquilibriumEffect, "value">> = {
  [-10]: {
    state: "Limite do Inverso",
    benefit: "+3d20 em ações e Tramas de Medo.",
    penalty: "-3d20 em Conhecimento; Tramas opostas acima de Repuxo impossíveis.",
  },
  [-9]: {
    state: "Dissolução Visceral",
    benefit: "+3d20 em Medo.",
    penalty: "-2d20 em Conhecimento; uma compulsão instintiva permanece até Costura narrativa.",
  },
  [-8]: {
    state: "Profundidade Visceral",
    benefit: "+2d20 em Medo.",
    penalty: "-2d20 em Conhecimento.",
  },
  [-7]: { state: "Corpo Dominante", benefit: "+2d20 em Medo.", penalty: "-1d20 em Conhecimento." },
  [-6]: {
    state: "Instinto Sobreposto",
    benefit: "+1d20 em Medo.",
    penalty: "-1d20 em Conhecimento; ameaças fortes exigem Convicção para não agir por impulso.",
  },
  [-5]: {
    state: "Ponto de Inflexão",
    benefit: "+1d20 em Medo.",
    penalty: "Estiramento de Conhecimento exige fonte excepcional.",
  },
  [-4]: {
    state: "Inclinação ao Medo",
    benefit: "+1d20 em ações claramente alinhadas ao Medo.",
    penalty: "—",
  },
  [-3]: {
    state: "Afinidade Visceral",
    benefit: "Uma vez por cena, trate Perícia sem treino como Iniciada em ação alinhada ao Medo.",
    penalty: "—",
  },
  [-2]: {
    state: "Sensação Ampliada",
    benefit: "Uma vez por cena, repita um d20 em percepção de risco ou presença ameaçadora.",
    penalty: "—",
  },
  [-1]: {
    state: "Toque de Instinto",
    benefit: "Sinais sutis e reflexos respondem antes do habitual.",
    penalty: "—",
  },
  0: {
    state: "Inteireza",
    benefit: "Nenhum bônus ou penalidade.",
    penalty: "A personagem permanece capaz de mudar sem que uma relação domine as demais.",
  },
  1: {
    state: "Toque de Clareza",
    benefit: "Padrões, palavras e lembranças aproximam-se da atenção.",
    penalty: "—",
  },
  2: {
    state: "Sensibilidade Estrutural",
    benefit: "Uma vez por cena, repita um d20 em análise de padrão, linguagem ou memória.",
    penalty: "—",
  },
  3: {
    state: "Afinidade Cognoscível",
    benefit:
      "Uma vez por cena, trate Perícia sem treino como Iniciada em ação alinhada ao Conhecimento.",
    penalty: "—",
  },
  4: {
    state: "Inclinação ao Conhecimento",
    benefit: "+1d20 em ações claramente alinhadas ao Conhecimento.",
    penalty: "—",
  },
  5: {
    state: "Ponto de Inflexão",
    benefit: "+1d20 em Conhecimento.",
    penalty: "Estiramento de Medo exige fonte excepcional.",
  },
  6: {
    state: "Razão Sobreposta",
    benefit: "+1d20 em Conhecimento.",
    penalty:
      "-1d20 em Medo; vínculos fortes exigem Convicção para não serem tratados como abstração.",
  },
  7: { state: "Mente Dominante", benefit: "+2d20 em Conhecimento.", penalty: "-1d20 em Medo." },
  8: {
    state: "Profundidade Abstrata",
    benefit: "+2d20 em Conhecimento.",
    penalty: "-2d20 em Medo.",
  },
  9: {
    state: "Dissolução Racional",
    benefit: "+3d20 em Conhecimento.",
    penalty: "-2d20 em Medo; uma compulsão por ordem permanece até Costura narrativa.",
  },
  10: {
    state: "Limite da Chama Fria",
    benefit: "+3d20 em ações e Tramas de Conhecimento.",
    penalty: "-3d20 em Medo; Tramas opostas acima de Repuxo impossíveis.",
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
  initialSkillDegrees?: InitialSkillDegrees,
): number {
  const freeDegrees =
    initialSkillDegrees && Object.keys(initialSkillDegrees).length
      ? initialSkillDegrees
      : inferInitialSkillDegrees(skills, trainingCosts);
  return Object.entries(skills || {}).reduce((sum, [skill, bonus]) => {
    const tiers = bonus >= 9 ? 3 : bonus >= 6 ? 2 : bonus >= 3 ? 1 : 0;
    const freeForSkill = Math.max(0, Math.min(2, Math.floor(freeDegrees[skill] || 0), tiers));
    let skillSpend = 0;
    for (let tier = 0; tier < tiers; tier += 1) {
      if (tier >= freeForSkill) skillSpend += trainingCosts[tier] ?? 0;
    }
    return sum + skillSpend;
  }, 0);
}

export function inferInitialSkillDegrees(
  skills: Record<string, number>,
  trainingCosts: [number, number, number] = DEFAULT_TRAINING_COSTS,
): InitialSkillDegrees {
  const candidates = Object.entries(skills || {}).flatMap(([skill, bonus]) => {
    const tiers = bonus >= 9 ? 3 : bonus >= 6 ? 2 : bonus >= 3 ? 1 : 0;
    return Array.from({ length: Math.min(2, tiers) }, (_, degree) => ({
      skill,
      degree,
      saved: trainingCosts[degree] ?? 0,
    }));
  });
  candidates.sort(
    (a, b) => b.saved - a.saved || a.skill.localeCompare(b.skill) || a.degree - b.degree,
  );
  return candidates.slice(0, 7).reduce<InitialSkillDegrees>((result, candidate) => {
    result[candidate.skill] = (result[candidate.skill] || 0) + 1;
    return result;
  }, {});
}

export function totalBranchSpend(purchasedSkills: string[], branches: SkillBranch[]): number {
  const byId = new Map(branches.flatMap((branch) => branch.nodes).map((node) => [node.id, node]));
  let freeTierOne = 2;
  return (purchasedSkills || []).reduce((sum, id) => {
    const node = byId.get(id);
    if (!node) return sum;
    if (node.minRank === 0 && freeTierOne > 0) {
      freeTierOne -= 1;
      return sum;
    }
    return sum + Math.max(0, Number(node.cost) || 0);
  }, 0);
}

export function calculatePMSpent(params: {
  statUpgrades: StatUpgrades;
  skills: Record<string, number>;
  purchasedSkills: string[];
  branches: SkillBranch[];
  upgradeCosts: UpgradeCosts;
  trainingCosts: [number, number, number];
  initialSkillDegrees?: InitialSkillDegrees;
  weaponProficiency?: WeaponProficiency;
}): number {
  return (
    totalUpgradeSpend(params.statUpgrades, params.upgradeCosts) +
    totalTrainingSpend(params.skills, params.trainingCosts, params.initialSkillDegrees) +
    totalBranchSpend(params.purchasedSkills, params.branches) +
    weaponProficiencySpend(params.weaponProficiency ?? "operador")
  );
}

export interface SkillRequirementContext {
  attributes: Attributes;
  skills: Record<string, number>;
  equilibrium: number;
  weaponProficiency: WeaponProficiency;
  purchasedSkills: string[];
  branches: SkillBranch[];
}

const TRAINING_REQUIREMENTS = {
  iniciada: 3,
  iniciado: 3,
  apurada: 6,
  apurado: 6,
  versada: 9,
  versado: 9,
} as const;

function trainingRequirementIn(clause: string): number | null {
  const normalized = clause.toLocaleLowerCase("pt-BR");
  const match = Object.entries(TRAINING_REQUIREMENTS).find(([name]) =>
    normalized.includes(name.slice(0, -1)),
  );
  return match?.[1] ?? null;
}

export function skillNodeRequirementFailure(
  node: SkillNode,
  context: SkillRequirementContext,
): string | null {
  for (const requirement of node.attrReqs || []) {
    if ((context.attributes[requirement.attr] ?? 0) < requirement.value)
      return `Requer ${requirement.attr} ${requirement.value}`;
  }

  const requirements = node.requirementsText || "";
  const equilibriumRange = requirements.match(/Equilíbrio entre\s*([+-]?\d+)\s*e\s*([+-]?\d+)/i);
  if (equilibriumRange) {
    const minimum = Number(equilibriumRange[1]);
    const maximum = Number(equilibriumRange[2]);
    if (context.equilibrium < minimum || context.equilibrium > maximum)
      return `Requer Equilíbrio entre ${minimum} e +${maximum}`;
  }
  const equilibriumMaximum = requirements.match(/Equilíbrio\s*([+-]?\d+)\s*ou menor/i);
  if (equilibriumMaximum && context.equilibrium > Number(equilibriumMaximum[1]))
    return `Requer Equilíbrio ${equilibriumMaximum[1]} ou menor`;
  const equilibriumMinimum = requirements.match(/Equilíbrio\s*([+-]?\d+)\s*ou maior/i);
  if (equilibriumMinimum && context.equilibrium < Number(equilibriumMinimum[1]))
    return `Requer Equilíbrio ${equilibriumMinimum[1]} ou maior`;

  if (
    requirements.toLocaleLowerCase("pt-BR").includes("proficiência adequada") &&
    context.weaponProficiency === "leigo"
  )
    return "Requer Proficiência adequada";

  const nodesByName = new Map(
    context.branches
      .flatMap((branch) => branch.nodes)
      .map((candidate) => [candidate.name, candidate]),
  );
  for (const [name, candidate] of nodesByName) {
    if (
      candidate.id !== node.id &&
      requirements.includes(name) &&
      !context.purchasedSkills.includes(candidate.id)
    )
      return `Requer ${name}`;
  }

  const clauses = requirements.split(",").map((clause) => clause.trim());
  for (const clause of clauses) {
    if (!clause || /^Rank\s+\d+/i.test(clause) || /Equilíbrio/i.test(clause)) continue;

    const attributeRequirements = Array.from(
      clause.matchAll(/\b(COR|MEN|INS|PRE|ERU)\s*([0-5])\b/g),
      (match) => ({
        attr: match[1] as keyof Attributes,
        value: Number(match[2]),
      }),
    );
    if (attributeRequirements.length) {
      const valid = clause.includes(" ou ")
        ? attributeRequirements.some(
            (requirement) => context.attributes[requirement.attr] >= requirement.value,
          )
        : attributeRequirements.every(
            (requirement) => context.attributes[requirement.attr] >= requirement.value,
          );
      if (!valid) return `Requer ${clause}`;
      continue;
    }

    const mentionedSkills = ALL_SKILLS.filter((skill) => clause.includes(skill));
    const requiredTraining = trainingRequirementIn(clause);
    if (mentionedSkills.length && requiredTraining) {
      const valid = clause.includes(" ou ")
        ? mentionedSkills.some((skill) => (context.skills[skill] || 0) >= requiredTraining)
        : mentionedSkills.every((skill) => (context.skills[skill] || 0) >= requiredTraining);
      if (!valid) return `Requer ${clause}`;
    }
  }

  return null;
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
