import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// (Dialog imports removed — Power Form now lives in /sheet/$id/power route)

import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Minus,
  Trash,
  Sparkles,
  Gem,
  ArrowUp,
  Shield,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  IdCard,
  GitBranch,
  ScrollText,
  Activity,
  Compass,
  Gauge,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import {
  type Attributes,
  type Stats,
  type Conditions,
  type StatUpgrades,
  type Weapon,
  type InventoryItem,
  type Ability,
  type Plot,
  type RankRow,
  type SkillBranch,
  type UpgradeCosts,
  type ConditionOptionsMap,
  type ConditionKey,
  type Description,
  type FragmentItem,
  type IdentityData,
  type LifeCycleTrait,
  type LinkState,
  type InitialSkillDegrees,
  type WeaponProficiency,
  type WeaponProficiencyFamily,
  SKILL_GROUPS,
  getRankBase,
  calcTotalPM,
  calculatePMSpent,
  calculateSheetMaximums,
  attributePointBudget,
  attributePointsUsed,
  attributeValueCap,
  genId,
  inferInitialSkillDegrees,
  normalizeConditions,
  weaponProficiencyMinimumRank,
  weaponProficiencySpend,
  WEAPON_PROFICIENCIES,
  DEFAULT_TRAINING_COSTS,
  DEFAULT_UPGRADE_COSTS,
  DEFAULT_CONDITION_OPTIONS,
  CONDITION_META,
  getEquilibriumEffect,
  DEFAULT_IDENTITY_DATA,
  CANONICAL_RANK_TABLE,
} from "@/lib/sheet-types";
import { CANONICAL_SKILL_BRANCHES } from "@/lib/master-data";
import { AddItemDialog } from "@/components/sheet/add-item-dialog";
import { SkillTreeTab } from "@/components/sheet/skill-tree";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSerializedAutosave } from "@/lib/use-serialized-autosave";
import { can } from "@/lib/permissions";
import { cacheSheet } from "@/lib/offline-cache";
import { BrandMark } from "@/components/brand-mark";
import { SaveStatus } from "@/components/save-status";
import { ResistanceDtCalculator } from "@/components/master/resistance-dt-calculator";
import "@/styles/sheet-premium.css";

const LIFE_CYCLE_TRAITS: LifeCycleTrait[] = [
  "Formação recente",
  "Corpo habituado",
  "Nome reconhecido",
  "Experiência acumulada",
  "Responsabilidades",
  "Cicatriz antiga",
];

const LINK_STATES: LinkState[] = [
  "Presente",
  "Tensionado",
  "Ferido",
  "Rompido",
  "Costurado",
];
type SheetView = "ficha" | "arvore" | "descricao";

const AttributeRadar = lazy(() => import("@/components/sheet/attribute-radar"));

const SHEET_TUTORIAL_STEPS = [
  {
    title: "Comece pela identidade",
    detail:
      "Registre origem, motivação e vínculos. Esses campos preservam o fio narrativo sem impor uma escolha mecânica.",
  },
  {
    title: "Distribua Atributos e leia os Pontos",
    detail:
      "O orçamento, os limites do Rank e a Defesa são calculados pela ficha. Os botões só permitem valores dentro das regras.",
  },
  {
    title: "Escolha Perícias e equipamento",
    detail:
      "Treinamento, armas, inventário e proteções ficam na aba Ficha. Equipamentos de Defesa podem ser recolhidos.",
  },
  {
    title: "Abra a Árvore de Habilidades",
    detail:
      "A aba Árvore mostra apenas os Tiers liberados pelo Rank. Cada Tier pode ser recolhido sem perder escolhas.",
  },
  {
    title: "Acompanhe o salvamento",
    detail:
      "O indicador no topo mostra alterações pendentes, salvamento, modo offline ou erro. Você pode salvar manualmente a qualquer momento.",
  },
] as const;

const TRAINING_TIERS = [
  { tier: 1, name: "Iniciado", bonus: 3 },
  { tier: 2, name: "Apurado", bonus: 6 },
  { tier: 3, name: "Versado", bonus: 9 },
] as const;

const SECTION_PRESENTATION: Record<string, { index: string; kicker: string }> =
  {
    "sec-info": { index: "01", kicker: "Identidade e continuidade" },
    "sec-attr": { index: "02", kicker: "Matriz de potencial" },
    "sec-pontos": { index: "03", kicker: "Recursos e proteção" },
    equilibrio: { index: "04", kicker: "Estado de tensão" },
    exposicao: { index: "05", kicker: "Progressão de contato" },
    condicoes: { index: "06", kicker: "Pressões em curso" },
    "sec-pericias": { index: "07", kicker: "Competências treinadas" },
    "sec-armas": { index: "08", kicker: "Arsenal operacional" },
    "sec-inv": { index: "09", kicker: "Carga e recursos" },
    "sec-hab": { index: "10", kicker: "Repertório adquirido" },
    "tramas-fragmentos": { index: "11", kicker: "Fenômenos e manifestações" },
    "sec-notas": { index: "12", kicker: "Registro de campo" },
  };
function tierFromBonus(b: number): 0 | 1 | 2 | 3 {
  if (b >= 9) return 3;
  if (b >= 6) return 2;
  if (b >= 3) return 1;
  return 0;
}

export const Route = createFileRoute("/sheet/$id")({
  head: () => ({
    meta: [
      { title: "Ficha de Personagem · Tadeon Nexus" },
      {
        name: "description",
        content:
          "Editor de ficha de personagem do Tadeon Nexus: atributos, perícias, habilidades, inventário, defesa e árvore de progressão.",
      },
      { property: "og:title", content: "Ficha de Personagem · Tadeon Nexus" },
      {
        property: "og:description",
        content:
          "Editor de ficha de personagem do Tadeon Nexus: atributos, perícias, habilidades, inventário, defesa e árvore de progressão.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://tadeon-nexus.gtadeusz.workers.dev/" },
    ],
  }),

  component: () => (
    <ProtectedShell>
      <SheetPage />
    </ProtectedShell>
  ),
});

interface PowerFormData {
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

interface SheetData {
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

const RANGE_OPTIONS = ["Engajado", "Próximo", "Distante", "Longo", "Extremo"];
const PLOT_RANGE_OPTIONS = ["Pessoal", "Curto", "Médio", "Longo", "Extremo"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function clampCurrent(v: number, max: number): number {
  return clamp(Math.round(v), 0, Math.max(0, max));
}
function clampMod(v: number): number {
  return clamp(Math.round(v), -100, 150);
}
function clampArmor(v: number): number {
  return clamp(Math.round(v), 0, 25);
}

// Equilibrium color from -10 (dark red) → 0 (deep green) → +10 (near white yellow)
function equilibriumColor(value: number): string {
  const v = clamp(value, -10, 10);
  if (v === 0) return "hsl(140, 70%, 22%)"; // deep green at perfect balance
  if (v < 0) {
    const t = (v + 10) / 10; // 0..1
    const l = 18 + t * 32;
    return `hsl(0, 75%, ${l}%)`;
  }
  const t = v / 10;
  const l = 55 + t * 40;
  const s = 95 - t * 25;
  return `hsl(50, ${s}%, ${l}%)`;
}

function SheetPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [branches, setBranches] = useState<SkillBranch[]>([]);
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(
    DEFAULT_UPGRADE_COSTS,
  );
  const [conditionOptions, setConditionOptions] = useState<ConditionOptionsMap>(
    DEFAULT_CONDITION_OPTIONS,
  );
  const [sheetSkillGroups, setSheetSkillGroups] = useState<typeof SKILL_GROUPS>(
    [],
  );
  const [trainingCosts, setTrainingCosts] = useState<[number, number, number]>(
    DEFAULT_TRAINING_COSTS,
  );
  // (removed setPowerFormOpen — Power Form opens via dedicated route)
  const [fragmentsView, setFragmentsView] = useState(false);
  const [defEquipOpen, setDefEquipOpen] = useState(false);
  const [openSkill, setOpenSkill] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [sheetView, setSheetView] = useState<SheetView>(() => {
    if (typeof window === "undefined") return "ficha";
    const saved = window.sessionStorage.getItem(`tadeon-sheet-view:${id}`);
    return saved === "arvore" || saved === "descricao" ? saved : "ficha";
  });

  useEffect(() => {
    window.sessionStorage.setItem(`tadeon-sheet-view:${id}`, sheetView);
  }, [id, sheetView]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `tadeon-sheet-tutorial:${id}`;
    if (window.sessionStorage.getItem(key) !== "1") return;
    window.sessionStorage.removeItem(key);
    setTutorialStep(0);
  }, [id]);

  const canEdit = can("character:edit", {
    appRole: role,
    currentUserId: user?.id,
    resourceOwnerId: sheet?.owner_id,
  });

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settingsJson }] = await Promise.all([
        supabase
          .from("character_sheets")
          .select("*")
          .eq("id", id)
          .maybeSingle(),
        // Use SECURITY DEFINER RPC: returns only player-safe fields, so jogadores/espectadores
        // cannot read NPCs/clues/scenes from the master settings table.
        supabase.rpc("get_public_game_settings"),
      ]);
      if (error || !data) {
        toast.error("Ficha não encontrada.");
        void navigate({ to: "/" });
        return;
      }
      const raw = data as unknown as Record<string, unknown>;
      const desc = (raw.description as Description | null) ?? {
        historia: "",
        personalidade: "",
        objetivos: "",
        observacoes: "",
      };
      const pfData = (raw.power_form_data as PowerFormData | null) ?? {};
      const fragItems = (
        (raw.fragments_items as FragmentItem[] | null) ?? []
      ).map((item) => ({
        ...item,
        categoria: item.categoria ?? "I",
        selo: item.selo ?? "Não selado",
        integridade: Number(item.integridade ?? 0),
        limiteSeguro: item.limiteSeguro ?? "Repuxo",
      }));
      const defItems = (
        (raw.defense_items as Partial<DefenseItem>[] | null) ?? []
      ).map((item) => ({
        id: item.id ?? genId(),
        nome: item.nome ?? "",
        bonus: Number(item.bonus ?? 0),
        rd: Number(item.rd ?? 0),
        peso: Number(item.peso ?? 0),
      }));
      const rawIdentity =
        (raw.identity_data as Partial<IdentityData> | null) ?? {};
      const identityData: IdentityData = {
        ...DEFAULT_IDENTITY_DATA,
        ...rawIdentity,
        conviction: rawIdentity.conviction ?? String(raw.motivation ?? ""),
        links: (rawIdentity.links?.length
          ? rawIdentity.links
          : DEFAULT_IDENTITY_DATA.links
        ).map((link, index) => ({
          id: link.id || `link-${index + 1}`,
          name: link.name ?? "",
          relation: link.relation ?? "",
          state: link.state ?? "Presente",
        })),
      };
      const loadedSkills = ((raw.skills as Record<string, number> | null) ??
        {}) as Record<string, number>;
      const storedInitialDegrees =
        (raw.initial_skill_degrees as InitialSkillDegrees | null) ?? {};
      const initialSkillDegrees = Object.keys(storedInitialDegrees).length
        ? storedInitialDegrees
        : inferInitialSkillDegrees(loadedSkills);
      const storedProficiency =
        raw.weapon_proficiency as WeaponProficiency | null;
      const weaponProficiency = WEAPON_PROFICIENCIES.includes(
        storedProficiency as WeaponProficiency,
      )
        ? (storedProficiency as WeaponProficiency)
        : "operador";
      const storedFamily =
        raw.weapon_proficiency_family as WeaponProficiencyFamily | null;
      setSheet({
        ...(data as unknown as SheetData),
        drift: Number(raw.drift ?? 0),
        stats: {
          ...((raw.stats as Stats | null) ?? {}),
          pa_current: Number((raw.stats as Stats | null)?.pa_current ?? 0),
          pa_mod: Number((raw.stats as Stats | null)?.pa_mod ?? 0),
        } as Stats,
        conditions: normalizeConditions(raw.conditions),
        description: desc,
        identity_data: identityData,
        power_form_enabled: Boolean(raw.power_form_enabled),
        power_form_data: pfData,
        fragments_items: fragItems,
        defense_items: defItems,
        skills: loadedSkills,
        initial_skill_degrees: initialSkillDegrees,
        weapon_proficiency: weaponProficiency,
        weapon_proficiency_family:
          storedFamily === "Contato" || storedFamily === "Projeção"
            ? storedFamily
            : "",
      });

      const settings =
        (settingsJson as unknown as Record<string, unknown> | null) ?? {};
      const configuredRanks =
        (settings.rank_table as RankRow[] | undefined) ?? [];
      const configuredBranches =
        (settings.skill_branches as SkillBranch[] | undefined) ?? [];
      const finalRulesConfigured =
        configuredRanks[0]?.def === 10 &&
        configuredRanks.at(-1)?.pm === 170 &&
        configuredBranches.length === 4 &&
        configuredBranches.every((branch) => branch.nodes.length === 24);
      setRankTable(
        finalRulesConfigured ? configuredRanks : CANONICAL_RANK_TABLE,
      );
      setBranches(
        finalRulesConfigured ? configuredBranches : CANONICAL_SKILL_BRANCHES,
      );
      setUpgradeCosts(
        finalRulesConfigured
          ? ((settings.upgrade_costs as UpgradeCosts | undefined) ??
              DEFAULT_UPGRADE_COSTS)
          : DEFAULT_UPGRADE_COSTS,
      );
      setConditionOptions(
        finalRulesConfigured
          ? ((settings.condition_options as ConditionOptionsMap | undefined) ??
              DEFAULT_CONDITION_OPTIONS)
          : DEFAULT_CONDITION_OPTIONS,
      );
      setSheetSkillGroups(
        finalRulesConfigured
          ? ((settings.skill_groups as typeof SKILL_GROUPS | undefined) ??
              SKILL_GROUPS)
          : SKILL_GROUPS,
      );
      const training = settings.skill_training_costs as number[] | undefined;
      if (finalRulesConfigured && training && training.length >= 3)
        setTrainingCosts([training[0], training[1], training[2]]);
      setLoading(false);
    })();
  }, [id, navigate]);

  const {
    dirty,
    lastSavedAt,
    saveError,
    saveNow: doSave,
    saving,
  } = useSerializedAutosave({
    value: sheet,
    enabled: canEdit,
    delay: 1500,
    save: async (currentSheet) => {
      const { id: sheetId, ...payload } = currentSheet;
      const { error } = await supabase
        .from("character_sheets")
        .update(payload as never)
        .eq("id", sheetId);
      if (error) throw error;
    },
  });

  useEffect(() => {
    if (saveError) toast.error(saveError);
  }, [saveError]);

  useEffect(() => {
    if (!sheet) return;
    const timer = window.setTimeout(() => cacheSheet(sheet), 600);
    return () => window.clearTimeout(timer);
  }, [sheet]);

  // Keep numeric `fragments` field in sync with the fragments list length
  useEffect(() => {
    if (!sheet) return;
    const len = sheet.fragments_items.length;
    if (sheet.fragments !== len) {
      setSheet((p) => (p ? { ...p, fragments: len } : p));
    }
  }, [sheet]);

  const activeBranches = branches.length ? branches : CANONICAL_SKILL_BRANCHES;
  const calculatedPmSpent = useMemo(() => {
    if (!sheet) return 0;
    return calculatePMSpent({
      statUpgrades: sheet.stat_upgrades,
      skills: sheet.skills,
      purchasedSkills: sheet.purchased_skills,
      branches: activeBranches,
      upgradeCosts,
      trainingCosts,
      initialSkillDegrees: sheet.initial_skill_degrees,
      weaponProficiency: sheet.weapon_proficiency,
    });
  }, [activeBranches, sheet, trainingCosts, upgradeCosts]);

  useEffect(() => {
    if (!sheet || sheet.pm_spent === calculatedPmSpent) return;
    setSheet((previous) =>
      previous ? { ...previous, pm_spent: calculatedPmSpent } : previous,
    );
  }, [calculatedPmSpent, sheet]);

  const update = <K extends keyof SheetData>(key: K, value: SheetData[K]) => {
    setSheet((p) => (p ? { ...p, [key]: value } : p));
  };

  const addDirectionalTension = (direction: -1 | 1) => {
    if (!sheet) return;
    const next = sheet.drift + direction;
    if (next > -4 && next < 4) {
      update("drift", next);
      return;
    }
    const shiftedEquilibrium = clamp(
      (sheet.equilibrium || 0) + direction,
      -10,
      10,
    );
    if (role !== "mestre" && Math.abs(shiftedEquilibrium) > 5) {
      toast.error(
        "Ultrapassar ±5 exige uma fonte excepcional confirmada pelo mestre.",
      );
      return;
    }
    setSheet((previous) =>
      previous
        ? {
            ...previous,
            equilibrium: shiftedEquilibrium,
            drift: 0,
          }
        : previous,
    );
    toast.info(
      direction < 0
        ? "Tensão atingiu −4: o Equilíbrio moveu 1 ponto para o Medo."
        : "Tensão atingiu +4: o Equilíbrio moveu 1 ponto para o Conhecimento.",
    );
  };

  const radarData = useMemo(() => {
    if (!sheet) return [];
    return (Object.keys(sheet.attributes) as (keyof Attributes)[]).map((k) => ({
      attr: k,
      value: sheet.attributes[k],
    }));
  }, [sheet]);

  // Active conditions for colored border
  const activeConditions = useMemo(() => {
    if (!sheet) return [] as ConditionKey[];
    return (Object.keys(CONDITION_META) as ConditionKey[]).filter(
      (k) => sheet.conditions[k].length > 0,
    );
  }, [sheet]);

  const borderShadow = useMemo(() => {
    const layers: string[] = [];
    activeConditions.forEach((k, i) => {
      layers.push(`0 0 ${10 + i * 4}px 0 rgba(${CONDITION_META[k].rgb}, 0.55)`);
    });
    const dying = sheet?.dying ?? 0;
    if (dying > 0) {
      const intensity = 0.4 + dying * 0.2;
      const blur = 14 + dying * 10;
      layers.push(`0 0 ${blur}px ${2 + dying}px rgba(120, 0, 0, ${intensity})`);
      layers.push(
        `0 0 ${blur + 6}px ${1 + dying}px rgba(0, 0, 0, ${Math.min(0.9, intensity + 0.1)})`,
      );
    }
    const insane = sheet?.going_insane ?? 0;
    if (insane > 0) {
      const intensity = 0.35 + insane * 0.2;
      const blur = 14 + insane * 10;
      layers.push(
        `0 0 ${blur}px ${2 + insane}px rgba(255, 245, 180, ${intensity})`,
      );
      layers.push(
        `0 0 ${blur + 8}px ${1 + insane}px rgba(255, 255, 255, ${Math.min(0.85, intensity)})`,
      );
    }
    return layers.length ? layers.join(", ") : undefined;
  }, [activeConditions, sheet?.dying, sheet?.going_insane]);

  const conditionAura = useMemo(
    () =>
      activeConditions
        .map(
          (key, index) =>
            `radial-gradient(circle at ${18 + (index % 3) * 32}% 0%, rgba(${CONDITION_META[key].rgb}, 0.18), transparent 34%)`,
        )
        .join(", "),
    [activeConditions],
  );

  if (loading || !sheet) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const attrs = sheet.attributes;
  const base = getRankBase(sheet.exposure, rankTable);
  const upg = sheet.stat_upgrades;
  const armorRaw = Math.max(
    0,
    ...sheet.defense_items.map((item) => Number(item.bonus) || 0),
  );
  const armorTotal = Math.min(3, armorRaw);
  const armorRd = Math.min(
    2,
    Math.max(0, ...sheet.defense_items.map((item) => Number(item.rd) || 0)),
  );
  const maximums = calculateSheetMaximums({
    attributes: attrs,
    stats: sheet.stats,
    upgrades: upg,
    rank: base,
    armor: armorTotal,
  });
  const {
    pv: pvMax,
    ps: psMax,
    pe: peMax,
    pa: paMax,
    def: defTotal,
  } = maximums;
  const invCapacity = 5 + 2 * attrs.COR;
  const invUsed =
    sheet.weapons.reduce((s, w) => s + (Number(w.espaco ?? w.peso) || 0), 0) +
    sheet.inventory.reduce((s, i) => s + (Number(i.espaco) || 0), 0) +
    sheet.fragments_items.reduce((s, i) => s + (Number(i.espaco) || 0), 0) +
    sheet.defense_items.reduce((s, d) => s + (Number(d.peso) || 0), 0);

  const trainingUsed = Object.values(sheet.skills || {}).reduce(
    (sum, value) => sum + tierFromBonus(Number(value) || 0),
    0,
  );
  const initialTrainingUsed = Object.values(
    sheet.initial_skill_degrees || {},
  ).reduce(
    (sum, value) => sum + Math.max(0, Math.min(2, Math.floor(value || 0))),
    0,
  );
  const initialTrainingRemaining = Math.max(0, 7 - initialTrainingUsed);
  const pmAvailable =
    calcTotalPM(sheet.exposure, rankTable) - calculatedPmSpent;
  const attributeBudget = attributePointBudget(base.rank);
  const attributeUsed = attributePointsUsed(attrs);
  const attributeRemaining = attributeBudget - attributeUsed;
  const attributeCap = attributeValueCap(base.rank);
  const zeroAttributes = Object.values(attrs).filter(
    (value) => value === 0,
  ).length;
  const attributesOverCap = (Object.keys(attrs) as (keyof Attributes)[]).filter(
    (key) => attrs[key] > attributeCap,
  );

  const skillGroups = sheetSkillGroups.length ? sheetSkillGroups : SKILL_GROUPS;
  const sectionAnchors: { id: string; label: string }[] = [
    { id: "sec-info", label: "Identidade" },
    { id: "sec-attr", label: "Atributos" },
    { id: "sec-pontos", label: "Pontos" },
    { id: "sec-pericias", label: "Perícias" },
    { id: "sec-inv", label: "Inventário" },
    { id: "sec-armas", label: "Armas" },
    { id: "sec-hab", label: "Habilidades" },
    { id: "sec-notas", label: "Anotações" },
  ];
  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const equilibrium = clamp(Math.round(sheet.equilibrium || 0), -10, 10);
  const equilibriumPct = ((equilibrium + 10) / 20) * 100;
  const equilibriumEffect = getEquilibriumEffect(equilibrium);
  const tutorial =
    tutorialStep === null ? null : SHEET_TUTORIAL_STEPS[tutorialStep];

  return (
    <div className="tadeon-page tadeon-sheet-page pb-28">
      {/* Sticky Header */}
      <div className="tadeon-sheet-commandbar">
        <div className="tadeon-sheet-commandbar__main">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            aria-label="Voltar ao painel"
            className="tadeon-sheet-commandbar__back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <BrandMark className="hidden h-9 w-9 shrink-0 text-primary sm:block" />
          <div className="tadeon-sheet-commandbar__identity">
            <p className="tadeon-eyebrow hidden sm:block">
              Ficha de continuidade
            </p>
            <h1 className="truncate font-cinzel text-lg font-semibold leading-tight md:text-2xl">
              {sheet.name || "Ficha"}
            </h1>
          </div>
          {!canEdit && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              somente leitura
            </span>
          )}
          {canEdit && (
            <div className="tadeon-sheet-commandbar__actions">
              <SaveStatus
                state={
                  typeof navigator !== "undefined" && !navigator.onLine
                    ? "offline"
                    : saving
                      ? "saving"
                      : saveError
                        ? "error"
                        : dirty
                          ? "pending"
                          : "saved"
                }
                savedAt={lastSavedAt}
                onRetry={() => void doSave()}
                compact={
                  typeof window !== "undefined" && window.innerWidth < 640
                }
              />
              {sheet.power_form_enabled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (await doSave()) {
                      void navigate({
                        to: "/sheet/$id/power",
                        params: { id: sheet.id },
                      });
                    }
                  }}
                  className="tadeon-sheet-power-button gap-1.5 border-orange-400/60 font-bold tracking-widest text-orange-300 shadow-[0_0_15px_-5px_rgba(255,140,60,0.7)] hover:bg-orange-500/15"
                  title="Abrir Forma de Poder (VP)"
                >
                  <Sparkles className="w-4 h-4" /> VP
                </Button>
              )}
              <Button
                size="sm"
                onClick={doSave}
                className="tadeon-sheet-save-button gap-1.5"
              >
                <Save className="w-4 h-4" />{" "}
                <span className="hidden sm:inline">Salvar</span>
              </Button>
            </div>
          )}
        </div>
        {activeConditions.length > 0 && (
          <div
            className="tadeon-sheet-condition-rail"
            aria-label="Condições ativas"
          >
            {activeConditions.map((key) => {
              const meta = CONDITION_META[key];
              return (
                <span
                  key={key}
                  className="tadeon-sheet-condition-chip"
                  style={{
                    borderColor: meta.color,
                    color: meta.color,
                    background: `linear-gradient(135deg, rgba(${meta.rgb}, 0.28), rgba(${meta.rgb}, 0.08))`,
                    boxShadow: `inset 0 0 12px rgba(${meta.rgb}, 0.16), 0 0 10px rgba(${meta.rgb}, 0.2)`,
                  }}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: meta.color,
                      boxShadow: `0 0 7px rgba(${meta.rgb}, 0.9)`,
                    }}
                  />
                  {meta.label}: {sheet.conditions[key].join(", ")}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {tutorial && (
        <Card
          className="tadeon-sheet-tutorial mb-4 border-primary/40 bg-[linear-gradient(135deg,rgba(116,36,45,.16),rgba(217,215,164,.05))] p-4"
          role="dialog"
          aria-label="Guia opcional da ficha"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="tadeon-eyebrow">
                Guia da ficha · etapa {(tutorialStep ?? 0) + 1} de{" "}
                {SHEET_TUTORIAL_STEPS.length}
              </p>
              <h2 className="mt-1 font-cinzel text-lg font-semibold">
                {tutorial.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tutorial.detail}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTutorialStep(null)}
              >
                Encerrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={tutorialStep === 0}
                onClick={() =>
                  setTutorialStep((step) => Math.max(0, (step ?? 0) - 1))
                }
              >
                Anterior
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setTutorialStep((step) =>
                    (step ?? 0) >= SHEET_TUTORIAL_STEPS.length - 1
                      ? null
                      : (step ?? 0) + 1,
                  )
                }
              >
                {(tutorialStep ?? 0) >= SHEET_TUTORIAL_STEPS.length - 1
                  ? "Concluir"
                  : "Próxima"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div
        className="tadeon-sheet-frame rounded-2xl transition-[box-shadow] duration-200 ease-[var(--ease-out)]"
        style={{
          backgroundImage: conditionAura || undefined,
          boxShadow: borderShadow,
          padding: borderShadow ? "3px" : 0,
        }}
      >
        <Tabs
          value={sheetView}
          onValueChange={(value) => setSheetView(value as SheetView)}
          className="tadeon-sheet-tabs space-y-4"
        >
          <TabsList className="tadeon-sheet-tabs-list w-full md:w-auto">
            <TabsTrigger value="ficha" className="flex-1 gap-2 md:flex-initial">
              <IdCard className="h-4 w-4" aria-hidden="true" />
              <span>Ficha</span>
            </TabsTrigger>
            <TabsTrigger
              value="arvore"
              className="flex-1 gap-2 md:flex-initial"
            >
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              <span>Árvore</span>
            </TabsTrigger>
            <TabsTrigger
              value="descricao"
              className="flex-1 gap-2 md:flex-initial"
            >
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              <span>Descrição</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ficha" className="mt-0 space-y-4">
            {/* Quick jump shortcuts */}
            <nav
              className="tadeon-sheet-jumpbar"
              aria-label="Ir para uma seção da ficha"
            >
              {sectionAnchors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => jumpTo(a.id)}
                  className="tadeon-sheet-jump"
                >
                  {a.label}
                </button>
              ))}
            </nav>
            <div className="tadeon-sheet-overview" aria-label="Resumo da ficha">
              <OverviewMetric
                icon={<Compass aria-hidden="true" />}
                label="Patamar"
                value={String(base.rank)}
                detail={`${attributeUsed}/${attributeBudget} atributos`}
                tone="violet"
              />
              <OverviewMetric
                icon={<Shield aria-hidden="true" />}
                label="Defesa"
                value={String(defTotal)}
                detail={`RD ${armorRd} equipada`}
                tone="blue"
              />
              <OverviewMetric
                icon={<Activity aria-hidden="true" />}
                label="Equilíbrio"
                value={
                  equilibrium > 0 ? `+${equilibrium}` : String(equilibrium)
                }
                detail={equilibriumEffect.state}
                tone="amber"
              />
              <OverviewMetric
                icon={<Gauge aria-hidden="true" />}
                label="Exposição"
                value={`${sheet.exposure}%`}
                detail={`${activeConditions.length} condições ativas`}
                tone="red"
              />
            </div>

            <Section
              id="sec-info"
              title="Identidade"
              className="tadeon-identity-section"
            >
              <div className="tadeon-identity-lead">
                <div className="tadeon-identity-sigil" aria-hidden="true">
                  <IdCard />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="tadeon-eyebrow">Dossiê de continuidade</p>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                    Origem situa, Ocupação mostra prática, Convicção sustenta,
                    Limite interrompe, Ferida pressiona e Marca registra o que
                    já mudou.
                  </p>
                </div>
                <div className="tadeon-identity-link-count">
                  <Link2 aria-hidden="true" />
                  <span>{sheet.identity_data.links.length}</span>
                  <small>vínculos</small>
                </div>
              </div>

              <div className="tadeon-identity-foundation">
                <Field
                  className="tadeon-identity-field--name"
                  label="Nome"
                  value={sheet.name}
                  onChange={(v) => update("name", v)}
                  disabled={!canEdit}
                />
                <Field
                  label="Ocupação"
                  value={sheet.occupation}
                  onChange={(v) => update("occupation", v)}
                  disabled={!canEdit}
                />
                <Field
                  label="Origem"
                  value={sheet.origin}
                  onChange={(v) => update("origin", v)}
                  disabled={!canEdit}
                />
                <Field
                  label="Marca"
                  value={sheet.brand}
                  onChange={(v) => update("brand", v)}
                  disabled={!canEdit}
                />
              </div>

              <div
                className="tadeon-identity-axis"
                aria-label="Núcleo narrativo"
              >
                <Field
                  className="tadeon-identity-axis__field"
                  label="Convicção"
                  value={sheet.identity_data.conviction}
                  onChange={(value) =>
                    update("identity_data", {
                      ...sheet.identity_data,
                      conviction: value,
                    })
                  }
                  disabled={!canEdit}
                />
                <Field
                  className="tadeon-identity-axis__field"
                  label="Limite"
                  value={sheet.identity_data.limit}
                  onChange={(value) =>
                    update("identity_data", {
                      ...sheet.identity_data,
                      limit: value,
                    })
                  }
                  disabled={!canEdit}
                />
                <Field
                  className="tadeon-identity-axis__field"
                  label="Ferida"
                  value={sheet.identity_data.wound}
                  onChange={(value) =>
                    update("identity_data", {
                      ...sheet.identity_data,
                      wound: value,
                    })
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="tadeon-identity-details">
                <div className="tadeon-identity-question-panel">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider">
                      Traço do ciclo de vida
                    </Label>
                    <Select
                      value={sheet.identity_data.lifeCycleTrait || undefined}
                      disabled={!canEdit}
                      onValueChange={(value) =>
                        update("identity_data", {
                          ...sheet.identity_data,
                          lifeCycleTrait: value as LifeCycleTrait,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Escolha um traço" />
                      </SelectTrigger>
                      <SelectContent>
                        {LIFE_CYCLE_TRAITS.map((trait) => (
                          <SelectItem key={trait} value={trait}>
                            {trait}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider">
                      Pergunta
                    </Label>
                    <Textarea
                      rows={3}
                      disabled={!canEdit}
                      value={sheet.identity_data.question}
                      onChange={(event) =>
                        update("identity_data", {
                          ...sheet.identity_data,
                          question: event.target.value,
                        })
                      }
                      placeholder="Que pergunta ainda organiza esta personagem?"
                    />
                  </div>
                </div>
                <div className="tadeon-link-panel">
                  <div className="tadeon-link-panel__heading">
                    <div>
                      <p className="tadeon-eyebrow">Vínculos</p>
                      <p className="text-xs text-muted-foreground">
                        Relações que sustentam, tensionam ou transformam a
                        personagem.
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="tadeon-link-add gap-1.5"
                        onClick={() =>
                          update("identity_data", {
                            ...sheet.identity_data,
                            links: [
                              ...sheet.identity_data.links,
                              {
                                id: genId(),
                                name: "",
                                relation: "",
                                state: "Presente",
                              },
                            ],
                          })
                        }
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Novo vínculo
                      </Button>
                    )}
                  </div>
                  <div className="tadeon-link-list">
                    {sheet.identity_data.links.map((link, index) => (
                      <div key={link.id} className="tadeon-link-row">
                        <span
                          className="tadeon-link-row__number"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <Input
                          className="tadeon-link-row__name"
                          disabled={!canEdit}
                          value={link.name}
                          placeholder={`Vínculo ${index + 1}`}
                          aria-label={`Nome do vínculo ${index + 1}`}
                          onChange={(event) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = {
                              ...link,
                              name: event.target.value,
                            };
                            update("identity_data", {
                              ...sheet.identity_data,
                              links,
                            });
                          }}
                        />
                        <Input
                          className="tadeon-link-row__relation"
                          disabled={!canEdit}
                          value={link.relation}
                          placeholder="Natureza da relação"
                          aria-label={`Relação do vínculo ${index + 1}`}
                          onChange={(event) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = {
                              ...link,
                              relation: event.target.value,
                            };
                            update("identity_data", {
                              ...sheet.identity_data,
                              links,
                            });
                          }}
                        />
                        <Select
                          value={link.state}
                          disabled={!canEdit}
                          onValueChange={(value) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = {
                              ...link,
                              state: value as LinkState,
                            };
                            update("identity_data", {
                              ...sheet.identity_data,
                              links,
                            });
                          }}
                        >
                          <SelectTrigger
                            className="tadeon-link-row__state"
                            aria-label={`Estado do vínculo ${index + 1}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LINK_STATES.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {canEdit && sheet.identity_data.links.length > 2 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="tadeon-link-row__remove text-muted-foreground hover:text-destructive"
                            aria-label={`Remover vínculo ${index + 1}`}
                            onClick={() =>
                              update("identity_data", {
                                ...sheet.identity_data,
                                links: sheet.identity_data.links.filter(
                                  (item) => item.id !== link.id,
                                ),
                              })
                            }
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            {/* Attributes (with radar) + Vital points */}
            <div className="tadeon-sheet-core-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Section
                id="sec-attr"
                title="Atributos"
                className="tadeon-core-panel tadeon-attributes-panel"
                extra={
                  <span
                    className={`tadeon-attribute-budget rounded-full border px-2 py-0.5 text-[10px] ${
                      attributeRemaining < 0 || attributesOverCap.length > 0
                        ? "border-destructive/60 text-destructive"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {attributeUsed}/{attributeBudget} pontos · máx.{" "}
                    {attributeCap}
                  </span>
                }
              >
                {(attributeRemaining < 0 || attributesOverCap.length > 0) && (
                  <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                    {attributeRemaining < 0
                      ? `A ficha excede o orçamento deste Rank em ${Math.abs(attributeRemaining)} ponto(s). `
                      : ""}
                    {attributesOverCap.length > 0
                      ? `${attributesOverCap.join(", ")} excede(m) o máximo ${attributeCap}. `
                      : ""}
                    Reduza Atributos para voltar à faixa válida.
                  </p>
                )}
                <div className="space-y-4">
                  <div
                    className="tadeon-attribute-grid grid grid-cols-2 gap-2 sm:grid-cols-3"
                    role="group"
                    aria-label="Distribuição dos atributos"
                  >
                    {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => {
                      const wouldCreateSecondZero =
                        attrs[k] === 1 && zeroAttributes >= 1;
                      return (
                        <div
                          key={k}
                          data-attribute={k}
                          className="tadeon-attribute-tile min-h-14 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2"
                        >
                          <span className="tadeon-attribute-tile__label font-cinzel text-sm">
                            {k}
                          </span>
                          <div className="tadeon-attribute-tile__controls">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="tadeon-stepper-button h-9 w-9 p-0"
                              disabled={
                                !canEdit ||
                                attrs[k] <= 0 ||
                                wouldCreateSecondZero
                              }
                              aria-label={`Diminuir ${k}`}
                              title={
                                wouldCreateSecondZero
                                  ? "Apenas um Atributo pode ser reduzido a 0"
                                  : undefined
                              }
                              onClick={() =>
                                update("attributes", {
                                  ...attrs,
                                  [k]: Math.max(0, attrs[k] - 1),
                                })
                              }
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <output
                              className="tadeon-attribute-tile__value"
                              aria-label={`${k}: ${attrs[k]}`}
                            >
                              {attrs[k]}
                            </output>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="tadeon-stepper-button h-9 w-9 p-0"
                              disabled={
                                !canEdit ||
                                attrs[k] >= attributeCap ||
                                attributeRemaining <= 0
                              }
                              aria-label={`Aumentar ${k}`}
                              title={
                                attrs[k] >= attributeCap
                                  ? `Máximo ${attributeCap} neste Rank`
                                  : attributeRemaining <= 0
                                    ? "Orçamento de Atributos esgotado"
                                    : undefined
                              }
                              onClick={() =>
                                update("attributes", {
                                  ...attrs,
                                  [k]: Math.min(attributeCap, attrs[k] + 1),
                                })
                              }
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
                    {attributeRemaining > 0
                      ? `${attributeRemaining} ponto(s) ainda disponível(is).`
                      : "Orçamento do Rank totalmente distribuído."}
                  </p>
                  <div className="tadeon-attribute-radar h-36 sm:h-52">
                    <Suspense
                      fallback={
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-20" />
                      }
                    >
                      <AttributeRadar
                        data={radarData}
                        color="#a855f7"
                        tickColor="#c084fc"
                      />
                    </Suspense>
                  </div>
                </div>
              </Section>

              <Section
                id="sec-pontos"
                title="Pontos Vitais"
                className="tadeon-core-panel tadeon-vitals-panel"
              >
                <div className="tadeon-vitals-grid grid grid-cols-2 gap-2.5">
                  <StatBlock
                    label="PV"
                    full="Vitalidade"
                    color="text-red-400"
                    barColor="from-red-600 to-red-400"
                    glowRgb="239,68,68"
                    current={sheet.stats.pv_current}
                    mod={sheet.stats.pv_mod}
                    max={pvMax}
                    disabled={!canEdit}
                    onCurrent={(v) =>
                      update("stats", {
                        ...sheet.stats,
                        pv_current: clampCurrent(v, pvMax),
                      })
                    }
                    onMod={(v) =>
                      update("stats", { ...sheet.stats, pv_mod: clampMod(v) })
                    }
                  />
                  <StatBlock
                    label="PE"
                    full="Energia"
                    color="text-emerald-400"
                    barColor="from-emerald-600 to-emerald-400"
                    glowRgb="16,185,129"
                    current={sheet.stats.pe_current}
                    mod={sheet.stats.pe_mod}
                    max={peMax}
                    disabled={!canEdit}
                    onCurrent={(v) =>
                      update("stats", {
                        ...sheet.stats,
                        pe_current: clampCurrent(v, peMax),
                      })
                    }
                    onMod={(v) =>
                      update("stats", { ...sheet.stats, pe_mod: clampMod(v) })
                    }
                  />
                  <StatBlock
                    label="PS"
                    full="Sanidade"
                    color="text-purple-400"
                    barColor="from-purple-600 to-purple-400"
                    glowRgb="168,85,247"
                    current={sheet.stats.ps_current}
                    mod={sheet.stats.ps_mod}
                    max={psMax}
                    disabled={!canEdit}
                    onCurrent={(v) =>
                      update("stats", {
                        ...sheet.stats,
                        ps_current: clampCurrent(v, psMax),
                      })
                    }
                    onMod={(v) =>
                      update("stats", { ...sheet.stats, ps_mod: clampMod(v) })
                    }
                  />
                  <StatBlock
                    label="PA"
                    full="Ancoragem"
                    color="text-amber-300"
                    barColor="from-amber-600 to-yellow-300"
                    glowRgb="245,158,11"
                    current={sheet.stats.pa_current}
                    mod={sheet.stats.pa_mod}
                    max={paMax}
                    disabled={!canEdit}
                    onCurrent={(v) =>
                      update("stats", {
                        ...sheet.stats,
                        pa_current: clampCurrent(v, paMax),
                      })
                    }
                    onMod={(v) =>
                      update("stats", { ...sheet.stats, pa_mod: clampMod(v) })
                    }
                  />

                  <Card className="tadeon-defense-card col-span-2 border-blue-500/30 bg-card/60 p-3 shadow-[0_0_22px_-12px_rgba(59,130,246,0.65)]">
                    <div className="tadeon-defense-card__summary">
                      <div className="tadeon-defense-card__score">
                        <Shield aria-hidden="true" strokeWidth={1.5} />
                        <span>{defTotal}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-cinzel text-sm font-bold text-blue-300">
                          Defesa
                        </div>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                          base {base.def} + INS {attrs.INS} + equip {armorTotal}
                          {armorRaw > 3 ? " (máx. 3)" : ""} + mod{" "}
                          {sheet.stats.def_mod}
                          {upg.def ? ` + apr ${upg.def}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="tadeon-defense-card__inputs grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-[10px]">Equip</Label>
                        <Input
                          type="number"
                          readOnly
                          tabIndex={-1}
                          value={armorTotal}
                          className="h-7 bg-muted/40 cursor-not-allowed"
                          title="Maior bônus entre as proteções registradas (máx. 3)"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Mod</Label>
                        <Input
                          type="number"
                          disabled={!canEdit}
                          value={sheet.stats.def_mod}
                          className="h-7"
                          onChange={(e) =>
                            update("stats", {
                              ...sheet.stats,
                              def_mod: clampMod(Number(e.target.value)),
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Equipamentos de defesa (retrátil, máx 3) */}
                    <div className="mt-3 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setDefEquipOpen((o) => !o)}
                        className="group mb-1.5 flex min-h-10 w-full items-center justify-between gap-2"
                        aria-expanded={defEquipOpen}
                        aria-controls="defense-equipment-panel"
                      >
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                          Equipamentos ({sheet.defense_items.length}/3)
                        </Label>
                        <ArrowUp
                          className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ease-[var(--ease-out)] ${defEquipOpen ? "" : "rotate-180"}`}
                        />
                      </button>
                      {defEquipOpen && (
                        <div id="defense-equipment-panel">
                          <div className="flex justify-end mb-1.5">
                            {canEdit && sheet.defense_items.length < 3 && (
                              <button
                                type="button"
                                onClick={() =>
                                  update("defense_items", [
                                    ...sheet.defense_items,
                                    {
                                      id: genId(),
                                      nome: "",
                                      bonus: 0,
                                      rd: 0,
                                      peso: 0,
                                    },
                                  ])
                                }
                                className="text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors"
                              >
                                <Plus className="w-3 h-3" /> Adicionar
                              </button>
                            )}
                          </div>
                          {sheet.defense_items.length === 0 ? (
                            <p className="text-[10px] italic text-muted-foreground text-center py-1">
                              Sem equipamentos.
                            </p>
                          ) : (
                            <RowTable
                              rows={sheet.defense_items}
                              canEdit={canEdit}
                              columns={[
                                { key: "nome", label: "Nome", flex: 1.5 },
                                {
                                  key: "bonus",
                                  label: "DEF",
                                  type: "number",
                                  width: 58,
                                },
                                {
                                  key: "rd",
                                  label: "RD",
                                  type: "number",
                                  width: 58,
                                },
                                {
                                  key: "peso",
                                  label: "Espaço",
                                  type: "number",
                                  width: 68,
                                },
                              ]}
                              onChange={(v) =>
                                update("defense_items", v as DefenseItem[])
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 rounded-md border border-border/50 bg-background/30 px-2 py-1.5 text-center text-[10px] text-muted-foreground">
                      RD equipada:{" "}
                      <strong className="text-foreground">{armorRd}</strong> ·
                      armaduras não acumulam entre si; vale a proteção mais
                      alta.
                    </div>
                  </Card>
                </div>
              </Section>
            </div>

            <div className="tadeon-sheet-state-grid">
              {/* Equilibrium card */}
              <Section
                id="equilibrio"
                title="Equilíbrio"
                className="tadeon-state-panel tadeon-equilibrium-panel"
                extra={
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/40 shadow-[0_0_10px_-4px_rgba(245,158,11,0.7)]">
                    <span className="text-[10px] uppercase tracking-wider font-cinzel text-amber-300">
                      Tensão
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-amber-300"
                      disabled={!canEdit}
                      aria-label="Diminuir tensão"
                      title="Diminuir tensão"
                      onClick={() => addDirectionalTension(-1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span
                      className={`min-w-[2.25rem] text-center text-sm font-bold ${sheet.drift === 0 ? "text-amber-200" : sheet.drift > 0 ? "text-yellow-300" : "text-red-300"}`}
                    >
                      {sheet.drift > 0 ? `+${sheet.drift}` : sheet.drift}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-amber-300"
                      disabled={!canEdit}
                      aria-label="Aumentar tensão"
                      title="Aumentar tensão"
                      onClick={() => addDirectionalTension(1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-[10px] text-muted-foreground ml-1">
                      −4…+4
                    </span>
                  </div>
                }
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>-10</span>
                  <span className="font-bold text-foreground text-base">
                    {equilibrium > 0 ? `+${equilibrium}` : equilibrium}
                  </span>
                  <span>+10</span>
                </div>
                <div className="relative w-full h-7 bg-secondary rounded-full overflow-hidden border border-border">
                  {/* Static dual gradient background */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, hsl(0,75%,18%) 0%, hsl(0,75%,50%) 50%, hsl(50,95%,55%) 50%, hsl(50,70%,95%) 100%)",
                      opacity: 0.25,
                    }}
                  />
                  {/* Center marker */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/40" />
                  {/* Indicator pill */}
                  <div
                    className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-2 border-background shadow-md transition-[background-color,box-shadow] duration-150"
                    style={{
                      left: `calc(${equilibriumPct}% - 10px)`,
                      background: equilibriumColor(equilibrium),
                    }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Input
                    type="number"
                    min={role === "mestre" ? -10 : -5}
                    max={role === "mestre" ? 10 : 5}
                    disabled={!canEdit}
                    value={sheet.equilibrium}
                    onChange={(e) =>
                      update(
                        "equilibrium",
                        clamp(
                          Number(e.target.value),
                          role === "mestre" ? -10 : -5,
                          role === "mestre" ? 10 : 5,
                        ),
                      )
                    }
                    className="w-24 h-8"
                  />
                  <input
                    type="range"
                    min={role === "mestre" ? -10 : -5}
                    max={role === "mestre" ? 10 : 5}
                    step={1}
                    disabled={!canEdit}
                    value={sheet.equilibrium}
                    onChange={(e) =>
                      update(
                        "equilibrium",
                        clamp(
                          Number(e.target.value),
                          role === "mestre" ? -10 : -5,
                          role === "mestre" ? 10 : 5,
                        ),
                      )
                    }
                    className="flex-1"
                  />
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Faixa comum: −5 a +5. Valores além disso exigem fonte
                  excepcional e ajuste do mestre.
                </p>
                <div className="grid gap-2 sm:grid-cols-3 mt-3 rounded-lg border border-border/70 bg-secondary/25 p-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Estado</span>
                    <p className="font-semibold text-foreground">
                      {equilibriumEffect.state}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Benefício</span>
                    <p className="text-emerald-300">
                      {equilibriumEffect.benefit}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Penalidade</span>
                    <p className="text-amber-300">
                      {equilibriumEffect.penalty}
                    </p>
                  </div>
                </div>
              </Section>

              {/* Exposure card */}
              <Section
                id="exposicao"
                title="Exposição"
                className="tadeon-state-panel tadeon-exposure-panel"
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    Rank base:{" "}
                    <strong className="text-foreground">{base.rank}</strong>
                  </span>
                  <span className="font-cinzel text-lg font-bold text-primary">
                    {sheet.exposure}/100
                  </span>
                </div>
                <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden border border-border">
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600"
                    style={{ width: `${clamp(sheet.exposure, 0, 100)}%` }}
                  />
                  {/* Rank tick marks every 5 */}
                  {Array.from({ length: 21 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 w-px bg-background/40"
                      style={{ left: `${i * 5}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!canEdit}
                    value={sheet.exposure}
                    onChange={(e) =>
                      update(
                        "exposure",
                        clamp(
                          Math.round(Number(e.target.value) / 5) * 5,
                          0,
                          100,
                        ),
                      )
                    }
                    className="w-24 h-8"
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    disabled={!canEdit}
                    value={sheet.exposure}
                    onChange={(e) => update("exposure", Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </Section>
            </div>

            {/* Conditions */}
            <Section
              id="condicoes"
              title="Condições"
              className="tadeon-conditions-panel"
            >
              <div className="tadeon-condition-grid grid grid-cols-2 gap-2 xl:grid-cols-4">
                {(Object.keys(CONDITION_META) as ConditionKey[]).map((c) => {
                  const meta = CONDITION_META[c];
                  const opts = (conditionOptions[c] ?? ["Normal"]).filter(
                    (option) => option !== "Normal",
                  );
                  const current = sheet.conditions[c];
                  return (
                    <div
                      key={c}
                      className="tadeon-condition-card rounded-xl border border-border/60 bg-secondary/15 p-3 transition-[border-color,background,box-shadow,transform] duration-150 ease-[var(--ease-out)]"
                      style={
                        current.length > 0
                          ? {
                              borderColor: meta.color,
                              background: `linear-gradient(145deg, rgba(${meta.rgb}, 0.2), rgba(${meta.rgb}, 0.04))`,
                              boxShadow: `0 0 0 1px ${meta.color}44, inset 0 0 24px rgba(${meta.rgb}, 0.1)`,
                            }
                          : undefined
                      }
                    >
                      <Label className="text-xs flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: meta.color }}
                        />
                        {meta.label}
                      </Label>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {opts.map((option) => {
                          const selected = current.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              disabled={!canEdit}
                              aria-pressed={selected}
                              className="rounded-full border px-2 py-1 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                              style={
                                selected
                                  ? {
                                      borderColor: meta.color,
                                      background: `rgba(${meta.rgb}, 0.28)`,
                                      color: meta.color,
                                      boxShadow: `inset 0 0 10px rgba(${meta.rgb}, 0.2), 0 0 8px rgba(${meta.rgb}, 0.16)`,
                                    }
                                  : undefined
                              }
                              onClick={() =>
                                update("conditions", {
                                  ...sheet.conditions,
                                  [c]: selected
                                    ? current.filter((item) => item !== option)
                                    : [...current, option],
                                })
                              }
                            >
                              {option}
                            </button>
                          );
                        })}
                        {current.length === 0 && (
                          <span className="px-1 py-1 text-[11px] text-muted-foreground">
                            Normal
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <CounterDots
                  label="Morrendo"
                  max={3}
                  value={sheet.dying}
                  color="bg-red-500"
                  disabled={!canEdit}
                  onChange={(v) => update("dying", v)}
                />
                <CounterDots
                  label="Colapsando"
                  max={3}
                  value={sheet.going_insane}
                  color="bg-purple-500"
                  disabled={!canEdit}
                  onChange={(v) => update("going_insane", v)}
                />
              </div>
            </Section>

            {/* Skills */}
            <Section
              id="sec-pericias"
              title="Perícias"
              extra={
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    Graus iniciais: {initialTrainingUsed}/7
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">
                    Graus totais: {trainingUsed}
                  </span>
                  <Input
                    placeholder="Bônus temporário"
                    disabled={!canEdit}
                    value={sheet.skill_bonus}
                    onChange={(e) => update("skill_bonus", e.target.value)}
                    className="h-7 w-44 text-xs"
                  />
                </div>
              }
            >
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Os grupos organizam a leitura da ficha; o Atributo usado no
                teste continua sendo definido pela abordagem descrita na cena.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {skillGroups.map((g) => (
                  <div
                    key={g.attr}
                    className="bg-secondary/40 rounded-lg p-2.5"
                  >
                    <h4 className="font-cinzel text-xs font-bold mb-1.5">
                      {g.label}
                    </h4>
                    <div className="space-y-0.5">
                      {g.skills.map((s) => {
                        const v = sheet.skills[s] ?? 0;
                        const tier: number = tierFromBonus(v);
                        const color =
                          tier === 3
                            ? "text-yellow-400 font-bold"
                            : tier === 2
                              ? "text-blue-400 font-semibold"
                              : tier === 1
                                ? "text-green-400"
                                : "text-muted-foreground";
                        const tierName =
                          tier === 0
                            ? "Sem treino"
                            : TRAINING_TIERS[tier - 1].name;
                        const initialForSkill = Math.max(
                          0,
                          Math.min(2, sheet.initial_skill_degrees[s] || 0),
                        );
                        const isInitialDegree =
                          initialTrainingRemaining > 0 &&
                          tier < 2 &&
                          initialForSkill === tier;
                        const nextCost: number | null =
                          tier < 3
                            ? isInitialDegree
                              ? 0
                              : (trainingCosts[tier] ?? 0)
                            : null;
                        const refund: number =
                          tier > initialForSkill
                            ? (trainingCosts[tier - 1] ?? 0)
                            : 0;
                        const minimumRank = [5, 25, 50][tier] ?? 100;
                        const lacksRank =
                          !isInitialDegree && base.rank < minimumRank;
                        const lacksPM =
                          nextCost != null && pmAvailable < nextCost;
                        const upgrade = () => {
                          if (tier >= 3 || nextCost == null) return;
                          if (lacksRank) {
                            toast.error(`Este grau exige Rank ${minimumRank}.`);
                            return;
                          }
                          if (lacksPM) {
                            toast.error(
                              `PM insuficientes (custa ${nextCost}).`,
                            );
                            return;
                          }
                          const nextTier = TRAINING_TIERS[tier]!;
                          setSheet((p) =>
                            p
                              ? {
                                  ...p,
                                  skills: { ...p.skills, [s]: nextTier.bonus },
                                  initial_skill_degrees: isInitialDegree
                                    ? {
                                        ...p.initial_skill_degrees,
                                        [s]: Math.min(2, initialForSkill + 1),
                                      }
                                    : p.initial_skill_degrees,
                                }
                              : p,
                          );
                          setOpenSkill(null);
                          toast.success(
                            `${s}: ${nextTier.name} (+${nextTier.bonus}) — ${
                              isInitialDegree
                                ? "grau inicial"
                                : `${nextCost} PM`
                            }`,
                          );
                        };
                        const downgrade = () => {
                          if (tier <= 0) return;
                          if (role !== "mestre") {
                            toast.error("Apenas o mestre pode reverter.");
                            return;
                          }
                          const prevBonus =
                            tier === 1 ? 0 : TRAINING_TIERS[tier - 2].bonus;
                          const prevName =
                            tier === 1
                              ? "Sem treino"
                              : TRAINING_TIERS[tier - 2].name;
                          const previousTier = tier - 1;
                          setSheet((p) =>
                            p
                              ? {
                                  ...p,
                                  skills: { ...p.skills, [s]: prevBonus },
                                  initial_skill_degrees: {
                                    ...p.initial_skill_degrees,
                                    [s]: Math.min(
                                      initialForSkill,
                                      previousTier,
                                    ),
                                  },
                                }
                              : p,
                          );
                          setOpenSkill(null);
                          toast.success(
                            refund > 0
                              ? `${s}: ${prevName} (+${refund} PM)`
                              : `${s}: ${prevName} (grau inicial removido)`,
                          );
                        };

                        return (
                          <Popover
                            key={s}
                            open={openSkill === s}
                            onOpenChange={(o) => setOpenSkill(o ? s : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                disabled={!canEdit}
                                className="w-full flex items-center justify-between text-xs px-1.5 py-1 rounded hover:bg-background/40 disabled:cursor-not-allowed"
                              >
                                <span>{s}</span>
                                <span className={color}>+{v}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="end">
                              <div className="font-cinzel font-bold text-sm mb-1">
                                {s}
                              </div>
                              <div className="text-[11px] text-muted-foreground mb-3">
                                Treino atual:{" "}
                                <span className={color}>
                                  {tierName}{" "}
                                  {tier > 0
                                    ? `(+${TRAINING_TIERS[tier - 1].bonus})`
                                    : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={tier === 0 || role !== "mestre"}
                                  title={
                                    role === "mestre"
                                      ? `Reverter (+${refund} PM)`
                                      : "Apenas mestre"
                                  }
                                  onClick={downgrade}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex-1 text-center text-xs">
                                  {tier < 3 && nextCost != null ? (
                                    <span className="text-muted-foreground">
                                      {lacksRank ? (
                                        <>Requer Rank {minimumRank}</>
                                      ) : (
                                        <>
                                          Avançar:{" "}
                                          <b className="text-foreground">
                                            {isInitialDegree
                                              ? "grau inicial"
                                              : `${nextCost} PM`}
                                          </b>
                                        </>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground italic">
                                      Treino máximo
                                    </span>
                                  )}
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={
                                    !canEdit ||
                                    tier >= 3 ||
                                    lacksRank ||
                                    lacksPM
                                  }
                                  title={
                                    lacksRank
                                      ? `Requer Rank ${minimumRank}`
                                      : lacksPM
                                        ? "PM insuficientes"
                                        : "Avançar treino"
                                  }
                                  onClick={upgrade}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Weapons */}
            <Section
              id="sec-armas"
              title="Armas"
              extra={
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent px-2.5 py-1 shadow-[0_0_12px_-4px_hsl(var(--primary))]">
                    <Label className="text-[10px] uppercase tracking-wider text-primary font-cinzel">
                      Proficiência
                    </Label>
                    <Select
                      value={sheet.weapon_proficiency}
                      disabled={!canEdit}
                      onValueChange={(value) => {
                        const next = value as WeaponProficiency;
                        const minimumRank = weaponProficiencyMinimumRank(next);
                        const additionalCost =
                          weaponProficiencySpend(next) -
                          weaponProficiencySpend(sheet.weapon_proficiency);
                        if (base.rank < minimumRank) {
                          toast.error(
                            `Esta Proficiência exige Rank ${minimumRank}.`,
                          );
                          return;
                        }
                        if (additionalCost > pmAvailable) {
                          toast.error(
                            `PM insuficientes (faltam ${additionalCost - pmAvailable}).`,
                          );
                          return;
                        }
                        setSheet((previous) =>
                          previous
                            ? {
                                ...previous,
                                weapon_proficiency: next,
                                weapon_proficiency_family:
                                  next === "combatente"
                                    ? previous.weapon_proficiency_family
                                    : "",
                              }
                            : previous,
                        );
                      }}
                    >
                      <SelectTrigger className="h-7 w-36 bg-background/40 text-xs font-semibold capitalize text-primary border-primary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEAPON_PROFICIENCIES.map((p) => (
                          <SelectItem key={p} value={p} className="capitalize">
                            {p}
                            {p === "combatente"
                              ? " · 2 PM"
                              : p === "armígero"
                                ? " · +3 PM"
                                : p === "operador"
                                  ? " · inicial"
                                  : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sheet.weapon_proficiency === "combatente" && (
                      <Select
                        value={sheet.weapon_proficiency_family || undefined}
                        disabled={!canEdit}
                        onValueChange={(value) =>
                          update(
                            "weapon_proficiency_family",
                            value as WeaponProficiencyFamily,
                          )
                        }
                      >
                        <SelectTrigger className="h-7 w-32 bg-background/40 text-xs border-primary/30">
                          <SelectValue placeholder="Família" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Contato">Contato</SelectItem>
                          <SelectItem value="Projeção">Projeção</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {canEdit && (
                    <AddItemDialog<Weapon>
                      title="Nova Arma"
                      triggerLabel="Adicionar Arma"
                      initial={{
                        id: "",
                        nome: "",
                        descricao: "",
                        familia: "",
                        categoria: "",
                        proficiencia: "leigo",
                        testeAtaque: "",
                        atributoDano: "",
                        tipo: "",
                        alcance: "Engajado",
                        dano: "",
                        critico: "",
                        margemAmeaca: "20",
                        maos: "Uma mão",
                        propriedades: "",
                        espaco: 1,
                        fonte: "",
                        pd: 6,
                        rd: 1,
                        modificacoes: "",
                        condicoesUso: "",
                        peso: 0,
                        extra: "",
                      }}
                      fields={[
                        { key: "nome", label: "Nome" },
                        {
                          key: "descricao",
                          label: "Descrição / procedência",
                          type: "textarea",
                        },
                        { key: "familia", label: "Família" },
                        { key: "categoria", label: "Categoria" },
                        {
                          key: "proficiencia",
                          label: "Proficiência",
                          type: "select",
                          options: [...WEAPON_PROFICIENCIES],
                        },
                        { key: "testeAtaque", label: "Teste de ataque" },
                        { key: "atributoDano", label: "Atributo de dano" },
                        {
                          key: "alcance",
                          label: "Alcance",
                          type: "select",
                          options: RANGE_OPTIONS,
                        },
                        {
                          key: "dano",
                          label: "Dano",
                          placeholder: "ex: 1d6+1",
                        },
                        { key: "tipo", label: "Tipo de dano" },
                        {
                          key: "margemAmeaca",
                          label: "Margem de ameaça",
                          placeholder: "20",
                        },
                        { key: "maos", label: "Mãos" },
                        {
                          key: "propriedades",
                          label: "Propriedades",
                          type: "textarea",
                        },
                        { key: "espaco", label: "Espaço", type: "number" },
                        { key: "fonte", label: "Munição / fonte" },
                        { key: "pd", label: "PD", type: "number" },
                        { key: "rd", label: "RD", type: "number" },
                        {
                          key: "modificacoes",
                          label: "Modificações",
                          type: "textarea",
                        },
                        {
                          key: "condicoesUso",
                          label: "Condições de uso",
                          type: "textarea",
                        },
                      ]}
                      onAdd={(w) =>
                        update("weapons", [
                          ...sheet.weapons,
                          { ...w, id: genId() },
                        ])
                      }
                    />
                  )}
                </div>
              }
            >
              <RowTable
                rows={sheet.weapons}
                canEdit={canEdit}
                columns={[
                  { key: "nome", label: "Nome", flex: 1.5 },
                  { key: "familia", label: "Família" },
                  { key: "categoria", label: "Categoria" },
                  { key: "testeAtaque", label: "Ataque", flex: 1.2 },
                  { key: "alcance", label: "Alcance" },
                  { key: "dano", label: "Dano" },
                  { key: "tipo", label: "Tipo" },
                  { key: "margemAmeaca", label: "Ameaça", width: 72 },
                  { key: "espaco", label: "Espaço", type: "number", width: 70 },
                  { key: "propriedades", label: "Propriedades", flex: 1.5 },
                ]}
                onChange={(v) => update("weapons", v as Weapon[])}
              />
              {sheet.weapon_proficiency === "combatente" &&
                !sheet.weapon_proficiency_family && (
                  <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                    Escolha Contato ou Projeção para concluir a Proficiência
                    III.
                  </p>
                )}
            </Section>

            {/* Inventory */}
            <Section
              id="sec-inv"
              title="Inventário"
              extra={
                canEdit && (
                  <AddItemDialog<InventoryItem>
                    title="Novo Item"
                    triggerLabel="Adicionar Item"
                    initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
                    fields={[
                      { key: "nome", label: "Nome" },
                      {
                        key: "descricao",
                        label: "Descrição",
                        type: "textarea",
                      },
                      { key: "espaco", label: "Espaço", type: "number" },
                    ]}
                    onAdd={(it) =>
                      update("inventory", [
                        ...sheet.inventory,
                        { ...it, id: genId() },
                      ])
                    }
                  />
                )
              }
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">
                  {invUsed} / {invCapacity} espaço
                </span>
                {invUsed > invCapacity && (
                  <span className="text-destructive font-medium">
                    Sobrecarregado!
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 bg-secondary rounded mb-3 overflow-hidden">
                <div
                  className={`h-full rounded transition-colors duration-150 ${invUsed > invCapacity ? "bg-destructive" : "bg-primary"}`}
                  style={{
                    width: `${clamp((Math.max(0, invUsed) / Math.max(1, invCapacity)) * 100, 0, 100)}%`,
                  }}
                />
              </div>
              <RowTable
                rows={sheet.inventory}
                canEdit={canEdit}
                columns={[
                  { key: "nome", label: "Nome", flex: 1.2 },
                  { key: "descricao", label: "Descrição", flex: 2 },
                  { key: "espaco", label: "Espaço", type: "number", width: 80 },
                ]}
                onChange={(v) => update("inventory", v as InventoryItem[])}
              />
            </Section>

            {/* Abilities */}
            <Section
              id="sec-hab"
              title="Habilidades"
              extra={
                canEdit && (
                  <AddItemDialog<Ability>
                    title="Nova Habilidade"
                    triggerLabel="Adicionar Habilidade"
                    initial={{
                      id: "",
                      nome: "",
                      descricao: "",
                      modificador: "",
                    }}
                    fields={[
                      { key: "nome", label: "Nome" },
                      {
                        key: "descricao",
                        label: "Descrição",
                        type: "textarea",
                      },
                      { key: "modificador", label: "Modificador" },
                    ]}
                    onAdd={(a) =>
                      update("abilities", [
                        ...sheet.abilities,
                        { ...a, id: genId() },
                      ])
                    }
                  />
                )
              }
            >
              <RowTable
                rows={sheet.abilities}
                canEdit={canEdit}
                columns={[
                  { key: "nome", label: "Nome", flex: 1.2 },
                  { key: "descricao", label: "Descrição", flex: 2.5 },
                  { key: "modificador", label: "Modificador", flex: 1 },
                ]}
                onChange={(v) => update("abilities", v as Ability[])}
              />
            </Section>

            {/* Plots / Fragments toggle */}
            <Section
              id="tramas-fragmentos"
              title={fragmentsView ? "Fragmentos" : "Tramas"}
              extra={
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={fragmentsView ? "default" : "outline"}
                    onClick={() => setFragmentsView((v) => !v)}
                    className="h-7 gap-1.5"
                    title="Alternar entre Tramas e quadro de Fragmentos"
                  >
                    <Gem className="w-3.5 h-3.5" />
                    <span>{fragmentsView ? "Ver Tramas" : "Fragmentos"}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-background/40 text-[10px] font-mono">
                      {sheet.fragments_items.length}
                    </span>
                  </Button>
                  {fragmentsView
                    ? canEdit && (
                        <AddItemDialog<FragmentItem>
                          title="Novo Fragmento"
                          triggerLabel="Fragmento"
                          initial={{
                            id: "",
                            nome: "",
                            descricao: "",
                            espaco: 1,
                            selo: "Não selado",
                            categoria: "I",
                            integridade: 0,
                            natureza: "",
                            dominio: "",
                            assinatura: "",
                            limiteSeguro: "Repuxo",
                            observacoes: "",
                          }}
                          fields={[
                            { key: "nome", label: "Nome" },
                            {
                              key: "descricao",
                              label: "Descrição",
                              type: "textarea",
                            },
                            {
                              key: "selo",
                              label: "Selo",
                              type: "select",
                              options: ["Selado", "Não selado"],
                            },
                            {
                              key: "categoria",
                              label: "Categoria",
                              type: "select",
                              options: ["I", "II", "III"],
                            },
                            {
                              key: "integridade",
                              label: "Integridade atual",
                              type: "number",
                            },
                            { key: "natureza", label: "Natureza" },
                            { key: "dominio", label: "Domínio" },
                            {
                              key: "assinatura",
                              label: "Assinatura",
                              type: "textarea",
                            },
                            {
                              key: "limiteSeguro",
                              label: "Limite seguro",
                              type: "select",
                              options: ["Repuxo", "Tração", "Estiramento"],
                            },
                            {
                              key: "espaco",
                              label: "Espaço (peso conta no inventário)",
                              type: "number",
                            },
                            {
                              key: "observacoes",
                              label: "Observações",
                              type: "textarea",
                            },
                          ]}
                          onAdd={(it) =>
                            update("fragments_items", [
                              ...sheet.fragments_items,
                              { ...it, id: genId() },
                            ])
                          }
                        />
                      )
                    : canEdit && (
                        <AddItemDialog<Plot>
                          title="Nova Trama"
                          triggerLabel="Trama"
                          initial={{
                            id: "",
                            nome: "",
                            uso: "",
                            alcance: "Pessoal",
                            dano: "",
                            efeito: "",
                            dt_descricao: "",
                          }}
                          fields={[
                            { key: "nome", label: "Nome" },
                            { key: "uso", label: "Uso" },
                            {
                              key: "alcance",
                              label: "Alcance",
                              type: "select",
                              options: PLOT_RANGE_OPTIONS,
                            },
                            { key: "dano", label: "Dano" },
                            {
                              key: "efeito",
                              label: "Efeito",
                              type: "textarea",
                            },
                            {
                              key: "dt_descricao",
                              label: "DT / Descrição",
                              type: "textarea",
                            },
                          ]}
                          onAdd={(p) =>
                            update("plots", [
                              ...sheet.plots,
                              { ...p, id: genId() },
                            ])
                          }
                        />
                      )}
                </div>
              }
            >
              {fragmentsView ? (
                <>
                  <div className="mb-3 p-2.5 rounded-lg bg-gradient-to-r from-primary/15 to-transparent border border-primary/30 flex flex-wrap items-center gap-3 text-xs animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <Gem className="w-4 h-4 text-primary" />
                    <span>
                      <b className="text-primary">Fragmentos acumulados:</b>{" "}
                      {sheet.fragments_items.length}
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span>
                      Peso somado ao inventário:{" "}
                      <b>
                        {sheet.fragments_items.reduce(
                          (s, i) => s + (Number(i.espaco) || 0),
                          0,
                        )}
                      </b>
                    </span>
                  </div>
                  <RowTable
                    rows={sheet.fragments_items}
                    canEdit={canEdit}
                    columns={[
                      { key: "nome", label: "Nome", flex: 1.2 },
                      {
                        key: "selo",
                        label: "Selo",
                        type: "select",
                        options: ["Selado", "Não selado"],
                      },
                      {
                        key: "categoria",
                        label: "Cat.",
                        type: "select",
                        options: ["I", "II", "III"],
                        width: 62,
                      },
                      {
                        key: "integridade",
                        label: "Int.",
                        type: "number",
                        width: 62,
                      },
                      { key: "natureza", label: "Natureza" },
                      { key: "dominio", label: "Domínio" },
                      {
                        key: "limiteSeguro",
                        label: "Limite",
                        type: "select",
                        options: ["Repuxo", "Tração", "Estiramento"],
                      },
                      {
                        key: "espaco",
                        label: "Espaço",
                        type: "number",
                        width: 80,
                      },
                    ]}
                    onChange={(v) =>
                      update("fragments_items", v as FragmentItem[])
                    }
                  />
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <ResistanceDtCalculator initialAttribute={attrs.MEN} />
                  </div>
                  <RowTable
                    rows={sheet.plots}
                    canEdit={canEdit}
                    columns={[
                      { key: "nome", label: "Nome", flex: 1.2 },
                      { key: "uso", label: "Uso" },
                      {
                        key: "alcance",
                        label: "Alcance",
                        type: "select",
                        options: PLOT_RANGE_OPTIONS,
                      },
                      { key: "dano", label: "Dano" },
                      { key: "efeito", label: "Efeito", flex: 2 },
                      { key: "dt_descricao", label: "DT/Descrição", flex: 1.5 },
                    ]}
                    onChange={(v) => update("plots", v as Plot[])}
                  />
                </>
              )}
            </Section>

            {/* Notes */}
            <Section id="sec-notas" title="Anotações Rápidas">
              <Textarea
                disabled={!canEdit}
                value={sheet.notes || ""}
                onChange={(e) => update("notes", e.target.value)}
                rows={4}
              />
            </Section>

            <p className="text-center text-[10px] text-muted-foreground py-6">
              © {new Date().getFullYear()} Gabriel Tadeu · Tadeon Nexus.
            </p>
          </TabsContent>

          <TabsContent value="arvore" className="mt-0">
            <SkillTreeTab
              exposure={sheet.exposure}
              equilibrium={sheet.equilibrium}
              attributes={sheet.attributes}
              skills={sheet.skills}
              weaponProficiency={sheet.weapon_proficiency}
              pmSpent={calculatedPmSpent}
              statUpgrades={sheet.stat_upgrades}
              purchasedSkills={sheet.purchased_skills}
              abilities={sheet.abilities}
              branches={activeBranches}
              rankTable={rankTable}
              upgradeCosts={upgradeCosts}
              canEdit={canEdit}
              onUpdate={(c) => setSheet((p) => (p ? { ...p, ...c } : p))}
            />
          </TabsContent>

          <TabsContent value="descricao" className="mt-0 space-y-4">
            {(
              [
                ["historia", "História"],
                ["personalidade", "Personalidade"],
                ["objetivos", "Objetivos"],
                ["observacoes", "Observações"],
              ] as const
            ).map(([key, label]) => (
              <Section key={key} title={label}>
                <Textarea
                  disabled={!canEdit}
                  value={sheet.description[key] || ""}
                  onChange={(e) =>
                    update("description", {
                      ...sheet.description,
                      [key]: e.target.value,
                    })
                  }
                  rows={6}
                  placeholder={`Escreva aqui sobre ${label.toLowerCase()}...`}
                />
              </Section>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <nav
        className="tadeon-sheet-mobile-dock md:hidden"
        aria-label="Ações rápidas da ficha"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
          aria-label="Voltar ao painel"
          title="Voltar ao painel"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="tadeon-sheet-mobile-dock__identity">
          <span>Ficha ativa</span>
          <strong>{sheet.name || "Sem nome"}</strong>
        </div>
        {canEdit ? (
          <>
            <SaveStatus
              state={
                typeof navigator !== "undefined" && !navigator.onLine
                  ? "offline"
                  : saving
                    ? "saving"
                    : saveError
                      ? "error"
                      : dirty
                        ? "pending"
                        : "saved"
              }
              savedAt={lastSavedAt}
              onRetry={() => void doSave()}
              compact
            />
            <Button
              size="icon"
              onClick={() => void doSave()}
              className="tadeon-sheet-mobile-dock__save"
              aria-label="Salvar ficha"
              title="Salvar ficha"
            >
              <Save className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <span className="tadeon-sheet-mobile-dock__readonly">Leitura</span>
        )}
      </nav>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="tadeon-sheet-top-button fixed z-30 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary/80 text-muted-foreground shadow-lg backdrop-blur transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-primary/60 hover:text-primary active:scale-[.97]"
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
}

function OverviewMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "blue" | "amber" | "red";
}) {
  return (
    <div className={`tadeon-overview-metric tadeon-overview-metric--${tone}`}>
      <div className="tadeon-overview-metric__icon">{icon}</div>
      <div className="min-w-0">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  extra,
  id,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const presentationKey =
    id ?? title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-");
  const presentation = SECTION_PRESENTATION[presentationKey] ?? {
    index: "•",
    kicker: "Arquivo da personagem",
  };
  const storageKey = `tadeon.sheet.section:${presentationKey}`;
  const bodyId = `sheet-section-body-${presentationKey}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(storageKey) === "collapsed";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        collapsed ? "collapsed" : "expanded",
      );
    } catch {
      // A ficha continua utilizável quando o armazenamento local está indisponível.
    }
  }, [collapsed, storageKey]);

  return (
    <Card
      id={id}
      data-section={presentationKey}
      data-collapsed={collapsed ? "true" : "false"}
      className={`tadeon-surface tadeon-sheet-section scroll-mt-44 p-4 transition-[border-color,box-shadow] duration-150 hover:border-primary/25 md:p-5 ${className}`}
    >
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => setCollapsed(!open)}
      >
        <div className="tadeon-sheet-section__heading mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="tadeon-sheet-section__title-group">
            <span className="tadeon-sheet-section__index" aria-hidden="true">
              {presentation.index}
            </span>
            <span className="min-w-0">
              <small>{presentation.kicker}</small>
              <h2 className="font-cinzel text-lg font-semibold text-primary">
                {title}
              </h2>
            </span>
          </div>
          <div className="tadeon-sheet-section__actions">
            {extra}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="tadeon-sheet-section__toggle"
                aria-controls={bodyId}
                aria-label={`${collapsed ? "Expandir" : "Recolher"} seção ${title}`}
                title={`${collapsed ? "Expandir" : "Recolher"} ${title}`}
              >
                <ChevronDown aria-hidden="true" />
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent id={bodyId} className="tadeon-sheet-section__body">
          <div className="tadeon-sheet-section__body-inner">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={`tadeon-sheet-field ${className}`}>
      <Label className="text-xs">{label}</Label>
      <Input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-9"
      />
    </div>
  );
}

function StatBlock({
  label,
  full,
  color,
  barColor,
  glowRgb,
  current,
  mod,
  max,
  disabled,
  onCurrent,
  onMod,
}: {
  label: string;
  full: string;
  color: string;
  barColor: string;
  glowRgb: string;
  current: number;
  mod: number;
  max: number;
  disabled?: boolean;
  onCurrent: (v: number) => void;
  onMod: (v: number) => void;
}) {
  const borderStyle = {
    borderColor: `rgba(${glowRgb}, 0.35)`,
    boxShadow: `0 0 22px -10px rgba(${glowRgb}, 0.7)`,
  };
  return (
    <Card
      className="tadeon-stat-block border bg-card/60 p-2.5"
      style={borderStyle}
    >
      <div className="tadeon-stat-block__head">
        <div>
          <div className={`font-cinzel text-sm font-bold ${color}`}>
            {label}
          </div>
          <span className="text-[10px] text-muted-foreground">{full}</span>
        </div>
        <strong
          className={`tadeon-stat-block__value ${color}`}
          style={{ textShadow: `0 0 10px rgba(${glowRgb}, 0.75)` }}
        >
          {current}
          <small>/ {max}</small>
        </strong>
      </div>
      <div className="tadeon-stat-block__bar mb-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
          style={{
            width: `${clamp((current / Math.max(1, max)) * 100, 0, 100)}%`,
          }}
        />
      </div>
      <div className="tadeon-stat-block__controls">
        <div className="tadeon-stat-block__stepper">
          <Button
            size="sm"
            variant="ghost"
            className="tadeon-stepper-button h-9 w-9 p-0"
            disabled={disabled || current <= 0}
            aria-label={`Diminuir ${full}`}
            onClick={() => onCurrent(current - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min={0}
            max={Math.max(0, max)}
            disabled={disabled}
            value={current}
            aria-label={`${full} atual`}
            onChange={(e) => onCurrent(Number(e.target.value))}
            className="h-9 min-w-0 text-center text-sm font-semibold"
          />
          <Button
            size="sm"
            variant="ghost"
            className="tadeon-stepper-button h-9 w-9 p-0"
            disabled={disabled || current >= max}
            aria-label={`Aumentar ${full}`}
            onClick={() => onCurrent(current + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <label className="tadeon-stat-block__mod">
          <span>Mod</span>
          <Input
            type="number"
            disabled={disabled}
            value={mod}
            aria-label={`Modificador de ${full}`}
            onChange={(e) => onMod(Number(e.target.value))}
            className="h-8 text-center text-xs"
          />
        </label>
      </div>
    </Card>
  );
}

function CounterDots({
  label,
  max,
  value,
  color,
  disabled,
  onChange,
}: {
  label: string;
  max: number;
  value: number;
  color: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        {Array.from({ length: max }).map((_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            aria-label={`${label}: ${i + 1} de ${max}`}
            aria-pressed={i < value}
            className={`h-7 w-7 rounded-full border-2 border-border transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[.94] ${i < value ? color : "bg-transparent"} disabled:cursor-not-allowed disabled:transform-none`}
          />
        ))}
      </div>
    </div>
  );
}

interface HasId {
  id: string;
}
interface ColDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  flex?: number;
  width?: number;
}

function RowTable<T extends HasId>({
  rows,
  canEdit,
  columns,
  onChange,
}: {
  rows: T[];
  canEdit: boolean;
  columns: ColDef[];
  onChange: (v: T[]) => void;
}) {
  const update = (idx: number, key: string, value: string) => {
    const next = [...rows];
    const isNum = columns.find((c) => c.key === key)?.type === "number";
    next[idx] = { ...next[idx], [key]: isNum ? Number(value) : value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic text-center py-3">
        Nenhum item ainda.
      </p>
    );
  }

  const gridCols = columns
    .map((c) => (c.width ? `${c.width}px` : `minmax(0, ${c.flex ?? 1}fr)`))
    .concat(["auto"])
    .join(" ");

  return (
    <div className="space-y-1">
      <div
        className="hidden sm:grid gap-1.5 px-2 text-[10px] uppercase text-muted-foreground font-semibold"
        style={{ gridTemplateColumns: gridCols }}
      >
        {columns.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
        <div />
      </div>
      {rows.map((it, idx) => (
        <div
          key={it.id}
          className="tadeon-sheet-row flex flex-col items-center gap-2 rounded-xl bg-secondary/30 p-2.5 transition-[background-color,border-color,box-shadow] duration-150 hover:bg-secondary/50 sm:grid sm:gap-1.5"
          style={{ gridTemplateColumns: gridCols }}
        >
          {columns.map((c) => {
            const value = (it as Record<string, unknown>)[c.key];
            if (c.type === "select") {
              return (
                <label key={c.key} className="tadeon-sheet-row__field">
                  <span>{c.label}</span>
                  <select
                    disabled={!canEdit}
                    value={String(value ?? "")}
                    onChange={(e) => update(idx, c.key, e.target.value)}
                    className="h-8 w-full rounded-md border border-border/40 bg-background/40 px-2 text-xs"
                  >
                    {c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={c.key} className="tadeon-sheet-row__field">
                <span>{c.label}</span>
                <Input
                  type={c.type === "number" ? "number" : "text"}
                  placeholder={c.label}
                  disabled={!canEdit}
                  value={
                    c.type === "number"
                      ? Number(value ?? 0)
                      : String(value ?? "")
                  }
                  onChange={(e) => update(idx, c.key, e.target.value)}
                  className="h-8 w-full border-border/40 bg-background/40 text-xs"
                />
              </label>
            );
          })}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 self-end sm:self-auto"
              onClick={() => remove(idx)}
              aria-label={`Remover item ${idx + 1}`}
              title="Remover item"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
