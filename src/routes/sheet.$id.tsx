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
  ChevronLeft,
  ChevronRight,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSerializedAutosave } from "@/lib/use-serialized-autosave";
import { can } from "@/lib/permissions";
import { cacheSheet } from "@/lib/offline-cache";
import { BrandMark } from "@/components/brand-mark";
import { SaveStatus } from "@/components/save-status";
import { ResistanceDtCalculator } from "@/components/master/resistance-dt-calculator";

const LIFE_CYCLE_TRAITS: LifeCycleTrait[] = [
  "Formação recente",
  "Corpo habituado",
  "Nome reconhecido",
  "Experiência acumulada",
  "Responsabilidades",
  "Cicatriz antiga",
];

const LINK_STATES: LinkState[] = ["Presente", "Tensionado", "Ferido", "Rompido", "Costurado"];

const AttributeRadar = lazy(() => import("@/components/sheet/attribute-radar"));

const TRAINING_TIERS = [
  { tier: 1, name: "Iniciado", bonus: 3 },
  { tier: 2, name: "Apurado", bonus: 6 },
  { tier: 3, name: "Versado", bonus: 9 },
] as const;
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
    links: [{ rel: "canonical", href: "https://tadeon-nexus.lovable.app/" }],
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
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(DEFAULT_UPGRADE_COSTS);
  const [conditionOptions, setConditionOptions] =
    useState<ConditionOptionsMap>(DEFAULT_CONDITION_OPTIONS);
  const [sheetSkillGroups, setSheetSkillGroups] = useState<typeof SKILL_GROUPS>([]);
  const [trainingCosts, setTrainingCosts] =
    useState<[number, number, number]>(DEFAULT_TRAINING_COSTS);
  // (removed setPowerFormOpen — Power Form opens via dedicated route)
  const [fragmentsView, setFragmentsView] = useState(false);
  const [defEquipOpen, setDefEquipOpen] = useState(false);
  const [openSkill, setOpenSkill] = useState<string | null>(null);

  const canEdit = can("character:edit", {
    appRole: role,
    currentUserId: user?.id,
    resourceOwnerId: sheet?.owner_id,
  });

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settingsJson }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
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
      const fragItems = ((raw.fragments_items as FragmentItem[] | null) ?? []).map((item) => ({
        ...item,
        categoria: item.categoria ?? "I",
        selo: item.selo ?? "Não selado",
        integridade: Number(item.integridade ?? 0),
        limiteSeguro: item.limiteSeguro ?? "Repuxo",
      }));
      const defItems = ((raw.defense_items as Partial<DefenseItem>[] | null) ?? []).map((item) => ({
        id: item.id ?? genId(),
        nome: item.nome ?? "",
        bonus: Number(item.bonus ?? 0),
        rd: Number(item.rd ?? 0),
        peso: Number(item.peso ?? 0),
      }));
      const rawIdentity = (raw.identity_data as Partial<IdentityData> | null) ?? {};
      const identityData: IdentityData = {
        ...DEFAULT_IDENTITY_DATA,
        ...rawIdentity,
        conviction: rawIdentity.conviction ?? String(raw.motivation ?? ""),
        links: (rawIdentity.links?.length ? rawIdentity.links : DEFAULT_IDENTITY_DATA.links).map(
          (link, index) => ({
            id: link.id || `link-${index + 1}`,
            name: link.name ?? "",
            relation: link.relation ?? "",
            state: link.state ?? "Presente",
          }),
        ),
      };
      const loadedSkills = ((raw.skills as Record<string, number> | null) ?? {}) as Record<
        string,
        number
      >;
      const storedInitialDegrees = (raw.initial_skill_degrees as InitialSkillDegrees | null) ?? {};
      const initialSkillDegrees = Object.keys(storedInitialDegrees).length
        ? storedInitialDegrees
        : inferInitialSkillDegrees(loadedSkills);
      const storedProficiency = raw.weapon_proficiency as WeaponProficiency | null;
      const weaponProficiency = WEAPON_PROFICIENCIES.includes(
        storedProficiency as WeaponProficiency,
      )
        ? (storedProficiency as WeaponProficiency)
        : "operador";
      const storedFamily = raw.weapon_proficiency_family as WeaponProficiencyFamily | null;
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
          storedFamily === "Contato" || storedFamily === "Projeção" ? storedFamily : "",
      });

      const settings = (settingsJson as unknown as Record<string, unknown> | null) ?? {};
      const configuredRanks = (settings.rank_table as RankRow[] | undefined) ?? [];
      const configuredBranches = (settings.skill_branches as SkillBranch[] | undefined) ?? [];
      const finalRulesConfigured =
        configuredRanks[0]?.def === 10 &&
        configuredRanks.at(-1)?.pm === 170 &&
        configuredBranches.length === 4 &&
        configuredBranches.every((branch) => branch.nodes.length === 24);
      setRankTable(finalRulesConfigured ? configuredRanks : CANONICAL_RANK_TABLE);
      setBranches(finalRulesConfigured ? configuredBranches : CANONICAL_SKILL_BRANCHES);
      setUpgradeCosts(
        finalRulesConfigured
          ? ((settings.upgrade_costs as UpgradeCosts | undefined) ?? DEFAULT_UPGRADE_COSTS)
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
          ? ((settings.skill_groups as typeof SKILL_GROUPS | undefined) ?? SKILL_GROUPS)
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
    setSheet((previous) => (previous ? { ...previous, pm_spent: calculatedPmSpent } : previous));
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
    const shiftedEquilibrium = clamp((sheet.equilibrium || 0) + direction, -10, 10);
    if (role !== "mestre" && Math.abs(shiftedEquilibrium) > 5) {
      toast.error("Ultrapassar ±5 exige uma fonte excepcional confirmada pelo mestre.");
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
      layers.push(`0 0 ${blur}px ${2 + insane}px rgba(255, 245, 180, ${intensity})`);
      layers.push(
        `0 0 ${blur + 8}px ${1 + insane}px rgba(255, 255, 255, ${Math.min(0.85, intensity)})`,
      );
    }
    return layers.length ? layers.join(", ") : undefined;
  }, [activeConditions, sheet?.dying, sheet?.going_insane]);

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
  const armorRaw = Math.max(0, ...sheet.defense_items.map((item) => Number(item.bonus) || 0));
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
  const { pv: pvMax, ps: psMax, pe: peMax, pa: paMax, def: defTotal } = maximums;
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
  const initialTrainingUsed = Object.values(sheet.initial_skill_degrees || {}).reduce(
    (sum, value) => sum + Math.max(0, Math.min(2, Math.floor(value || 0))),
    0,
  );
  const initialTrainingRemaining = Math.max(0, 7 - initialTrainingUsed);
  const pmAvailable = calcTotalPM(sheet.exposure, rankTable) - calculatedPmSpent;
  const attributeBudget = attributePointBudget(base.rank);
  const attributeUsed = attributePointsUsed(attrs);
  const attributeRemaining = attributeBudget - attributeUsed;
  const attributeCap = attributeValueCap(base.rank);
  const zeroAttributes = Object.values(attrs).filter((value) => value === 0).length;
  const attributesOverCap = (Object.keys(attrs) as (keyof Attributes)[]).filter(
    (key) => attrs[key] > attributeCap,
  );

  const skillGroups = sheetSkillGroups.length ? sheetSkillGroups : SKILL_GROUPS;
  const sectionAnchors: { id: string; label: string }[] = [
    { id: "sec-info", label: "Informações" },
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

  return (
    <div className="tadeon-page pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-5 bg-background/85 backdrop-blur-xl border-b border-border/80">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            aria-label="Voltar ao painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <BrandMark className="hidden h-8 w-8 text-primary sm:block" />
          <div className="min-w-0 flex-1">
            <p className="tadeon-eyebrow hidden sm:block">Ficha de continuidade</p>
            <h1 className="font-cinzel text-lg md:text-2xl font-semibold truncate">
              {sheet.name || "Ficha"}
            </h1>
          </div>
          {!canEdit && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              somente leitura
            </span>
          )}
          {canEdit && (
            <div className="flex items-center gap-2">
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
                compact={typeof window !== "undefined" && window.innerWidth < 640}
              />
              {sheet.power_form_enabled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (await doSave()) {
                      void navigate({ to: "/sheet/$id/power", params: { id: sheet.id } });
                    }
                  }}
                  className="gap-1.5 border-orange-400/60 text-orange-300 hover:bg-orange-500/15 animate-in fade-in-0 zoom-in-95 font-bold tracking-widest shadow-[0_0_15px_-5px_rgba(255,140,60,0.7)]"
                  title="Abrir Forma de Poder (VP)"
                >
                  <Sparkles className="w-4 h-4 animate-pulse" /> VP
                </Button>
              )}
              <Button size="sm" onClick={doSave} className="gap-1.5">
                <Save className="w-4 h-4" /> <span className="hidden sm:inline">Salvar</span>
              </Button>
            </div>
          )}
        </div>
        {activeConditions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {activeConditions.map((k) => (
              <span
                key={k}
                className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                style={{
                  borderColor: CONDITION_META[k].color,
                  color: CONDITION_META[k].color,
                  background: `rgba(${CONDITION_META[k].rgb}, 0.08)`,
                }}
              >
                {CONDITION_META[k].label}: {sheet.conditions[k].join(", ")}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        className="rounded-xl transition-shadow duration-500"
        style={{ boxShadow: borderShadow, padding: borderShadow ? "2px" : 0 }}
      >
        <Tabs defaultValue="ficha" className="space-y-4">
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="ficha" className="flex-1 md:flex-initial">
              Ficha
            </TabsTrigger>
            <TabsTrigger value="arvore" className="flex-1 md:flex-initial">
              Árvore
            </TabsTrigger>
            <TabsTrigger value="descricao" className="flex-1 md:flex-initial">
              Descrição
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="ficha"
            className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
          >
            {/* Quick jump shortcuts */}
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {sectionAnchors.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => jumpTo(a.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-secondary/40 hover:bg-primary/15 hover:border-primary/50 hover:text-primary transition-all font-medium"
                >
                  {a.label}
                </button>
              ))}
            </div>
            <Section id="sec-info" title="Identidade">
              <div className="mb-4">
                <p className="tadeon-eyebrow">Sete campos essenciais</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Origem situa, Ocupação mostra prática, Convicção sustenta, Limite interrompe,
                  Ferida pressiona e Marca registra o que já mudou.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Field
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
                <Field
                  label="Convicção"
                  value={sheet.identity_data.conviction}
                  onChange={(value) =>
                    update("identity_data", { ...sheet.identity_data, conviction: value })
                  }
                  disabled={!canEdit}
                />
                <Field
                  label="Limite"
                  value={sheet.identity_data.limit}
                  onChange={(value) =>
                    update("identity_data", { ...sheet.identity_data, limit: value })
                  }
                  disabled={!canEdit}
                />
                <Field
                  label="Ferida"
                  value={sheet.identity_data.wound}
                  onChange={(value) =>
                    update("identity_data", { ...sheet.identity_data, wound: value })
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-4">
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
                    <Label className="text-[10px] uppercase tracking-wider">Pergunta</Label>
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
                <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="tadeon-eyebrow">Vínculos</p>
                      <p className="text-xs text-muted-foreground">
                        A personagem começa com dois; a história e Responsabilidades podem ampliar.
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
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
                        Vínculo
                      </Button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {sheet.identity_data.links.map((link, index) => (
                      <div key={link.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_140px_auto]">
                        <Input
                          disabled={!canEdit}
                          value={link.name}
                          placeholder={`Vínculo ${index + 1}`}
                          onChange={(event) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = { ...link, name: event.target.value };
                            update("identity_data", { ...sheet.identity_data, links });
                          }}
                        />
                        <Input
                          disabled={!canEdit}
                          value={link.relation}
                          placeholder="Natureza da relação"
                          onChange={(event) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = { ...link, relation: event.target.value };
                            update("identity_data", { ...sheet.identity_data, links });
                          }}
                        />
                        <Select
                          value={link.state}
                          disabled={!canEdit}
                          onValueChange={(value) => {
                            const links = [...sheet.identity_data.links];
                            links[index] = { ...link, state: value as LinkState };
                            update("identity_data", { ...sheet.identity_data, links });
                          }}
                        >
                          <SelectTrigger>
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
                            className="text-muted-foreground hover:text-destructive"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Section
                id="sec-attr"
                title="Atributos"
                extra={
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      attributeRemaining < 0 || attributesOverCap.length > 0
                        ? "border-destructive/60 text-destructive"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {attributeUsed}/{attributeBudget} pontos · máx. {attributeCap}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1.5">
                    {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => {
                      const wouldCreateSecondZero = attrs[k] === 1 && zeroAttributes >= 1;
                      return (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-2 rounded bg-secondary/40 px-2 py-1"
                        >
                          <span className="font-cinzel text-sm">{k}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              disabled={!canEdit || attrs[k] <= 0 || wouldCreateSecondZero}
                              aria-label={`Diminuir ${k}`}
                              title={
                                wouldCreateSecondZero
                                  ? "Apenas um Atributo pode ser reduzido a 0"
                                  : undefined
                              }
                              onClick={() =>
                                update("attributes", { ...attrs, [k]: Math.max(0, attrs[k] - 1) })
                              }
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-5 text-center font-bold">{attrs[k]}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              disabled={
                                !canEdit || attrs[k] >= attributeCap || attributeRemaining <= 0
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
                    <p className="pt-1 text-[10px] leading-relaxed text-muted-foreground">
                      {attributeRemaining > 0
                        ? `${attributeRemaining} ponto(s) ainda disponível(is).`
                        : "Orçamento do Rank totalmente distribuído."}
                    </p>
                  </div>
                  <div className="h-48 sm:h-56">
                    <Suspense
                      fallback={
                        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mt-20" />
                      }
                    >
                      <AttributeRadar data={radarData} color="#a855f7" tickColor="#c084fc" />
                    </Suspense>
                  </div>
                </div>
              </Section>

              <Section id="sec-pontos" title="Pontos Vitais">
                <div className="grid grid-cols-1 gap-2.5 min-[430px]:grid-cols-2">
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
                      update("stats", { ...sheet.stats, pv_current: clampCurrent(v, pvMax) })
                    }
                    onMod={(v) => update("stats", { ...sheet.stats, pv_mod: clampMod(v) })}
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
                      update("stats", { ...sheet.stats, pe_current: clampCurrent(v, peMax) })
                    }
                    onMod={(v) => update("stats", { ...sheet.stats, pe_mod: clampMod(v) })}
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
                      update("stats", { ...sheet.stats, ps_current: clampCurrent(v, psMax) })
                    }
                    onMod={(v) => update("stats", { ...sheet.stats, ps_mod: clampMod(v) })}
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
                      update("stats", { ...sheet.stats, pa_current: clampCurrent(v, paMax) })
                    }
                    onMod={(v) => update("stats", { ...sheet.stats, pa_mod: clampMod(v) })}
                  />

                  <Card className="p-3 bg-card/60 border-blue-500/30 shadow-[0_0_22px_-12px_rgba(59,130,246,0.65)]">
                    <div className="text-blue-300 font-cinzel font-bold text-sm">Defesa</div>
                    <div className="relative my-2 flex items-center justify-center">
                      <Shield
                        className="w-20 h-20 text-blue-400/30 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]"
                        strokeWidth={1.5}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-blue-200 drop-shadow-[0_0_6px_rgba(59,130,246,0.85)]">
                        {defTotal}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground text-center -mt-1 mb-2">
                      base {base.def} + INS {attrs.INS} + equip {armorTotal}
                      {armorRaw > 3 ? " (máx. 3)" : ""} + mod {sheet.stats.def_mod}
                      {upg.def ? ` + apr ${upg.def}` : ""}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
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
                        className="w-full flex items-center justify-between gap-2 mb-1.5 group"
                      >
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground cursor-pointer">
                          Equipamentos ({sheet.defense_items.length}/3)
                        </Label>
                        <ArrowUp
                          className={`w-3 h-3 text-muted-foreground transition-transform ${defEquipOpen ? "" : "rotate-180"}`}
                        />
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${defEquipOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                      >
                        <div className="flex justify-end mb-1.5">
                          {canEdit && sheet.defense_items.length < 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                update("defense_items", [
                                  ...sheet.defense_items,
                                  { id: genId(), nome: "", bonus: 0, rd: 0, peso: 0 },
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
                              { key: "bonus", label: "DEF", type: "number", width: 58 },
                              { key: "rd", label: "RD", type: "number", width: 58 },
                              { key: "peso", label: "Espaço", type: "number", width: 68 },
                            ]}
                            onChange={(v) => update("defense_items", v as DefenseItem[])}
                          />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 rounded-md border border-border/50 bg-background/30 px-2 py-1.5 text-center text-[10px] text-muted-foreground">
                      RD equipada: <strong className="text-foreground">{armorRd}</strong> ·
                      armaduras não acumulam entre si; vale a proteção mais alta.
                    </div>
                  </Card>
                </div>
              </Section>
            </div>

            {/* Equilibrium card */}
            <Section
              title="Equilíbrio"
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
                    onClick={() => addDirectionalTension(1)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  <span className="text-[9px] text-muted-foreground ml-1">−4…+4</span>
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
                  className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-background shadow-md transition-all duration-500"
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
                Faixa comum: −5 a +5. Valores além disso exigem fonte excepcional e ajuste do
                mestre.
              </p>
              <div className="grid gap-2 sm:grid-cols-3 mt-3 rounded-lg border border-border/70 bg-secondary/25 p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <p className="font-semibold text-foreground">{equilibriumEffect.state}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Benefício</span>
                  <p className="text-emerald-300">{equilibriumEffect.benefit}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Penalidade</span>
                  <p className="text-amber-300">{equilibriumEffect.penalty}</p>
                </div>
              </div>
            </Section>

            {/* Exposure card */}
            <Section title="Exposição">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs text-muted-foreground">
                  Rank base: <strong className="text-foreground">{base.rank}</strong>
                </span>
                <span className="font-cinzel text-lg font-bold text-primary">
                  {sheet.exposure}/100
                </span>
              </div>
              <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden border border-border">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 transition-all duration-500"
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
                    update("exposure", clamp(Math.round(Number(e.target.value) / 5) * 5, 0, 100))
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

            {/* Conditions */}
            <Section title="Condições">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {(Object.keys(CONDITION_META) as ConditionKey[]).map((c) => {
                  const meta = CONDITION_META[c];
                  const opts = (conditionOptions[c] ?? ["Normal"]).filter(
                    (option) => option !== "Normal",
                  );
                  const current = sheet.conditions[c];
                  return (
                    <div
                      key={c}
                      className="rounded-lg border border-border/60 bg-secondary/15 p-3"
                      style={
                        current.length > 0
                          ? {
                              borderColor: meta.color,
                              boxShadow: `0 0 0 1px ${meta.color}33`,
                            }
                          : undefined
                      }
                    >
                      <Label className="text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
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
                                      background: `rgba(${meta.rgb}, 0.2)`,
                                      color: meta.color,
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
                Os grupos organizam a leitura da ficha; o Atributo usado no teste continua sendo
                definido pela abordagem descrita na cena.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
                {skillGroups.map((g) => (
                  <div key={g.attr} className="bg-secondary/40 rounded-lg p-2.5">
                    <h4 className="font-cinzel text-xs font-bold mb-1.5">{g.label}</h4>
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
                        const tierName = tier === 0 ? "Sem treino" : TRAINING_TIERS[tier - 1].name;
                        const initialForSkill = Math.max(
                          0,
                          Math.min(2, sheet.initial_skill_degrees[s] || 0),
                        );
                        const isInitialDegree =
                          initialTrainingRemaining > 0 && tier < 2 && initialForSkill === tier;
                        const nextCost: number | null =
                          tier < 3 ? (isInitialDegree ? 0 : (trainingCosts[tier] ?? 0)) : null;
                        const refund: number =
                          tier > initialForSkill ? (trainingCosts[tier - 1] ?? 0) : 0;
                        const minimumRank = [5, 25, 50][tier] ?? 100;
                        const lacksRank = !isInitialDegree && base.rank < minimumRank;
                        const lacksPM = nextCost != null && pmAvailable < nextCost;
                        const upgrade = () => {
                          if (tier >= 3 || nextCost == null) return;
                          if (lacksRank) {
                            toast.error(`Este grau exige Rank ${minimumRank}.`);
                            return;
                          }
                          if (lacksPM) {
                            toast.error(`PM insuficientes (custa ${nextCost}).`);
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
                              isInitialDegree ? "grau inicial" : `${nextCost} PM`
                            }`,
                          );
                        };
                        const downgrade = () => {
                          if (tier <= 0) return;
                          if (role !== "mestre") {
                            toast.error("Apenas o mestre pode reverter.");
                            return;
                          }
                          const prevBonus = tier === 1 ? 0 : TRAINING_TIERS[tier - 2].bonus;
                          const prevName =
                            tier === 1 ? "Sem treino" : TRAINING_TIERS[tier - 2].name;
                          const previousTier = tier - 1;
                          setSheet((p) =>
                            p
                              ? {
                                  ...p,
                                  skills: { ...p.skills, [s]: prevBonus },
                                  initial_skill_degrees: {
                                    ...p.initial_skill_degrees,
                                    [s]: Math.min(initialForSkill, previousTier),
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
                                disabled={!canEdit}
                                className="w-full flex items-center justify-between text-xs px-1.5 py-1 rounded hover:bg-background/40 disabled:cursor-not-allowed"
                              >
                                <span>{s}</span>
                                <span className={color}>+{v}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-3" align="end">
                              <div className="font-cinzel font-bold text-sm mb-1">{s}</div>
                              <div className="text-[11px] text-muted-foreground mb-3">
                                Treino atual:{" "}
                                <span className={color}>
                                  {tierName}{" "}
                                  {tier > 0 ? `(+${TRAINING_TIERS[tier - 1].bonus})` : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  disabled={tier === 0 || role !== "mestre"}
                                  title={
                                    role === "mestre" ? `Reverter (+${refund} PM)` : "Apenas mestre"
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
                                            {isInitialDegree ? "grau inicial" : `${nextCost} PM`}
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
                                  disabled={!canEdit || tier >= 3 || lacksRank || lacksPM}
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
                          toast.error(`Esta Proficiência exige Rank ${minimumRank}.`);
                          return;
                        }
                        if (additionalCost > pmAvailable) {
                          toast.error(`PM insuficientes (faltam ${additionalCost - pmAvailable}).`);
                          return;
                        }
                        setSheet((previous) =>
                          previous
                            ? {
                                ...previous,
                                weapon_proficiency: next,
                                weapon_proficiency_family:
                                  next === "combatente" ? previous.weapon_proficiency_family : "",
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
                          update("weapon_proficiency_family", value as WeaponProficiencyFamily)
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
                        { key: "descricao", label: "Descrição / procedência", type: "textarea" },
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
                        { key: "dano", label: "Dano", placeholder: "ex: 1d6+1" },
                        { key: "tipo", label: "Tipo de dano" },
                        { key: "margemAmeaca", label: "Margem de ameaça", placeholder: "20" },
                        { key: "maos", label: "Mãos" },
                        { key: "propriedades", label: "Propriedades", type: "textarea" },
                        { key: "espaco", label: "Espaço", type: "number" },
                        { key: "fonte", label: "Munição / fonte" },
                        { key: "pd", label: "PD", type: "number" },
                        { key: "rd", label: "RD", type: "number" },
                        { key: "modificacoes", label: "Modificações", type: "textarea" },
                        { key: "condicoesUso", label: "Condições de uso", type: "textarea" },
                      ]}
                      onAdd={(w) => update("weapons", [...sheet.weapons, { ...w, id: genId() }])}
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
              {sheet.weapon_proficiency === "combatente" && !sheet.weapon_proficiency_family && (
                <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
                  Escolha Contato ou Projeção para concluir a Proficiência III.
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
                      { key: "descricao", label: "Descrição", type: "textarea" },
                      { key: "espaco", label: "Espaço", type: "number" },
                    ]}
                    onAdd={(it) =>
                      update("inventory", [...sheet.inventory, { ...it, id: genId() }])
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
                  <span className="text-destructive font-medium">Sobrecarregado!</span>
                )}
              </div>
              <div className="w-full h-1.5 bg-secondary rounded mb-3 overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${invUsed > invCapacity ? "bg-destructive" : "bg-primary"}`}
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
                    initial={{ id: "", nome: "", descricao: "", modificador: "" }}
                    fields={[
                      { key: "nome", label: "Nome" },
                      { key: "descricao", label: "Descrição", type: "textarea" },
                      { key: "modificador", label: "Modificador" },
                    ]}
                    onAdd={(a) => update("abilities", [...sheet.abilities, { ...a, id: genId() }])}
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
              title={fragmentsView ? "Fragmentos" : "Tramas"}
              extra={
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant={fragmentsView ? "default" : "outline"}
                    onClick={() => setFragmentsView((v) => !v)}
                    className="h-7 gap-1.5 transition-all"
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
                            { key: "descricao", label: "Descrição", type: "textarea" },
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
                            { key: "integridade", label: "Integridade atual", type: "number" },
                            { key: "natureza", label: "Natureza" },
                            { key: "dominio", label: "Domínio" },
                            { key: "assinatura", label: "Assinatura", type: "textarea" },
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
                            { key: "observacoes", label: "Observações", type: "textarea" },
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
                            { key: "efeito", label: "Efeito", type: "textarea" },
                            { key: "dt_descricao", label: "DT / Descrição", type: "textarea" },
                          ]}
                          onAdd={(p) => update("plots", [...sheet.plots, { ...p, id: genId() }])}
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
                        {sheet.fragments_items.reduce((s, i) => s + (Number(i.espaco) || 0), 0)}
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
                      { key: "integridade", label: "Int.", type: "number", width: 62 },
                      { key: "natureza", label: "Natureza" },
                      { key: "dominio", label: "Domínio" },
                      {
                        key: "limiteSeguro",
                        label: "Limite",
                        type: "select",
                        options: ["Repuxo", "Tração", "Estiramento"],
                      },
                      { key: "espaco", label: "Espaço", type: "number", width: 80 },
                    ]}
                    onChange={(v) => update("fragments_items", v as FragmentItem[])}
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

          <TabsContent
            value="arvore"
            className="mt-0 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
          >
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

          <TabsContent
            value="descricao"
            className="space-y-4 mt-0 animate-in fade-in-50 slide-in-from-bottom-1 duration-300"
          >
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
                    update("description", { ...sheet.description, [key]: e.target.value })
                  }
                  rows={6}
                  placeholder={`Escreva aqui sobre ${label.toLowerCase()}...`}
                />
              </Section>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Back to top */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-5 left-5 z-30 h-10 w-10 rounded-full bg-secondary/70 backdrop-blur border border-border text-muted-foreground hover:text-primary hover:border-primary/60 hover:scale-105 transition-all flex items-center justify-center shadow-md"
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </div>
  );
}

function Section({
  title,
  children,
  extra,
  id,
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  id?: string;
}) {
  return (
    <Card
      id={id}
      className="tadeon-surface rounded-2xl p-4 md:p-5 transition-all hover:border-primary/25 scroll-mt-32"
    >
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h2 className="font-cinzel font-semibold text-primary text-lg">{title}</h2>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
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
    <Card className="p-3 bg-card/60 border" style={borderStyle}>
      <div className="flex items-baseline justify-between">
        <div className={`font-cinzel font-bold text-sm ${color}`}>{label}</div>
        <span className="text-[10px] text-muted-foreground">{full}</span>
      </div>
      <div
        className={`text-2xl font-bold text-center my-1 ${color}`}
        style={{ textShadow: `0 0 10px rgba(${glowRgb}, 0.75)` }}
      >
        {current} / {max}
      </div>
      <div className="w-full h-1.5 bg-secondary rounded-full mb-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${clamp((current / Math.max(1, max)) * 100, 0, 100)}%` }}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={disabled || current <= 0}
          onClick={() => onCurrent(current - 1)}
        >
          <Minus className="w-3 h-3" />
        </Button>
        <Input
          type="number"
          min={0}
          max={Math.max(0, max)}
          disabled={disabled}
          value={current}
          onChange={(e) => onCurrent(Number(e.target.value))}
          className="h-7 text-center text-xs"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          disabled={disabled || current >= max}
          onClick={() => onCurrent(current + 1)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="mt-1.5">
        <Label className="text-[10px]">Mod</Label>
        <Input
          type="number"
          disabled={disabled}
          value={mod}
          onChange={(e) => onMod(Number(e.target.value))}
          className="h-6 text-xs"
        />
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
            disabled={disabled}
            onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            className={`w-7 h-7 rounded-full border-2 border-border transition-all hover:scale-110 ${i < value ? color : "bg-transparent"} disabled:cursor-not-allowed disabled:hover:scale-100`}
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
      <p className="text-xs text-muted-foreground italic text-center py-3">Nenhum item ainda.</p>
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
          className="bg-secondary/30 rounded-lg p-2 hover:bg-secondary/50 transition-all sm:grid gap-1.5 items-center flex flex-col animate-in fade-in-0 duration-200"
          style={{ gridTemplateColumns: gridCols }}
        >
          {columns.map((c) => {
            const value = (it as Record<string, unknown>)[c.key];
            if (c.type === "select") {
              return (
                <select
                  key={c.key}
                  disabled={!canEdit}
                  value={String(value ?? "")}
                  onChange={(e) => update(idx, c.key, e.target.value)}
                  className="h-8 text-xs bg-background/40 border border-border/40 rounded-md px-2 w-full"
                >
                  {c.options?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              );
            }
            return (
              <Input
                key={c.key}
                type={c.type === "number" ? "number" : "text"}
                placeholder={c.label}
                disabled={!canEdit}
                value={c.type === "number" ? Number(value ?? 0) : String(value ?? "")}
                onChange={(e) => update(idx, c.key, e.target.value)}
                className="h-8 text-xs bg-background/40 border-border/40 w-full"
              />
            );
          })}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 self-end sm:self-auto"
              onClick={() => remove(idx)}
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
