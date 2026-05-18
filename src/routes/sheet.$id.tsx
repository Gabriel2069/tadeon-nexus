import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  type Attributes, type Stats, type Conditions, type StatUpgrades,
  type Weapon, type InventoryItem, type Ability, type Plot, type RankRow, type SkillBranch,
  SKILL_GROUPS, getRankBase, genId,
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
}

const CONDITION_OPTIONS = ["Normal", "Sangrando", "Atordoado", "Em pânico", "Drenado", "Inconsciente"];
const RANGE_OPTIONS = ["Curto", "Médio", "Longo", "Extremo"];

function SheetPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [branches, setBranches] = useState<SkillBranch[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const canEdit = role === "mestre" || (sheet?.owner_id === user?.id && role !== "espectador");

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settings }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
        supabase.from("game_settings").select("rank_table,skill_branches").eq("key", "global").maybeSingle(),
      ]);
      if (error || !data) {
        toast.error("Ficha não encontrada.");
        void navigate({ to: "/" });
        return;
      }
      setSheet(data as unknown as SheetData);
      setRankTable((settings?.rank_table as RankRow[] | undefined) ?? []);
      setBranches((settings?.skill_branches as SkillBranch[] | undefined) ?? []);
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

  if (loading || !sheet) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const attrs = sheet.attributes;
  const base = getRankBase(sheet.exposure, rankTable);
  const upg = sheet.stat_upgrades;
  const pvMax = base.pv + sheet.stats.pv_mod + 3 * attrs.COR + 3 * upg.pv;
  const psMax = base.ps + sheet.stats.ps_mod + 3 * attrs.MEN + 3 * upg.ps;
  const peMax = base.pe + sheet.stats.pe_mod + 3 * attrs.ERU + 2 * upg.pe;
  const defTotal = sheet.stats.def_equip + sheet.stats.def_mod + upg.def;
  const invCapacity = 5 + 3 * attrs.COR;
  const invUsed =
    sheet.weapons.reduce((s, w) => s + (Number(w.peso) || 0), 0) +
    sheet.inventory.reduce((s, i) => s + (Number(i.espaco) || 0), 0);
  const equilibrium = Math.max(0, Math.min(100, sheet.equilibrium || 0));

  return (
    <div className="max-w-6xl mx-auto p-3 md:p-6 pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 md:top-0 z-10 -mx-3 md:-mx-6 px-3 md:px-6 py-3 mb-4 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-cinzel text-lg md:text-2xl font-bold flex-1 truncate">
            {sheet.name || "Ficha"}
          </h1>
          {!canEdit && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              somente leitura
            </span>
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
      </div>

      <Tabs defaultValue="ficha" className="space-y-4">
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="ficha" className="flex-1 md:flex-initial">Ficha</TabsTrigger>
          <TabsTrigger value="arvore" className="flex-1 md:flex-initial">Árvore de Habilidades</TabsTrigger>
        </TabsList>

        <TabsContent value="ficha" className="space-y-4 mt-0">
          {/* Identity */}
          <Section title="Identidade">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nome" value={sheet.name} onChange={(v) => update("name", v)} disabled={!canEdit} />
              <Field label="Ocupação" value={sheet.occupation} onChange={(v) => update("occupation", v)} disabled={!canEdit} />
              <Field label="Idade" value={sheet.age} onChange={(v) => update("age", v)} disabled={!canEdit} />
              <Field label="Marca" value={sheet.brand} onChange={(v) => update("brand", v)} disabled={!canEdit} />
              <Field label="Origem" value={sheet.origin} onChange={(v) => update("origin", v)} disabled={!canEdit} />
              <Field label="Motivação" value={sheet.motivation} onChange={(v) => update("motivation", v)} disabled={!canEdit} />
            </div>
          </Section>

          {/* Stats + Attributes */}
          <Section title="Pontos & Atributos">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 grid grid-cols-2 gap-2.5">
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

              <Card className="p-3 bg-card/60">
                <h3 className="font-cinzel font-bold mb-2 text-center text-sm">Atributos</h3>
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
              </Card>
            </div>
          </Section>

          {/* Equilibrium */}
          <Section title="Equilíbrio">
            <p className="text-xs text-muted-foreground mb-2">
              Estado interno do personagem. Próximo de 100 = sereno; próximo de 0 = em colapso.
            </p>
            <div className="relative w-full h-6 bg-secondary rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-yellow-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${equilibrium}%` }} />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold drop-shadow">
                {equilibrium}/100
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Input type="number" min={0} max={100} disabled={!canEdit} value={sheet.equilibrium}
                onChange={(e) => update("equilibrium", Math.max(0, Math.min(100, Number(e.target.value))))}
                className="w-24 h-8" />
              <input type="range" min={0} max={100} disabled={!canEdit} value={sheet.equilibrium}
                onChange={(e) => update("equilibrium", Number(e.target.value))} className="flex-1" />
            </div>
          </Section>

          {/* Condition */}
          <Section title="Condições">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["fisica", "mental", "energetica", "outras"] as const).map((c) => (
                <div key={c}>
                  <Label className="capitalize text-xs">{c}</Label>
                  <select disabled={!canEdit} value={sheet.conditions[c] || "Normal"}
                    onChange={(e) => update("conditions", { ...sheet.conditions, [c]: e.target.value })}
                    className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm">
                    {CONDITION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <CounterDots label="Morrendo" max={3} value={sheet.dying} color="bg-red-500" disabled={!canEdit}
                onChange={(v) => update("dying", v)} />
              <CounterDots label="Enlouquecendo" max={3} value={sheet.going_insane} color="bg-purple-500" disabled={!canEdit}
                onChange={(v) => update("going_insane", v)} />
            </div>
            <div className="mt-4">
              <Label>Exposição (Rank base {base.rank})</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input type="number" min={0} max={100} disabled={!canEdit} value={sheet.exposure}
                  onChange={(e) => update("exposure", Number(e.target.value))} className="w-24 h-8" />
                <input type="range" min={0} max={100} step={5} disabled={!canEdit} value={sheet.exposure}
                  onChange={(e) => update("exposure", Number(e.target.value))} className="flex-1" />
              </div>
              <div className="w-full h-2 bg-secondary rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all"
                  style={{ width: `${sheet.exposure}%` }} />
              </div>
            </div>
          </Section>

          {/* Skills */}
          <Section title="Perícias"
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
          <Section title="Armas" extra={
            canEdit && (
              <AddItemDialog<Weapon>
                title="Nova Arma"
                triggerLabel="Adicionar Arma"
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
                onAdd={(w) => update("weapons", [...sheet.weapons, { ...w, id: genId() }])}
              />
            )
          }>
            <SimpleList items={sheet.weapons} canEdit={canEdit}
              columns={["nome", "tipo", "alcance", "dano", "critico", "peso", "extra"]}
              labels={{ nome: "Nome", tipo: "Tipo", alcance: "Alcance", dano: "Dano", critico: "Crítico", peso: "Peso", extra: "Extra" }}
              onChange={(v) => update("weapons", v as Weapon[])} />
          </Section>

          {/* Inventory */}
          <Section title="Inventário" extra={
            canEdit && (
              <AddItemDialog<InventoryItem>
                title="Novo Item"
                triggerLabel="Adicionar Item"
                initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
                fields={[
                  { key: "nome", label: "Nome" },
                  { key: "descricao", label: "Descrição", type: "textarea" },
                  { key: "espaco", label: "Espaço (pode ser negativo)", type: "number" },
                ]}
                onAdd={(it) => update("inventory", [...sheet.inventory, { ...it, id: genId() }])}
              />
            )
          }>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground">{invUsed} / {invCapacity} espaço</span>
              {invUsed > invCapacity && <span className="text-destructive font-medium">Sobrecarregado!</span>}
            </div>
            <div className="w-full h-1.5 bg-secondary rounded mb-3 overflow-hidden">
              <div className={`h-full rounded transition-all ${invUsed > invCapacity ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${Math.min(100, (Math.max(0, invUsed) / Math.max(1, invCapacity)) * 100)}%` }} />
            </div>
            <SimpleList items={sheet.inventory} canEdit={canEdit}
              columns={["nome", "descricao", "espaco"]}
              labels={{ nome: "Nome", descricao: "Descrição", espaco: "Espaço" }}
              onChange={(v) => update("inventory", v as InventoryItem[])} />
          </Section>

          {/* Abilities */}
          <Section title="Habilidades" extra={
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
          }>
            <SimpleList items={sheet.abilities} canEdit={canEdit}
              columns={["nome", "descricao", "modificador"]}
              labels={{ nome: "Nome", descricao: "Descrição", modificador: "Modificador" }}
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
                  title="Nova Trama"
                  triggerLabel="Trama"
                  initial={{ id: "", nome: "", uso: "", alcance: "", dano: "", efeito: "", dt_descricao: "" }}
                  fields={[
                    { key: "nome", label: "Nome" },
                    { key: "uso", label: "Uso" },
                    { key: "alcance", label: "Alcance" },
                    { key: "dano", label: "Dano" },
                    { key: "efeito", label: "Efeito", type: "textarea" },
                    { key: "dt_descricao", label: "DT / Descrição", type: "textarea" },
                  ]}
                  onAdd={(p) => update("plots", [...sheet.plots, { ...p, id: genId() }])}
                />
              )}
            </div>
          }>
            <p className="text-xs text-muted-foreground mb-2">DT Canalização base: {3 * attrs.MEN}</p>
            <SimpleList items={sheet.plots} canEdit={canEdit}
              columns={["nome", "uso", "alcance", "dano", "efeito", "dt_descricao"]}
              labels={{ nome: "Nome", uso: "Uso", alcance: "Alcance", dano: "Dano", efeito: "Efeito", dt_descricao: "DT/Descrição" }}
              onChange={(v) => update("plots", v as Plot[])} />
          </Section>

          {/* Notes */}
          <Section title="Anotações">
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
            branches={branches}
            rankTable={rankTable}
            canEdit={canEdit}
            onUpdate={(c) => setSheet((p) => p ? { ...p, ...c } : p)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Section({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="p-4 bg-card/60 backdrop-blur-sm border-border/60 transition-all hover:border-border">
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

function StatBlock({
  label, full, color, barColor, current, mod, max, disabled, onCurrent, onMod,
}: {
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
          style={{ width: `${Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100))}%` }} />
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

function SimpleList<T extends HasId>({
  items, canEdit, columns, labels, onChange,
}: {
  items: T[]; canEdit: boolean; columns: string[];
  labels: Record<string, string>; onChange: (v: T[]) => void;
}) {
  const update = (idx: number, key: string, value: string) => {
    const next = [...items];
    const isNum = typeof (next[idx] as Record<string, unknown>)[key] === "number";
    next[idx] = { ...next[idx], [key]: isNum ? Number(value) : value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic text-center py-3">Nenhum item ainda.</p>;
  }

  return (
    <div className="space-y-1.5">
      {/* Desktop table-like, mobile stacked cards */}
      {items.map((it, idx) => (
        <div key={it.id} className="bg-secondary/30 rounded-lg p-2 hover:bg-secondary/50 transition-colors">
          <div className="grid gap-1.5 items-center"
            style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr)) auto` }}>
            {columns.map((c) => (
              <Input key={c} placeholder={labels[c]} disabled={!canEdit}
                value={String((it as Record<string, unknown>)[c] ?? "")}
                onChange={(e) => update(idx, c, e.target.value)}
                className="h-8 text-xs bg-background/40 border-border/40" />
            ))}
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => remove(idx)}><Trash className="w-3.5 h-3.5" /></Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
