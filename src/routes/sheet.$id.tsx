import { PageHeader } from "@/components/page-header";
import { PageState } from "@/components/page-state";
import { ProtectedShell } from "@/components/protected-shell";
import { SheetAttributesSection } from "@/components/sheet/sheet-attributes-section";
import { SheetConditionsSection } from "@/components/sheet/sheet-conditions-section";
import { SheetExperienceBridge } from "@/components/sheet/sheet-experience-bridge";
import { SheetIdentitySection } from "@/components/sheet/sheet-identity-section";
import { SheetInventoryOrganizer } from "@/components/sheet/sheet-inventory-organizer";
import {
  type DefenseItem,
  type PowerFormData,
  type SheetData,
  clamp,
  tierFromBonus,
} from "@/components/sheet/sheet-model";
import { SheetSkillsSection } from "@/components/sheet/sheet-skills-section";
import { OverviewMetric, RowTable, Section } from "@/components/sheet/sheet-ui";
import { useSheetChrome } from "@/components/sheet/use-sheet-chrome";
import { SheetVitalsSection } from "@/components/sheet/sheet-vitals-section";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { conditionChipPresentation } from "@/lib/sheet-condition-presentation";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
// (Dialog imports removed ~ Power Form now lives in /sheet/$id/power route)

import { BrandMark } from "@/components/brand-mark";
import { ResistanceDtCalculator } from "@/components/master/resistance-dt-calculator";
import { SaveStatus } from "@/components/save-status";
import { AddItemDialog } from "@/components/sheet/add-item-dialog";
import { SkillTreeTab } from "@/components/sheet/skill-tree";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CANONICAL_SKILL_BRANCHES } from "@/lib/master-data";
import { cacheSheet } from "@/lib/offline-cache";
import { can } from "@/lib/permissions";
import {
  type Ability,
  type Attributes,
  type ConditionKey,
  type ConditionOptionsMap,
  type Description,
  type FragmentItem,
  type IdentityData,
  type InitialSkillDegrees,
  type InventoryItem,
  type Plot,
  type RankRow,
  type SkillBranch,
  type Stats,
  type UpgradeCosts,
  type Weapon,
  type WeaponProficiency,
  type WeaponProficiencyFamily,
  attributePointBudget,
  attributePointsUsed,
  attributeValueCap,
  calcTotalPM,
  calculatePMSpent,
  calculateSheetMaximums,
  CANONICAL_RANK_TABLE,
  CONDITION_META,
  DEFAULT_CONDITION_OPTIONS,
  DEFAULT_IDENTITY_DATA,
  DEFAULT_TRAINING_COSTS,
  DEFAULT_UPGRADE_COSTS,
  genId,
  getEquilibriumEffect,
  getRankBase,
  inferInitialSkillDegrees,
  normalizeConditions,
  SKILL_GROUPS,
  WEAPON_PROFICIENCIES,
  weaponProficiencyMinimumRank,
  weaponProficiencySpend,
} from "@/lib/sheet-types";
import { useSerializedAutosave } from "@/lib/use-serialized-autosave";
import "@/styles/sheet-premium.css";
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Compass,
  Gauge,
  Gem,
  GitBranch,
  Heart,
  IdCard,
  Loader2,
  Minus,
  NotebookPen,
  Plus,
  Save,
  ScrollText,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";

type SheetView = "ficha" | "arvore" | "descricao";

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
    links: [{ rel: "canonical", href: "https://tadeon-nexus.gtadeusz.workers.dev/" }],
  }),

  component: SheetRoute,
});

const RANGE_OPTIONS = ["Engajado", "Próximo", "Distante", "Longo", "Extremo"];
const PLOT_RANGE_OPTIONS = ["Pessoal", "Curto", "Médio", "Longo", "Extremo"];

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

function SheetRoute() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  return (
    <ProtectedShell>
      <SheetPage key={`${id}:${user?.id ?? "anonymous"}:${role ?? "pending"}`} />
    </ProtectedShell>
  );
}

function SheetPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheetHost, setSheetHost] = useState<HTMLDivElement | null>(null);
  useSheetChrome(sheetHost);
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [branches, setBranches] = useState<SkillBranch[]>([]);
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(DEFAULT_UPGRADE_COSTS);
  const [conditionOptions, setConditionOptions] =
    useState<ConditionOptionsMap>(DEFAULT_CONDITION_OPTIONS);
  const [sheetSkillGroups, setSheetSkillGroups] = useState<typeof SKILL_GROUPS>([]);
  const [trainingCosts, setTrainingCosts] =
    useState<[number, number, number]>(DEFAULT_TRAINING_COSTS);
  // (removed setPowerFormOpen ~ Power Form opens via dedicated route)
  const [fragmentsView, setFragmentsView] = useState(false);
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
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const [{ data, error }, { data: settingsJson }] = await Promise.all([
          supabase
            .from("character_sheets")
            .select("*")
            .eq("id", id)
            .abortSignal(controller.signal)
            .maybeSingle(),
          // Use SECURITY DEFINER RPC: returns only player-safe fields, so jogadores/espectadores
          // cannot read NPCs/clues/scenes from the master settings table.
          supabase.rpc("get_public_game_settings").abortSignal(controller.signal),
        ]);
        if (controller.signal.aborted) return;
        if (error || !data) {
          setLoadError(
            "A ficha pode estar indisponível ou seu acesso pode ter mudado. Tente novamente ou volte ao arquivo.",
          );
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
        const defItems = ((raw.defense_items as Partial<DefenseItem>[] | null) ?? []).map(
          (item) => ({
            id: item.id ?? genId(),
            nome: item.nome ?? "",
            bonus: Number(item.bonus ?? 0),
            rd: Number(item.rd ?? 0),
            peso: Number(item.peso ?? 0),
          }),
        );
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
        const storedInitialDegrees =
          (raw.initial_skill_degrees as InitialSkillDegrees | null) ?? {};
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
      } catch {
        if (!controller.signal.aborted)
          setLoadError(
            "Não foi possível carregar a ficha. Verifique sua conexão e tente novamente.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [id, loadAttempt]);

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
    const timer = window.setTimeout(
      () => cacheSheet(sheet, user && role ? { userId: user.id, role } : null),
      600,
    );
    return () => window.clearTimeout(timer);
  }, [sheet, user, role]);

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

  if (loadError)
    return (
      <PageState
        icon={AlertTriangle}
        title="A ficha não pôde ser aberta"
        description={loadError}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => setLoadAttempt((n) => n + 1)}>Tentar novamente</Button>
            <Button variant="outline" onClick={() => navigate({ to: "/" })}>
              Voltar ao arquivo
            </Button>
          </div>
        }
      />
    );

  if (loading || !sheet) {
    return (
      <div className="flex justify-center py-16" role="status" aria-label="Carregando ficha">
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
    { id: "sec-info", label: "Identidade" },
    { id: "sec-attr", label: "Atributos" },
    { id: "sec-pontos", label: "Pontos" },
    { id: "equilibrio", label: "Equilíbrio" },
    { id: "exposicao", label: "Exposição" },
    { id: "condicoes", label: "Condições" },
    { id: "sec-pericias", label: "Perícias" },
    { id: "sec-inv", label: "Inventário" },
    { id: "sec-armas", label: "Armas" },
    { id: "sec-hab", label: "Habilidades" },
    { id: "tramas-fragmentos", label: "Tramas e fragmentos" },
    { id: "sec-notas", label: "Anotações" },
  ];
  const jumpTo = (id: string) => {
    const el = document.getElementById(id);
    el?.querySelector("h2")?.focus({ preventScroll: true });
    if (el)
      el.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  };

  const equilibrium = clamp(Math.round(sheet.equilibrium || 0), -10, 10);
  const equilibriumPct = ((equilibrium + 10) / 20) * 100;
  const equilibriumEffect = getEquilibriumEffect(equilibrium);
  const tutorial = tutorialStep === null ? null : SHEET_TUTORIAL_STEPS[tutorialStep];

  return (
    <div
      ref={setSheetHost}
      data-page-layout
      data-sheet-presentation="fabric"
      className="tadeon-page tadeon-sheet-page pb-28"
    >
      <PageHeader
        section="sheet"
        eyebrow="Ficha de continuidade"
        title={sheet.name || "Ficha"}
        className="tadeon-sheet-commandbar"
        actions={
          <div className="tadeon-sheet-commandbar__actions">
            {" "}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: "/" })}
              aria-label="Voltar ao painel"
              className="tadeon-sheet-commandbar__back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <SheetExperienceBridge sheetId={id} dropTarget={sheetHost} canEdit={canEdit} />
            {!canEdit && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                somente leitura
              </span>
            )}
            {canEdit && (
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
                  compact={typeof window !== "undefined" && window.innerWidth < 640}
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
                    className="tadeon-sheet-power-button gap-1.5 font-bold tracking-widest"
                    title="Abrir Forma de Poder (VP)"
                  >
                    <Sparkles className="w-4 h-4" /> VP
                  </Button>
                )}
                <Button size="sm" onClick={doSave} className="tadeon-sheet-save-button gap-1.5">
                  <Save className="w-4 h-4" /> <span className="hidden sm:inline">Salvar</span>
                </Button>
              </>
            )}
          </div>
        }
      >
        {" "}
        {activeConditions.length > 0 && (
          <div className="tadeon-sheet-condition-rail" aria-label="Condições ativas">
            {activeConditions.map((key) => {
              const meta = CONDITION_META[key];
              const presentation = conditionChipPresentation(
                `${meta.label}: ${sheet.conditions[key].join(", ")}`,
              );
              return (
                <span
                  key={key}
                  className="tadeon-sheet-condition-chip"
                  data-condition-severity={presentation.severity}
                  style={{
                    ...presentation.style,
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
      </PageHeader>

      {tutorial && (
        <Card
          className="tadeon-sheet-tutorial mb-4 border-primary/40 bg-[linear-gradient(135deg,rgba(116,36,45,.16),rgba(217,215,164,.05))] p-4"
          role="dialog"
          aria-label="Guia opcional da ficha"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="tadeon-eyebrow">
                Guia da ficha · etapa {(tutorialStep ?? 0) + 1} de {SHEET_TUTORIAL_STEPS.length}
              </p>
              <h2 className="mt-1 font-cinzel text-lg font-semibold">{tutorial.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tutorial.detail}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => setTutorialStep(null)}>
                Encerrar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={tutorialStep === 0}
                onClick={() => setTutorialStep((step) => Math.max(0, (step ?? 0) - 1))}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  setTutorialStep((step) =>
                    (step ?? 0) >= SHEET_TUTORIAL_STEPS.length - 1 ? null : (step ?? 0) + 1,
                  )
                }
              >
                {(tutorialStep ?? 0) >= SHEET_TUTORIAL_STEPS.length - 1 ? "Concluir" : "Próxima"}
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
            <TabsTrigger value="arvore" className="flex-1 gap-2 md:flex-initial">
              <GitBranch className="h-4 w-4" aria-hidden="true" />
              <span>Maestria</span>
            </TabsTrigger>
            <TabsTrigger value="descricao" className="flex-1 gap-2 md:flex-initial">
              <ScrollText className="h-4 w-4" aria-hidden="true" />
              <span>História</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent data-sheet-content value="ficha" className="mt-0 space-y-4">
            {/* Quick jump shortcuts */}
            <nav className="tadeon-sheet-jumpbar" aria-label="Ir para uma seção da ficha">
              <span className="tadeon-sheet-jumpbar__label">Neste dossiê</span>
              <select
                className="tadeon-sheet-index-select"
                aria-label="Localizar seção da ficha"
                value=""
                onChange={(event) => jumpTo(event.target.value)}
              >
                <option value="" disabled>
                  Localizar seção…
                </option>
                {sectionAnchors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
              <div className="tadeon-sheet-jumpbar__links">
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
              </div>
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
                value={equilibrium > 0 ? `+${equilibrium}` : String(equilibrium)}
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

            <SheetIdentitySection sheet={sheet} canEdit={canEdit} update={update} />

            {/* Attributes (with radar) + Vital points */}
            <div className="tadeon-sheet-core-grid grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SheetAttributesSection
                attrs={attrs}
                canEdit={canEdit}
                update={update}
                attributeRemaining={attributeRemaining}
                attributesOverCap={attributesOverCap}
                attributeUsed={attributeUsed}
                attributeBudget={attributeBudget}
                attributeCap={attributeCap}
                zeroAttributes={zeroAttributes}
                radarData={radarData}
              />

              <SheetVitalsSection
                sheet={sheet}
                canEdit={canEdit}
                update={update}
                maximums={maximums}
                base={base}
                armorTotal={armorTotal}
                armorRaw={armorRaw}
                armorRd={armorRd}
              />
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
                    <span className="text-[10px] text-muted-foreground ml-1">−4…+4</span>
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
              <Section
                id="exposicao"
                title="Exposição"
                className="tadeon-state-panel tadeon-exposure-panel"
              >
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
            </div>

            {/* Conditions */}
            <SheetConditionsSection
              sheet={sheet}
              canEdit={canEdit}
              update={update}
              conditionOptions={conditionOptions}
            />

            {/* Skills */}
            <SheetSkillsSection
              sheet={sheet}
              canEdit={canEdit}
              update={update}
              skillGroups={skillGroups}
              initialTrainingUsed={initialTrainingUsed}
              trainingUsed={trainingUsed}
              initialTrainingRemaining={initialTrainingRemaining}
              trainingCosts={trainingCosts}
              pmAvailable={pmAvailable}
              base={base}
              role={role}
              setSheet={setSheet}
            />

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
                <>
                  <SheetInventoryOrganizer sheetId={id} canEdit={canEdit} />
                  {canEdit && (
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
                        update("inventory", [...sheet.inventory, { ...it, id: genId() }])
                      }
                    />
                  )}{" "}
                </>
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

          <TabsContent data-sheet-content value="arvore" className="mt-0">
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
            data-sheet-content
            value="descricao"
            className="tadeon-description-tab mt-0 space-y-4"
          >
            <Card className="tadeon-description-hero">
              <div className="tadeon-description-hero__mark" aria-hidden="true">
                <ScrollText />
              </div>
              <div className="min-w-0 flex-1">
                <p className="tadeon-eyebrow">Arquivo narrativo</p>
                <h2>Quem existe além dos números</h2>
                <p>
                  Registre passado, maneira de agir, desejos e detalhes de continuidade. Cada campo
                  permanece livre, mas agora oferece uma direção clara para escrever.
                </p>
              </div>
              <div className="tadeon-description-hero__progress">
                <strong>
                  {
                    (Object.values(sheet.description) as string[]).filter(
                      (value) => value.trim().length > 0,
                    ).length
                  }
                  <small>/4</small>
                </strong>
                <span>registros iniciados</span>
              </div>
            </Card>
            <div className="tadeon-description-grid">
              {(
                [
                  {
                    key: "historia",
                    label: "História",
                    kicker: "Antes da primeira cena",
                    prompt:
                      "Origem, acontecimentos decisivos, perdas, descobertas e o caminho que trouxe a personagem até aqui.",
                    placeholder: "Quais acontecimentos ainda repercutem no presente?",
                    icon: BookOpen,
                  },
                  {
                    key: "personalidade",
                    label: "Personalidade",
                    kicker: "Presença em cena",
                    prompt:
                      "Gestos, contradições, afetos, hábitos e a forma como reage quando está sob pressão.",
                    placeholder: "Como esta personagem pensa, sente e ocupa um ambiente?",
                    icon: Heart,
                  },
                  {
                    key: "objetivos",
                    label: "Objetivos",
                    kicker: "Vetores de mudança",
                    prompt:
                      "Desejos imediatos, ambições distantes e aquilo que não está disposta a sacrificar para alcançá-los.",
                    placeholder: "O que ela busca ~ e qual preço se recusa a pagar?",
                    icon: Target,
                  },
                  {
                    key: "observacoes",
                    label: "Observações",
                    kicker: "Continuidade fina",
                    prompt:
                      "Voz, aparência, hábitos, promessas, objetos recorrentes e detalhes úteis para as próximas sessões.",
                    placeholder: "Registre detalhes que não podem se perder entre as sessões.",
                    icon: NotebookPen,
                  },
                ] as const
              ).map(({ key, label, kicker, prompt, placeholder, icon: Icon }, index) => {
                const value = sheet.description[key] || "";
                const words = value.trim() ? value.trim().split(/\s+/).length : 0;
                return (
                  <Card
                    key={key}
                    className="tadeon-description-card"
                    data-filled={value.trim() ? "true" : "false"}
                    style={{ "--description-index": index } as React.CSSProperties}
                  >
                    <div className="tadeon-description-card__heading">
                      <span className="tadeon-description-card__icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <div className="min-w-0">
                        <small>{kicker}</small>
                        <h3>{label}</h3>
                      </div>
                      <span className="tadeon-description-card__count">{words} palavras</span>
                    </div>
                    <p className="tadeon-description-card__prompt">{prompt}</p>
                    <Textarea
                      disabled={!canEdit}
                      value={value}
                      onChange={(event) =>
                        update("description", {
                          ...sheet.description,
                          [key]: event.target.value,
                        })
                      }
                      rows={8}
                      placeholder={placeholder}
                    />
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <nav className="tadeon-sheet-mobile-dock md:hidden" aria-label="Ações rápidas da ficha">
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
