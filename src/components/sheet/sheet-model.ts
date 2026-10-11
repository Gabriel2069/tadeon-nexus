import {
  type Ability,
  type Attributes,
  type Conditions,
  type Description,
  type FragmentItem,
  type IdentityData,
  type InitialSkillDegrees,
  type InventoryItem,
  type Plot,
  type Stats,
  type StatUpgrades,
  type Weapon,
  type WeaponProficiency,
  type WeaponProficiencyFamily,
} from "@/lib/sheet-types";

export interface PowerFormData {
  attributes?: Partial<Attributes>;
  abilities?: Ability[];
  plots?: Plot[];
  notes?: string;
  stat_mods?: Partial<Stats>;
  defense_items?: DefenseItem[];
}

export interface DefenseItem {
  id: string;
  nome: string;
  bonus: number;
  rd: number;
  peso: number;
}

export interface SheetData {
  id: string;
  owner_id: string;
  owner_email?: string;
  name: string;
  occupation: string;
  age: string;
  brand: string;
  origin: string;
  motivation: string;
  exposure: number;
  equilibrium: number;
  drift: number;
  attributes: Attributes;
  stats: Stats;
  condition: string;
  conditions: Conditions;
  dying: number;
  going_insane: number;
  skill_bonus: string;
  skills: Record<string, number>;
  weapons: Weapon[];
  inventory: InventoryItem[];
  inventory_capacity: number;
  abilities: Ability[];
  plots: Plot[];
  fragments: number;
  pm_spent: number;
  stat_upgrades: StatUpgrades;
  purchased_skills: string[];
  notes: string;
  description: Description;
  identity_data: IdentityData;
  power_form_enabled: boolean;
  power_form_data: PowerFormData;
  fragments_items: FragmentItem[];
  defense_items: DefenseItem[];
  initial_skill_degrees: InitialSkillDegrees;
  weapon_proficiency: WeaponProficiency;
  weapon_proficiency_family: WeaponProficiencyFamily;
}
export type SheetUpdate = <K extends keyof SheetData>(key: K, value: SheetData[K]) => void;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
export function clampCurrent(v: number, max: number): number {
  return clamp(Math.round(v), 0, Math.max(0, max));
}
export function clampMod(v: number): number {
  return clamp(Math.round(v), -100, 150);
}
export function tierFromBonus(b: number): 0 | 1 | 2 | 3 {
  if (b >= 9) return 3;
  if (b >= 6) return 2;
  if (b >= 3) return 1;
  return 0;
}
