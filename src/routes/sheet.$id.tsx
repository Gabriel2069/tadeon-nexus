import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Loader2, Plus, Minus, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import {
  type Attributes, type Stats, type Conditions, type StatUpgrades,
  type Weapon, type InventoryItem, type Ability, type Plot,
  type RankRow, type SkillBranch, type UpgradeCosts, type ConditionOptionsMap,
  type ConditionKey, type Description,
  SKILL_GROUPS, getRankBase, genId,
  DEFAULT_UPGRADE_COSTS, DEFAULT_CONDITION_OPTIONS, CONDITION_META,
} from "@/lib/sheet-types";
import { AddItemDialog } from "@/components/sheet/add-item-dialog";
import { SkillTreeTab } from "@/components/sheet/skill-tree";

export const Route = createFileRoute("/sheet/$id")({
  head: () => ({ meta: [{ title: "Ficha — Tadeon Nexus" }] }),
  component: () => (
    <ProtectedShell>
      <SheetPage />
    </ProtectedShell>
  ),
});

interface SheetData {
  id: string; owner_id: string; owner_email: string;
  name: string; occupation: string; age: string; brand: string; origin: string; motivation: string;
  exposure: number; equilibrium: number;
  attributes: Attributes; stats: Stats;
  condition: string; conditions: Conditions;
  dying: number; going_insane: number;
  skill_bonus: string; skills: Record<string, number>;
  weapons: Weapon[]; inventory: InventoryItem[]; inventory_capacity: number;
  abilities: Ability[]; plots: Plot[];
  fragments: number; pm_spent: number;
  stat_upgrades: StatUpgrades; purchased_skills: string[];
  notes: string;
  description: Description;
}

const RANGE_OPTIONS = ["Curto", "Médio", "Longo", "Extremo"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Equilibrium color from -10 (dark red) → 0 (mid) → +10 (near white yellow)
function equilibriumColor(value: number): string {
  const v = clamp(value, -10, 10);
  if (v < 0) {
    // -10 → very dark red, 0 → bright red
    const t = (v + 10) / 10; // 0..1
    const l = 18 + t * 32; // lightness 18..50
    return `hsl(0, 75%, ${l}%)`;
  }
  // 0 → orange-yellow, +10 → near white-yellow
  const t = v / 10; // 0..1
  const l = 55 + t * 40; // 55..95
  const s = 95 - t * 25; // 95..70
  return `hsl(50, ${s}%, ${l}%)`;
}

function SheetPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [branches, setBranches] = useState<SkillBranch[]>([]);
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(DEFAULT_UPGRADE_COSTS);
  const [conditionOptions, setConditionOptions] = useState<ConditionOptionsMap>(DEFAULT_CONDITION_OPTIONS);
  const [sheetSkillGroups, setSheetSkillGroups] = useState<typeof SKILL_GROUPS>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const canEdit = role === "mestre" || (sheet?.owner_id === user?.id && role !== "espectador");

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settings }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
        supabase.from("game_settings")
          .select("rank_table,skill_branches,upgrade_costs,condition_options,skill_groups")
          .eq("key", "global").maybeSingle(),
      ]);
      if (error || !data) {
        toast.error("Ficha não encontrada.");
        void navigate({ to: "/" });
        return;
      }
      const raw = data as unknown as Record<string, unknown>;
      // Ensure description exists
      const desc = (raw.description as Description | null) ?? {
        historia: "", personalidade: "", objetivos: "", observacoes: "",
      };
      setSheet({ ...(data as unknown as SheetData), description: desc });
      if (settings) {
        const g = settings as unknown as Record<string, unknown>;
        setRankTable((g.rank_table as RankRow[] | undefined) ?? []);
        setBranches((g.skill_branches as SkillBranch[] | undefined) ?? []);
        setUpgradeCosts((g.upgrade_costs as UpgradeCosts | undefined) ?? DEFAULT_UPGRADE_COSTS);
        setConditionOptions((g.condition_options as ConditionOptionsMap | undefined) ?? DEFAULT_CONDITION_OPTIONS);
        setSheetSkillGroups((g.skill_groups as typeof SKILL_GROUPS | undefined) ?? []);
      }
      setLoading(false);
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!sheet || !canEdit) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const doSave = async () => {
    if (!sheet) return;
    setSaving(true);
    const { id: _id, ...payload } = sheet;
    const { error } = await supabase.from("character_sheets").update(payload as never).eq("id", sheet.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
  };

  const update = <K extends keyof SheetData>(key: K, value: SheetData[K]) => {
    setSheet((p) => (p ? { ...p, [key]: value } : p));
  };

  const radarData = useMemo(() => {
    if (!sheet) return [];
    return (Object.keys(sheet.attributes) as (keyof Attributes)[])
      .map((k) => ({ attr: k, value: sheet.attributes[k] }));
  }, [sheet]);

  // Active conditions for colored border
  const activeConditions = useMemo(() => {
    if (!sheet) return [] as ConditionKey[];
    return (Object.keys(CONDITION_META) as ConditionKey[])
      .filter((k) => (sheet.conditions[k] || "Normal") !== "Normal");
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
      layers.push(`0 0 ${blur + 6}px ${1 + dying}px rgba(0, 0, 0, ${Math.min(0.9, intensity + 0.1)})`);
    }
    const insane = sheet?.going_insane ?? 0;
    if (insane > 0) {
      const intensity = 0.35 + insane * 0.2;
      const blur = 14 + insane * 10;
      layers.push(`0 0 ${blur}px ${2 + insane}px rgba(255, 245, 180, ${intensity})`);
      layers.push(`0 0 ${blur + 8}px ${1 + insane}px rgba(255, 255, 255, ${Math.min(0.85, intensity)})`);
    }
    return layers.length ? layers.join(", ") : undefined;
  }, [activeConditions, sheet?.dying, sheet?.going_insane]);

  if (loading || !sheet) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const attrs = sheet.attributes;
  const base = getRankBase(sheet.exposure, rankTable);
  const upg = sheet.stat_upgrades;
  const pvMax = base.pv + sheet.stats.pv_mod + 3 * attrs.COR + 3 * upg.pv;
  const psMax = base.ps + sheet.stats.ps_mod + 3 * attrs.MEN + 3 * upg.ps;
  const peMax = base.pe + sheet.stats.pe_mod + 3 * attrs.ERU + 2 * upg.pe;
  const defTotal = base.def + sheet.stats.def_equip + sheet.stats.def_mod + upg.def;
  const invCapacity = 5 + 3 * attrs.COR;
  const invUsed =
    sheet.weapons.reduce((s, w) => s + (Number(w.peso) || 0), 0) +
    sheet.inventory.reduce((s, i) => s + (Number(i.espaco) || 0), 0);

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

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 -mx-3 md:-mx-6 px-3 md:px-6 py-3 mb-4 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-cinzel text-lg md:text-2xl font-bold flex-1 truncate">
            {sheet.name || "Ficha"}
          </h1>
          {!canEdit && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">somente leitura</span>
          )}
          {canEdit && (
            <div className="flex items-center gap-2">
              {saving && (
                <span className="text-[10px] text-muted-foreground hidden sm:flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
                </span>
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
              <span key={k} className="text-[10px] px-2 py-0.5 rounded-full border font-medium"
                style={{ borderColor: CONDITION_META[k].color, color: CONDITION_META[k].color, background: `rgba(${CONDITION_META[k].rgb}, 0.08)` }}>
                {CONDITION_META[k].label}: {sheet.conditions[k]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl transition-shadow duration-500"
        style={{ boxShadow: borderShadow, padding: borderShadow ? "2px" : 0 }}>
      <Tabs defaultValue="ficha" className="space-y-4">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="ficha" className="flex-1 md:flex-initial">Ficha</TabsTrigger>
          <TabsTrigger value="arvore" className="flex-1 md:flex-initial">Árvore</TabsTrigger>
          <TabsTrigger value="descricao" className="flex-1 md:flex-initial">Descrição</TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="space-y-4 mt-0">
          {/* Quick jump shortcuts */}
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {sectionAnchors.map((a) => (
              <button key={a.id} type="button" onClick={() => jumpTo(a.id)}
                className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-secondary/40 hover:bg-primary/15 hover:border-primary/50 hover:text-primary transition-all font-medium">
                {a.label}
              </button>
            ))}
          </div>
          <Section id="sec-info" title="Identidade">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome" value={sheet.name} onChange={(v) => update("name", v)} disabled={!canEdit} />
              <Field label="Ocupação" value={sheet.occupation} onChange={(v) => update("occupation", v)} disabled={!canEdit} />
              <Field label="Idade" value={sheet.age} onChange={(v) => update("age", v)} disabled={!canEdit} />
              <Field label="Marca" value={sheet.brand} onChange={(v) => update("brand", v)} disabled={!canEdit} />
              <Field label="Origem" value={sheet.origin} onChange={(v) => update("origin", v)} disabled={!canEdit} />
              <Field label="Motivação" value={sheet.motivation} onChange={(v) => update("motivation", v)} disabled={!canEdit} />
            </div>
          </Section>

          {/* Attributes (with radar) + Vital points */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Section id="sec-attr" title="Atributos">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="space-y-1.5">
                  {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => (
                    <div key={k} className="flex items-center justify-between gap-2 bg-secondary/40 rounded px-2 py-1">
                      <span className="font-cinzel text-sm">{k}</span>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!canEdit || attrs[k] <= 0}
                          onClick={() => update("attributes", { ...attrs, [k]: Math.max(0, attrs[k] - 1) })}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-5 text-center font-bold">{attrs[k]}</span>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!canEdit || attrs[k] >= 5}
                          onClick={() => update("attributes", { ...attrs, [k]: Math.min(5, attrs[k] + 1) })}>
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-48 sm:h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="80%">
                      <PolarGrid stroke="#a855f7" strokeOpacity={0.35} />
                      <PolarAngleAxis dataKey="attr" tick={{ fill: "#c084fc", fontSize: 11, fontFamily: "Cinzel, serif" }} />
                      <PolarRadiusAxis angle={90} domain={[0, 5]} tick={false} stroke="#a855f7" strokeOpacity={0.4} />
                      <Radar dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>

            <Section id="sec-pontos" title="Pontos Vitais">
              <div className="grid grid-cols-2 gap-2.5">
                <StatBlock label="PV" full="Vitalidade" color="text-red-400" barColor="from-red-600 to-red-400"
                  current={sheet.stats.pv_current} mod={sheet.stats.pv_mod} max={pvMax} disabled={!canEdit}
                  onCurrent={(v) => update("stats", { ...sheet.stats, pv_current: v })}
                  onMod={(v) => update("stats", { ...sheet.stats, pv_mod: v })} />
                <StatBlock label="PE" full="Energia" color="text-emerald-400" barColor="from-emerald-600 to-emerald-400"
                  current={sheet.stats.pe_current} mod={sheet.stats.pe_mod} max={peMax} disabled={!canEdit}
                  onCurrent={(v) => update("stats", { ...sheet.stats, pe_current: v })}
                  onMod={(v) => update("stats", { ...sheet.stats, pe_mod: v })} />
                <StatBlock label="PS" full="Sanidade" color="text-purple-400" barColor="from-purple-600 to-purple-400"
                  current={sheet.stats.ps_current} mod={sheet.stats.ps_mod} max={psMax} disabled={!canEdit}
                  onCurrent={(v) => update("stats", { ...sheet.stats, ps_current: v })}
                  onMod={(v) => update("stats", { ...sheet.stats, ps_mod: v })} />
                <Card className="p-3 bg-card/60">
                  <div className="text-blue-400 font-cinzel font-bold text-sm">Defesa</div>
                  <div className="text-3xl font-bold text-center my-2">{defTotal}</div>
                  <div className="text-[10px] text-muted-foreground text-center -mt-1 mb-2">
                    base {base.def} + equip {sheet.stats.def_equip} + mod {sheet.stats.def_mod}{upg.def ? ` + apr ${upg.def}` : ""}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[10px]">Equip</Label>
                      <Input type="number" disabled={!canEdit} value={sheet.stats.def_equip} className="h-7"
                        onChange={(e) => update("stats", { ...sheet.stats, def_equip: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-[10px]">Mod</Label>
                      <Input type="number" disabled={!canEdit} value={sheet.stats.def_mod} className="h-7"
                        onChange={(e) => update("stats", { ...sheet.stats, def_mod: Number(e.target.value) })} />
                    </div>
                  </div>
                </Card>
              </div>
            </Section>
          </div>

          {/* Equilibrium card */}
          <Section title="Equilíbrio">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>-10</span><span className="font-bold text-foreground text-base">{equilibrium > 0 ? `+${equilibrium}` : equilibrium}</span><span>+10</span>
            </div>
            <div className="relative w-full h-7 bg-secondary rounded-full overflow-hidden border border-border">
              {/* Static dual gradient background */}
              <div className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, hsl(0,75%,18%) 0%, hsl(0,75%,50%) 50%, hsl(50,95%,55%) 50%, hsl(50,70%,95%) 100%)",
                  opacity: 0.25,
                }} />
              {/* Center marker */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-foreground/40" />
              {/* Indicator pill */}
              <div className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 border-background shadow-md transition-all duration-500"
                style={{ left: `calc(${equilibriumPct}% - 10px)`, background: equilibriumColor(equilibrium) }} />
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Input type="number" min={-10} max={10} disabled={!canEdit} value={sheet.equilibrium}
                onChange={(e) => update("equilibrium", clamp(Number(e.target.value), -10, 10))}
                className="w-24 h-8" />
              <input type="range" min={-10} max={10} step={1} disabled={!canEdit} value={sheet.equilibrium}
                onChange={(e) => update("equilibrium", Number(e.target.value))} className="flex-1" />
            </div>
          </Section>

          {/* Exposure card */}
          <Section title="Exposição">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs text-muted-foreground">Rank base: <strong className="text-foreground">{base.rank}</strong></span>
              <span className="font-cinzel text-lg font-bold text-primary">{sheet.exposure}/100</span>
            </div>
            <div className="relative w-full h-4 bg-secondary rounded-full overflow-hidden border border-border">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 transition-all duration-500"
                style={{ width: `${clamp(sheet.exposure, 0, 100)}%` }} />
              {/* Rank tick marks every 5 */}
              {Array.from({ length: 21 }).map((_, i) => (
                <div key={i} className="absolute top-0 bottom-0 w-px bg-background/40" style={{ left: `${i * 5}%` }} />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-3">
              <Input type="number" min={0} max={100} step={5} disabled={!canEdit} value={sheet.exposure}
                onChange={(e) => update("exposure", clamp(Math.round(Number(e.target.value) / 5) * 5, 0, 100))}
                className="w-24 h-8" />
              <input type="range" min={0} max={100} step={5} disabled={!canEdit} value={sheet.exposure}
                onChange={(e) => update("exposure", Number(e.target.value))} className="flex-1" />
            </div>
          </Section>

          {/* Conditions */}
          <Section title="Condições">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.keys(CONDITION_META) as ConditionKey[]).map((c) => {
                const meta = CONDITION_META[c];
                const opts = conditionOptions[c] ?? ["Normal"];
                const cur = sheet.conditions[c] || "Normal";
                const active = cur !== "Normal";
                return (
                  <div key={c}>
                    <Label className="text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </Label>
                    <select disabled={!canEdit} value={cur}
                      onChange={(e) => update("conditions", { ...sheet.conditions, [c]: e.target.value })}
                      className="w-full bg-input border rounded-md px-2 py-1.5 text-sm transition-colors"
                      style={active ? { borderColor: meta.color, boxShadow: `0 0 0 1px ${meta.color}55` } : undefined}>
                      {opts.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <CounterDots label="Morrendo" max={3} value={sheet.dying} color="bg-red-500" disabled={!canEdit}
                onChange={(v) => update("dying", v)} />
              <CounterDots label="Enlouquecendo" max={3} value={sheet.going_insane} color="bg-purple-500" disabled={!canEdit}
                onChange={(v) => update("going_insane", v)} />
            </div>
          </Section>

          {/* Skills */}
          <Section id="sec-pericias" title="Perícias"
            extra={
              <Input placeholder="Bônus temporário" disabled={!canEdit} value={sheet.skill_bonus}
                onChange={(e) => update("skill_bonus", e.target.value)}
                className="h-7 w-44 text-xs" />
            }>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
              {SKILL_GROUPS.map((g) => (
                <div key={g.attr} className="bg-secondary/40 rounded-lg p-2.5">
                  <h4 className="font-cinzel text-xs font-bold mb-1.5">{g.label} ({g.attr})</h4>
                  <div className="space-y-0.5">
                    {g.skills.map((s) => {
                      const v = sheet.skills[s] ?? 0;
                      const color =
                        v >= 15 ? "text-yellow-400 font-bold" :
                        v >= 10 ? "text-blue-400 font-semibold" :
                        v >= 5 ? "text-green-400" : "text-muted-foreground";
                      return (
                        <button key={s} disabled={!canEdit}
                          onClick={() => update("skills", { ...sheet.skills, [s]: v >= 15 ? 0 : v + 5 })}
                          className="w-full flex items-center justify-between text-xs px-1.5 py-1 rounded hover:bg-background/40 disabled:cursor-not-allowed">
                          <span>{s}</span>
                          <span className={color}>+{v}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Weapons */}
          <Section id="sec-armas" title="Armas" extra={
            canEdit && (
              <AddItemDialog<Weapon>
                title="Nova Arma" triggerLabel="Adicionar Arma"
                initial={{ id: "", nome: "", tipo: "", alcance: "Curto", dano: "", critico: "", peso: 0, extra: "" }}
                fields={[
                  { key: "nome", label: "Nome" },
                  { key: "tipo", label: "Tipo" },
                  { key: "alcance", label: "Alcance", type: "select", options: RANGE_OPTIONS },
                  { key: "dano", label: "Dano", placeholder: "ex: 1d6+1" },
                  { key: "critico", label: "Crítico", placeholder: "ex: 19/x2" },
                  { key: "peso", label: "Peso", type: "number" },
                  { key: "extra", label: "Extra" },
                ]}
                onAdd={(w) => update("weapons", [...sheet.weapons, { ...w, id: genId() }])} />
            )
          }>
            <RowTable rows={sheet.weapons} canEdit={canEdit}
              columns={[
                { key: "nome", label: "Nome", flex: 1.5 },
                { key: "tipo", label: "Tipo" },
                { key: "alcance", label: "Alcance" },
                { key: "dano", label: "Dano" },
                { key: "critico", label: "Crítico" },
                { key: "peso", label: "Peso", type: "number", width: 70 },
                { key: "extra", label: "Extra", flex: 1.2 },
              ]}
              onChange={(v) => update("weapons", v as Weapon[])} />
          </Section>

          {/* Inventory */}
          <Section title="Inventário" extra={
            canEdit && (
              <AddItemDialog<InventoryItem>
                title="Novo Item" triggerLabel="Adicionar Item"
                initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
                fields={[
                  { key: "nome", label: "Nome" },
                  { key: "descricao", label: "Descrição", type: "textarea" },
                  { key: "espaco", label: "Espaço", type: "number" },
                ]}
                onAdd={(it) => update("inventory", [...sheet.inventory, { ...it, id: genId() }])} />
            )
          }>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">{invUsed} / {invCapacity} espaço</span>
              {invUsed > invCapacity && <span className="text-destructive font-medium">Sobrecarregado!</span>}
            </div>
            <div className="w-full h-1.5 bg-secondary rounded mb-3 overflow-hidden">
              <div className={`h-full rounded transition-all ${invUsed > invCapacity ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${clamp((Math.max(0, invUsed) / Math.max(1, invCapacity)) * 100, 0, 100)}%` }} />
            </div>
            <RowTable rows={sheet.inventory} canEdit={canEdit}
              columns={[
                { key: "nome", label: "Nome", flex: 1.2 },
                { key: "descricao", label: "Descrição", flex: 2 },
                { key: "espaco", label: "Espaço", type: "number", width: 80 },
              ]}
              onChange={(v) => update("inventory", v as InventoryItem[])} />
          </Section>

          {/* Abilities */}
          <Section title="Habilidades" extra={
            canEdit && (
              <AddItemDialog<Ability>
                title="Nova Habilidade" triggerLabel="Adicionar Habilidade"
                initial={{ id: "", nome: "", descricao: "", modificador: "" }}
                fields={[
                  { key: "nome", label: "Nome" },
                  { key: "descricao", label: "Descrição", type: "textarea" },
                  { key: "modificador", label: "Modificador" },
                ]}
                onAdd={(a) => update("abilities", [...sheet.abilities, { ...a, id: genId() }])} />
            )
          }>
            <RowTable rows={sheet.abilities} canEdit={canEdit}
              columns={[
                { key: "nome", label: "Nome", flex: 1.2 },
                { key: "descricao", label: "Descrição", flex: 2.5 },
                { key: "modificador", label: "Modificador", flex: 1 },
              ]}
              onChange={(v) => update("abilities", v as Ability[])} />
          </Section>

          {/* Plots */}
          <Section title="Tramas" extra={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Label className="text-xs">Fragmentos</Label>
                <Input type="number" disabled={!canEdit} value={sheet.fragments}
                  onChange={(e) => update("fragments", Number(e.target.value))} className="w-16 h-7" />
              </div>
              {canEdit && (
                <AddItemDialog<Plot>
                  title="Nova Trama" triggerLabel="Trama"
                  initial={{ id: "", nome: "", uso: "", alcance: "", dano: "", efeito: "", dt_descricao: "" }}
                  fields={[
                    { key: "nome", label: "Nome" },
                    { key: "uso", label: "Uso" },
                    { key: "alcance", label: "Alcance" },
                    { key: "dano", label: "Dano" },
                    { key: "efeito", label: "Efeito", type: "textarea" },
                    { key: "dt_descricao", label: "DT / Descrição", type: "textarea" },
                  ]}
                  onAdd={(p) => update("plots", [...sheet.plots, { ...p, id: genId() }])} />
              )}
            </div>
          }>
            <p className="text-xs text-muted-foreground mb-2">DT Canalização base: {3 * attrs.MEN}</p>
            <RowTable rows={sheet.plots} canEdit={canEdit}
              columns={[
                { key: "nome", label: "Nome", flex: 1.2 },
                { key: "uso", label: "Uso" },
                { key: "alcance", label: "Alcance" },
                { key: "dano", label: "Dano" },
                { key: "efeito", label: "Efeito", flex: 2 },
                { key: "dt_descricao", label: "DT/Descrição", flex: 1.5 },
              ]}
              onChange={(v) => update("plots", v as Plot[])} />
          </Section>

          {/* Notes */}
          <Section title="Anotações Rápidas">
            <Textarea disabled={!canEdit} value={sheet.notes || ""}
              onChange={(e) => update("notes", e.target.value)} rows={4} />
          </Section>

          <p className="text-center text-[10px] text-muted-foreground py-6">
            © {new Date().getFullYear()} Gabriel Tadeu — Tadeon Nexus.
          </p>
        </TabsContent>

        <TabsContent value="arvore" className="mt-0">
          <SkillTreeTab
            exposure={sheet.exposure}
            attributes={sheet.attributes}
            pmSpent={sheet.pm_spent}
            statUpgrades={sheet.stat_upgrades}
            purchasedSkills={sheet.purchased_skills}
            abilities={sheet.abilities}
            branches={branches}
            rankTable={rankTable}
            upgradeCosts={upgradeCosts}
            canEdit={canEdit}
            onUpdate={(c) => setSheet((p) => p ? { ...p, ...c } : p)}
          />
        </TabsContent>

        <TabsContent value="descricao" className="space-y-4 mt-0">
          {([
            ["historia", "História"],
            ["personalidade", "Personalidade"],
            ["objetivos", "Objetivos"],
            ["observacoes", "Observações"],
          ] as const).map(([key, label]) => (
            <Section key={key} title={label}>
              <Textarea disabled={!canEdit} value={sheet.description[key] || ""}
                onChange={(e) => update("description", { ...sheet.description, [key]: e.target.value })}
                rows={6} placeholder={`Escreva aqui sobre ${label.toLowerCase()}...`} />
            </Section>
          ))}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

function Section({ title, children, extra, id }: { title: string; children: React.ReactNode; extra?: React.ReactNode; id?: string }) {
  return (
    <Card id={id} className="p-4 bg-card/60 backdrop-blur-sm border-border/60 transition-all hover:border-border scroll-mt-32">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-cinzel font-bold text-primary">{title}</h3>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-9" />
    </div>
  );
}

function StatBlock({ label, full, color, barColor, current, mod, max, disabled, onCurrent, onMod }: {
  label: string; full: string; color: string; barColor: string;
  current: number; mod: number; max: number; disabled?: boolean;
  onCurrent: (v: number) => void; onMod: (v: number) => void;
}) {
  return (
    <Card className="p-3 bg-card/60">
      <div className="flex items-baseline justify-between">
        <div className={`font-cinzel font-bold text-sm ${color}`}>{label}</div>
        <span className="text-[10px] text-muted-foreground">{full}</span>
      </div>
      <div className="text-2xl font-bold text-center my-1">{current} / {max}</div>
      <div className="w-full h-1.5 bg-secondary rounded-full mb-2 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${clamp((current / Math.max(1, max)) * 100, 0, 100)}%` }} />
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={disabled}
          onClick={() => onCurrent(current - 1)}><Minus className="w-3 h-3" /></Button>
        <Input type="number" disabled={disabled} value={current}
          onChange={(e) => onCurrent(Number(e.target.value))} className="h-7 text-center text-xs" />
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={disabled}
          onClick={() => onCurrent(current + 1)}><Plus className="w-3 h-3" /></Button>
      </div>
      <div className="mt-1.5">
        <Label className="text-[10px]">Mod</Label>
        <Input type="number" disabled={disabled} value={mod} onChange={(e) => onMod(Number(e.target.value))} className="h-6 text-xs" />
      </div>
    </Card>
  );
}

function CounterDots({ label, max, value, color, disabled, onChange }:
  { label: string; max: number; value: number; color: string; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        {Array.from({ length: max }).map((_, i) => (
          <button key={i} disabled={disabled}
            onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            className={`w-7 h-7 rounded-full border-2 border-border transition-all hover:scale-110 ${i < value ? color : "bg-transparent"} disabled:cursor-not-allowed disabled:hover:scale-100`} />
        ))}
      </div>
    </div>
  );
}

interface HasId { id: string }
interface ColDef {
  key: string; label: string;
  type?: "text" | "number";
  flex?: number;
  width?: number;
}

function RowTable<T extends HasId>({
  rows, canEdit, columns, onChange,
}: {
  rows: T[]; canEdit: boolean; columns: ColDef[]; onChange: (v: T[]) => void;
}) {
  const update = (idx: number, key: string, value: string) => {
    const next = [...rows];
    const isNum = columns.find((c) => c.key === key)?.type === "number";
    next[idx] = { ...next[idx], [key]: isNum ? Number(value) : value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground italic text-center py-3">Nenhum item ainda.</p>;
  }

  const gridCols = columns
    .map((c) => c.width ? `${c.width}px` : `minmax(0, ${c.flex ?? 1}fr)`)
    .concat(["auto"])
    .join(" ");

  return (
    <div className="space-y-1">
      {/* Header (hidden on mobile) */}
      <div className="hidden sm:grid gap-1.5 px-2 text-[10px] uppercase text-muted-foreground font-semibold"
        style={{ gridTemplateColumns: gridCols }}>
        {columns.map((c) => <div key={c.key}>{c.label}</div>)}
        <div />
      </div>
      {rows.map((it, idx) => (
        <div key={it.id}
          className="bg-secondary/30 rounded-lg p-2 hover:bg-secondary/50 transition-colors sm:grid gap-1.5 items-center flex flex-col"
          style={{ gridTemplateColumns: gridCols }}>
          {columns.map((c) => (
            <Input key={c.key}
              type={c.type === "number" ? "number" : "text"}
              placeholder={c.label}
              disabled={!canEdit}
              value={c.type === "number"
                ? Number((it as Record<string, unknown>)[c.key] ?? 0)
                : String((it as Record<string, unknown>)[c.key] ?? "")}
              onChange={(e) => update(idx, c.key, e.target.value)}
              className="h-8 text-xs bg-background/40 border-border/40 w-full" />
          ))}
          {canEdit && (
            <Button size="sm" variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 self-end sm:self-auto"
              onClick={() => remove(idx)}><Trash className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      ))}
    </div>
  );
}
