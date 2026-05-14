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
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Minus,
  Trash,
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
  SKILL_GROUPS,
  ALL_SKILLS,
  getRankBase,
  genId,
} from "@/lib/sheet-types";

export const Route = createFileRoute("/sheet/$id")({
  head: () => ({ meta: [{ title: "Ficha — Tadeon Nexus" }] }),
  component: () => (
    <ProtectedShell>
      <SheetPage />
    </ProtectedShell>
  ),
});

interface SheetData {
  id: string;
  owner_id: string;
  owner_email: string;
  name: string;
  occupation: string;
  age: string;
  brand: string;
  origin: string;
  motivation: string;
  exposure: number;
  attributes: Attributes;
  stats: Stats;
  equilibrium: number;
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
}

const CONDITION_OPTIONS = [
  "Normal",
  "Sangrando",
  "Atordoado",
  "Em pânico",
  "Drenado",
  "Inconsciente",
];

function SheetPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const canEdit =
    role === "mestre" || (sheet?.owner_id === user?.id && role !== "espectador");

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settings }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
        supabase.from("game_settings").select("rank_table").eq("key", "global").maybeSingle(),
      ]);
      if (error || !data) {
        toast.error("Ficha não encontrada");
        void navigate({ to: "/" });
        return;
      }
      setSheet(data as unknown as SheetData);
      setRankTable((settings?.rank_table as RankRow[] | undefined) ?? []);
      setLoading(false);
    })();
  }, [id, navigate]);

  // Debounced auto-save
  useEffect(() => {
    if (!sheet || !canEdit) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(), 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  const doSave = async () => {
    if (!sheet) return;
    setSaving(true);
    const { id: _id, ...payload } = sheet;
    const { error } = await supabase
      .from("character_sheets")
      .update(payload as never)
      .eq("id", sheet.id);
    setSaving(false);
    if (error) toast.error(error.message);
  };

  const update = <K extends keyof SheetData>(key: K, value: SheetData[K]) => {
    setSheet((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

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

  const pvMax = base.pv + sheet.stats.pv_mod + 3 * attrs.COR + 3 * upg.pv;
  const psMax = base.ps + sheet.stats.ps_mod + 3 * attrs.MEN + 3 * upg.ps;
  const peMax = base.pe + sheet.stats.pe_mod + 3 * attrs.ERU + 2 * upg.pe;
  const defTotal = sheet.stats.def_equip + sheet.stats.def_mod + upg.def;
  const invCapacity = 5 + 3 * attrs.COR;
  const invUsed =
    sheet.weapons.reduce((s, w) => s + (Number(w.peso) || 0), 0) +
    sheet.inventory.reduce((s, i) => s + (Number(i.espaco) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-cinzel text-xl md:text-2xl font-bold flex-1 truncate">
          {sheet.name || "Ficha"}
        </h1>
        {!canEdit && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            somente leitura
          </span>
        )}
        {canEdit && (
          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
              </span>
            )}
            <Button size="sm" onClick={doSave} className="gap-1.5">
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </div>
        )}
      </div>

      {/* Identity */}
      <Card className="p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nome" value={sheet.name} onChange={(v) => update("name", v)} disabled={!canEdit} />
        <Field label="Ocupação" value={sheet.occupation} onChange={(v) => update("occupation", v)} disabled={!canEdit} />
        <Field label="Idade" value={sheet.age} onChange={(v) => update("age", v)} disabled={!canEdit} />
        <Field label="Marca" value={sheet.brand} onChange={(v) => update("brand", v)} disabled={!canEdit} />
        <Field label="Origem" value={sheet.origin} onChange={(v) => update("origin", v)} disabled={!canEdit} />
        <Field label="Motivação" value={sheet.motivation} onChange={(v) => update("motivation", v)} disabled={!canEdit} />
      </Card>

      {/* Stats + Attributes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <StatBlock
            label="PV" full="Pontos de Vitalidade" color="text-red-400" barColor="bg-red-500"
            current={sheet.stats.pv_current} mod={sheet.stats.pv_mod} max={pvMax}
            disabled={!canEdit}
            onCurrent={(v) => update("stats", { ...sheet.stats, pv_current: v })}
            onMod={(v) => update("stats", { ...sheet.stats, pv_mod: v })}
          />
          <StatBlock
            label="PE" full="Pontos de Energia" color="text-emerald-400" barColor="bg-emerald-500"
            current={sheet.stats.pe_current} mod={sheet.stats.pe_mod} max={peMax}
            disabled={!canEdit}
            onCurrent={(v) => update("stats", { ...sheet.stats, pe_current: v })}
            onMod={(v) => update("stats", { ...sheet.stats, pe_mod: v })}
          />
          <StatBlock
            label="PS" full="Pontos de Sanidade" color="text-purple-400" barColor="bg-purple-500"
            current={sheet.stats.ps_current} mod={sheet.stats.ps_mod} max={psMax}
            disabled={!canEdit}
            onCurrent={(v) => update("stats", { ...sheet.stats, ps_current: v })}
            onMod={(v) => update("stats", { ...sheet.stats, ps_mod: v })}
          />
          <Card className="p-3">
            <div className="text-blue-400 font-cinzel font-bold">Defesa</div>
            <div className="text-3xl font-bold text-center my-2">{defTotal}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Label>Equip</Label>
                <Input type="number" disabled={!canEdit} value={sheet.stats.def_equip}
                  onChange={(e) => update("stats", { ...sheet.stats, def_equip: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Mod</Label>
                <Input type="number" disabled={!canEdit} value={sheet.stats.def_mod}
                  onChange={(e) => update("stats", { ...sheet.stats, def_mod: Number(e.target.value) })} />
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-cinzel font-bold mb-3 text-center">Atributos</h3>
          <div className="space-y-2">
            {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-2 bg-secondary/40 rounded px-2 py-1.5">
                <span className="font-cinzel text-sm">{k}</span>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={!canEdit || attrs[k] <= 0}
                    onClick={() => update("attributes", { ...attrs, [k]: Math.max(0, attrs[k] - 1) })}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-6 text-center font-bold">{attrs[k]}</span>
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

      {/* Condition */}
      <Card className="p-4 mb-4">
        <h3 className="font-cinzel font-bold mb-3">Condição</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["fisica", "mental", "energetica", "outras"] as const).map((c) => (
            <div key={c}>
              <Label className="capitalize">{c}</Label>
              <select
                disabled={!canEdit}
                value={sheet.conditions[c] || "Normal"}
                onChange={(e) => update("conditions", { ...sheet.conditions, [c]: e.target.value })}
                className="w-full bg-input border border-border rounded-md px-2 py-1.5 text-sm"
              >
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
          <div className="flex items-center gap-3">
            <Input type="number" min={0} max={100} disabled={!canEdit} value={sheet.exposure}
              onChange={(e) => update("exposure", Number(e.target.value))} className="w-24" />
            <input type="range" min={0} max={100} step={5} disabled={!canEdit} value={sheet.exposure}
              onChange={(e) => update("exposure", Number(e.target.value))} className="flex-1" />
          </div>
        </div>
      </Card>

      {/* Skills */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-cinzel font-bold">Perícias</h3>
          <Input placeholder="Bônus temporário (ex: +2 em Luta)" disabled={!canEdit}
            value={sheet.skill_bonus} onChange={(e) => update("skill_bonus", e.target.value)}
            className="h-8 w-64 text-xs" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {SKILL_GROUPS.map((g) => (
            <div key={g.attr} className="bg-secondary/40 rounded p-2">
              <h4 className="font-cinzel text-sm font-bold mb-2">{g.label} ({g.attr})</h4>
              <div className="space-y-1">
                {g.skills.map((s) => {
                  const v = sheet.skills[s] ?? 0;
                  const color =
                    v >= 15 ? "text-yellow-400 font-bold" :
                    v >= 10 ? "text-blue-400 font-semibold" :
                    v >= 5 ? "text-green-400" : "text-muted-foreground";
                  return (
                    <div key={s} className="flex items-center justify-between text-xs">
                      <span>{s}</span>
                      <button
                        disabled={!canEdit}
                        onClick={() => {
                          const next = v >= 15 ? 0 : v + 5;
                          update("skills", { ...sheet.skills, [s]: next });
                        }}
                        className={`${color} px-2 py-0.5 rounded hover:bg-background/40 disabled:cursor-not-allowed`}
                      >
                        +{v}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Weapons */}
      <ListCard
        title="Armas"
        items={sheet.weapons}
        canEdit={canEdit}
        columns={["nome", "tipo", "alcance", "dano", "critico", "peso", "extra"]}
        labels={{ nome: "Nome", tipo: "Tipo", alcance: "Alcance", dano: "Dano", critico: "Crítico", peso: "Peso", extra: "Extra" }}
        empty={() => ({ id: genId(), nome: "", tipo: "", alcance: "Curto", dano: "", critico: "", peso: 0, extra: "" }) as Weapon}
        onChange={(v) => update("weapons", v as Weapon[])}
      />

      {/* Inventory */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-cinzel font-bold">Inventário</h3>
          <span className="text-xs text-muted-foreground">{invUsed} / {invCapacity} espaço</span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded mb-3">
          <div className="h-full bg-primary rounded transition-all"
            style={{ width: `${Math.min(100, (invUsed / Math.max(1, invCapacity)) * 100)}%` }} />
        </div>
        <SimpleList
          items={sheet.inventory}
          canEdit={canEdit}
          columns={["nome", "descricao", "espaco"]}
          labels={{ nome: "Nome", descricao: "Descrição", espaco: "Espaço" }}
          empty={() => ({ id: genId(), nome: "", descricao: "", espaco: 1 }) as InventoryItem}
          onChange={(v) => update("inventory", v as InventoryItem[])}
        />
      </Card>

      {/* Abilities */}
      <ListCard
        title="Habilidades"
        items={sheet.abilities}
        canEdit={canEdit}
        columns={["nome", "descricao", "modificador"]}
        labels={{ nome: "Nome", descricao: "Descrição", modificador: "Modificador" }}
        empty={() => ({ id: genId(), nome: "", descricao: "", modificador: "" }) as Ability}
        onChange={(v) => update("abilities", v as Ability[])}
      />

      {/* Plots */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-cinzel font-bold">Tramas</h3>
          <div className="flex items-center gap-3 text-xs">
            <Label>Fragmentos</Label>
            <Input type="number" disabled={!canEdit} value={sheet.fragments}
              onChange={(e) => update("fragments", Number(e.target.value))} className="w-20 h-7" />
            <span className="text-muted-foreground">DT Canalização: {3 * attrs.MEN}</span>
          </div>
        </div>
        <SimpleList
          items={sheet.plots}
          canEdit={canEdit}
          columns={["nome", "uso", "alcance", "dano", "efeito", "dt_descricao"]}
          labels={{ nome: "Nome", uso: "Uso", alcance: "Alcance", dano: "Dano", efeito: "Efeito", dt_descricao: "DT/Descrição" }}
          empty={() => ({ id: genId(), nome: "", uso: "", alcance: "", dano: "", efeito: "", dt_descricao: "" }) as Plot}
          onChange={(v) => update("plots", v as Plot[])}
        />
      </Card>

      {/* Notes */}
      <Card className="p-4 mb-4">
        <h3 className="font-cinzel font-bold mb-2">Anotações</h3>
        <Textarea disabled={!canEdit} value={sheet.notes || ""} onChange={(e) => update("notes", e.target.value)} rows={4} />
      </Card>

      <p className="text-center text-xs text-muted-foreground py-6 border-t border-border mt-6">
        © {new Date().getFullYear()} Gabriel Tadeu — Tadeon Nexus.
      </p>
    </div>
  );
}

function Field({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
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
    <Card className="p-3">
      <div className="flex items-baseline justify-between">
        <div className={`font-cinzel font-bold ${color}`}>{label}</div>
        <span className="text-[10px] text-muted-foreground">{full}</span>
      </div>
      <div className="text-2xl font-bold text-center my-1">{current} / {max}</div>
      <div className="w-full h-1.5 bg-secondary rounded mb-2">
        <div className={`h-full ${barColor} rounded transition-all`}
          style={{ width: `${Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100))}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={disabled}
          onClick={() => onCurrent(current - 1)}><Minus className="w-3 h-3" /></Button>
        <Input type="number" disabled={disabled} value={current} onChange={(e) => onCurrent(Number(e.target.value))} className="h-7 text-center" />
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" disabled={disabled}
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
      <Label>{label}</Label>
      <div className="flex gap-2 mt-1">
        {Array.from({ length: max }).map((_, i) => (
          <button key={i} disabled={disabled}
            onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            className={`w-7 h-7 rounded-full border-2 border-border ${i < value ? color : "bg-transparent"} disabled:cursor-not-allowed`} />
        ))}
      </div>
    </div>
  );
}

interface HasId { id: string; [k: string]: unknown }

function ListCard<T extends HasId>(props: {
  title: string; items: T[]; canEdit: boolean; columns: string[];
  labels: Record<string, string>; empty: () => T; onChange: (v: T[]) => void;
}) {
  return (
    <Card className="p-4 mb-4">
      <h3 className="font-cinzel font-bold mb-3">{props.title}</h3>
      <SimpleList {...props} />
    </Card>
  );
}

function SimpleList<T extends HasId>({
  items, canEdit, columns, labels, empty, onChange,
}: {
  items: T[]; canEdit: boolean; columns: string[];
  labels: Record<string, string>; empty: () => T; onChange: (v: T[]) => void;
}) {
  const update = (idx: number, key: string, value: string) => {
    const next = [...items];
    const isNum = typeof (next[idx] as Record<string, unknown>)[key] === "number";
    next[idx] = { ...next[idx], [key]: isNum ? Number(value) : value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const add = () => onChange([...items, empty()]);

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Nenhum item.</p>
      )}
      {items.map((it, idx) => (
        <div key={it.id} className="grid gap-2 p-2 bg-secondary/30 rounded items-center"
          style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0,1fr)) auto` }}>
          {columns.map((c) => (
            <Input
              key={c}
              placeholder={labels[c]}
              disabled={!canEdit}
              value={String((it as Record<string, unknown>)[c] ?? "")}
              onChange={(e) => update(idx, c, e.target.value)}
              className="h-8 text-xs"
            />
          ))}
          {canEdit && (
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
              onClick={() => remove(idx)}><Trash className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      ))}
      {canEdit && (
        <Button size="sm" variant="outline" onClick={add} className="gap-1.5">
          <Plus className="w-3 h-3" /> Adicionar
        </Button>
      )}
    </div>
  );
}
