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
import { ArrowLeft, Save, Loader2, Plus, Minus, Sparkles, Flame, RotateCcw, Trash } from "lucide-react";
import { toast } from "sonner";
import {
  type Attributes, type Stats, type Weapon, type InventoryItem, type Ability, type Plot,
  type RankRow, type UpgradeCosts, type Description, type Conditions, type StatUpgrades,
  SKILL_GROUPS, getRankBase, genId, DEFAULT_UPGRADE_COSTS,
} from "@/lib/sheet-types";
import { AddItemDialog } from "@/components/sheet/add-item-dialog";

export const Route = createFileRoute("/sheet/$id/power")({
  head: () => ({ meta: [{ title: "Forma de Poder — Tadeon Nexus" }] }),
  component: () => (
    <ProtectedShell>
      <PowerFormPage />
    </ProtectedShell>
  ),
});

const PLOT_RANGE_OPTIONS = ["Pessoal", "Curto", "Médio", "Longo", "Extremo"];
const WEAPON_RANGE_OPTIONS = ["Curto", "Médio", "Longo", "Extremo"];

interface PowerFormData {
  attributes?: Partial<Attributes>;
  abilities?: Ability[];
  plots?: Plot[];
  weapons?: Weapon[];
  inventory?: InventoryItem[];
  notes?: string;
  stat_mods?: Partial<Stats>;
}

interface SheetRow {
  id: string;
  owner_id: string;
  name: string;
  exposure: number;
  attributes: Attributes;
  stats: Stats;
  conditions: Conditions;
  weapons: Weapon[];
  inventory: InventoryItem[];
  abilities: Ability[];
  plots: Plot[];
  stat_upgrades: StatUpgrades;
  description: Description;
  power_form_enabled: boolean;
  power_form_data: PowerFormData;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function PowerFormPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetRow | null>(null);
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(DEFAULT_UPGRADE_COSTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const canEdit = role === "mestre" || (sheet?.owner_id === user?.id && role !== "espectador");

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settingsJson }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("get_public_game_settings"),
      ]);
      if (error || !data) {
        toast.error("Ficha não encontrada.");
        void navigate({ to: "/" });
        return;
      }
      const raw = data as unknown as Record<string, unknown>;
      if (!raw.power_form_enabled) {
        toast.error("Forma de Poder não liberada pelo mestre.");
        void navigate({ to: "/sheet/$id", params: { id } });
        return;
      }
      setSheet({
        id: String(raw.id),
        owner_id: String(raw.owner_id),
        name: String(raw.name ?? ""),
        exposure: Number(raw.exposure ?? 0),
        attributes: raw.attributes as Attributes,
        stats: raw.stats as Stats,
        conditions: raw.conditions as Conditions,
        weapons: (raw.weapons as Weapon[]) ?? [],
        inventory: (raw.inventory as InventoryItem[]) ?? [],
        abilities: (raw.abilities as Ability[]) ?? [],
        plots: (raw.plots as Plot[]) ?? [],
        stat_upgrades: raw.stat_upgrades as StatUpgrades,
        description: (raw.description as Description) ?? { historia: "", personalidade: "", objetivos: "", observacoes: "" },
        power_form_enabled: true,
        power_form_data: (raw.power_form_data as PowerFormData) ?? {},
      });
      const g = (settingsJson as Record<string, unknown> | null) ?? {};
      setRankTable((g.rank_table as RankRow[] | undefined) ?? []);
      setUpgradeCosts((g.upgrade_costs as UpgradeCosts | undefined) ?? DEFAULT_UPGRADE_COSTS);
      setLoading(false);
    })();
  }, [id, navigate]);

  // Auto-save (debounced)
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
    // Persist only fields we own: stats currents (shared) and power_form_data.
    const { error } = await supabase.from("character_sheets")
      .update({
        stats: sheet.stats as never,
        power_form_data: sheet.power_form_data as never,
      })
      .eq("id", sheet.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
  };

  const pf = sheet?.power_form_data ?? {};

  const setPf = (patch: Partial<PowerFormData>) => {
    setSheet((p) => p ? { ...p, power_form_data: { ...p.power_form_data, ...patch } } : p);
  };

  const reset = () => {
    if (!confirm("Resetar a Forma de Poder para o estado da ficha base? (mantém apenas as suas notas)")) return;
    setSheet((p) => p ? { ...p, power_form_data: { notes: p.power_form_data.notes } } : p);
  };

  // Effective values: pf override OR base
  const baseAttrs = sheet?.attributes ?? { COR: 0, MEN: 0, INS: 0, PRE: 0, ERU: 0 };
  const effAttrs: Attributes = useMemo(() => {
    const o = pf.attributes ?? {};
    return {
      COR: o.COR ?? baseAttrs.COR,
      MEN: o.MEN ?? baseAttrs.MEN,
      INS: o.INS ?? baseAttrs.INS,
      PRE: o.PRE ?? baseAttrs.PRE,
      ERU: o.ERU ?? baseAttrs.ERU,
    };
  }, [pf.attributes, baseAttrs]);

  const effWeapons = pf.weapons ?? sheet?.weapons ?? [];
  const effInventory = pf.inventory ?? sheet?.inventory ?? [];
  const effAbilities = pf.abilities ?? sheet?.abilities ?? [];
  const effPlots = pf.plots ?? sheet?.plots ?? [];

  if (loading || !sheet) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
  }

  const base = getRankBase(sheet.exposure, rankTable);
  const upg = sheet.stat_upgrades;
  const stMods = pf.stat_mods ?? {};
  const pvMax = base.pv + (stMods.pv_mod ?? sheet.stats.pv_mod) + 3 * effAttrs.COR + 3 * upg.pv;
  const psMax = base.ps + (stMods.ps_mod ?? sheet.stats.ps_mod) + 3 * effAttrs.MEN + 3 * upg.ps;
  const peMax = base.pe + (stMods.pe_mod ?? sheet.stats.pe_mod) + 3 * effAttrs.ERU + 2 * upg.pe;
  const defTotal = base.def + sheet.stats.def_equip + (stMods.def_mod ?? sheet.stats.def_mod) + upg.def;

  return (
    <div
      className="min-h-screen relative pb-24 animate-in fade-in-0 duration-500"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(251,113,133,0.20), transparent 60%), radial-gradient(ellipse at bottom, rgba(168,85,247,0.18), transparent 55%), linear-gradient(180deg, #1a0a14 0%, #0a0512 100%)",
      }}
    >
      {/* Pulsing aura */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,140,60,0.18), transparent 50%)",
          animation: "pulse 4s ease-in-out infinite",
        }} />

      <div className="max-w-6xl mx-auto p-3 md:p-6 relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-3 md:-mx-6 px-3 md:px-6 py-3 mb-4 bg-background/40 backdrop-blur-xl border-b border-orange-500/40 shadow-[0_4px_30px_rgba(255,100,50,0.25)]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/sheet/$id", params: { id: sheet.id } })}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Sparkles className="w-5 h-5 text-orange-300 animate-pulse" />
            <h1 className="font-cinzel text-lg md:text-2xl font-bold flex-1 truncate bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,150,80,0.5)]">
              {sheet.name} · Forma de Poder
            </h1>
            {canEdit && (
              <>
                {saving && (
                  <span className="text-[10px] text-orange-200 hidden sm:flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Salvando…
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={reset}
                  className="gap-1.5 border-orange-400/40 text-orange-200 hover:bg-orange-500/15" title="Resetar Forma">
                  <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Resetar</span>
                </Button>
                <Button size="sm" onClick={doSave}
                  className="gap-1.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white shadow-[0_0_20px_rgba(255,120,60,0.55)]">
                  <Save className="w-4 h-4" /> <span className="hidden sm:inline">Salvar</span>
                </Button>
              </>
            )}
          </div>
          <p className="text-[11px] text-orange-200/80 mt-1 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            Apenas PV / PS / PE atuais são compartilhados com a ficha base. Tudo o mais é exclusivo desta forma.
          </p>
        </div>

        {/* Shared current points (synced with base) */}
        <PowerCard title="Pontos atuais (sincronizados com a ficha base)">
          <div className="grid grid-cols-3 gap-3">
            <CurrentBlock label="PV" max={pvMax} color="from-red-500 to-rose-400"
              current={sheet.stats.pv_current} disabled={!canEdit}
              onChange={(v) => setSheet((p) => p ? { ...p, stats: { ...p.stats, pv_current: clamp(v, -99, pvMax) } } : p)} />
            <CurrentBlock label="PS" max={psMax} color="from-purple-500 to-fuchsia-400"
              current={sheet.stats.ps_current} disabled={!canEdit}
              onChange={(v) => setSheet((p) => p ? { ...p, stats: { ...p.stats, ps_current: clamp(v, -99, psMax) } } : p)} />
            <CurrentBlock label="PE" max={peMax} color="from-emerald-500 to-teal-400"
              current={sheet.stats.pe_current} disabled={!canEdit}
              onChange={(v) => setSheet((p) => p ? { ...p, stats: { ...p.stats, pe_current: clamp(v, -99, peMax) } } : p)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
            <Stat label="PV máx" value={pvMax} accent="text-rose-300" />
            <Stat label="PS máx" value={psMax} accent="text-fuchsia-300" />
            <Stat label="PE máx" value={peMax} accent="text-teal-300" />
            <Stat label="Defesa" value={defTotal} accent="text-sky-300" />
          </div>
        </PowerCard>

        {/* Attribute overrides */}
        <PowerCard title="Atributos (override exclusivo da Forma)">
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(effAttrs) as (keyof Attributes)[]).map((k) => {
              const cur = effAttrs[k];
              const isOverride = pf.attributes?.[k] !== undefined;
              return (
                <div key={k} className={`rounded-lg p-2 text-center border transition-all ${
                  isOverride ? "border-orange-400/70 bg-orange-500/10 shadow-[0_0_15px_-5px_rgba(255,140,60,0.7)]" : "border-border bg-card/40"}`}>
                  <div className="font-cinzel text-xs text-orange-200">{k}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Button size="sm" variant="ghost" disabled={!canEdit} className="h-6 w-6 p-0"
                      onClick={() => setPf({ attributes: { ...(pf.attributes ?? {}), [k]: Math.max(0, cur - 1) } })}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-bold text-lg">{cur}</span>
                    <Button size="sm" variant="ghost" disabled={!canEdit} className="h-6 w-6 p-0"
                      onClick={() => setPf({ attributes: { ...(pf.attributes ?? {}), [k]: Math.min(10, cur + 1) } })}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                  {isOverride && canEdit && (
                    <button onClick={() => {
                      const next = { ...(pf.attributes ?? {}) };
                      delete next[k];
                      setPf({ attributes: next });
                    }} className="text-[9px] text-orange-300 hover:text-orange-100 mt-1 underline">resetar</button>
                  )}
                </div>
              );
            })}
          </div>
        </PowerCard>

        {/* Notes */}
        <PowerCard title="Notas da Forma">
          <Textarea disabled={!canEdit} value={pf.notes ?? ""}
            onChange={(e) => setPf({ notes: e.target.value })} rows={4}
            placeholder="Aparência, duração, custos de manutenção, gatilhos..." />
        </PowerCard>

        {/* Weapons */}
        <PowerCard title="Armas (Forma)" extra={
          canEdit && (
            <AddItemDialog<Weapon>
              title="Nova Arma (Forma)" triggerLabel="Adicionar"
              initial={{ id: "", nome: "", tipo: "", alcance: "Curto", dano: "", critico: "", peso: 0, extra: "" }}
              fields={[
                { key: "nome", label: "Nome" },
                { key: "tipo", label: "Tipo" },
                { key: "alcance", label: "Alcance", type: "select", options: WEAPON_RANGE_OPTIONS },
                { key: "dano", label: "Dano" },
                { key: "critico", label: "Crítico" },
                { key: "peso", label: "Peso", type: "number" },
                { key: "extra", label: "Extra" },
              ]}
              onAdd={(w) => setPf({ weapons: [...effWeapons, { ...w, id: genId() }] })} />
          )
        }>
          <ListRows rows={effWeapons} canEdit={canEdit}
            fields={["nome", "tipo", "alcance", "dano", "critico", "extra"]}
            onChange={(v) => setPf({ weapons: v as Weapon[] })} />
        </PowerCard>

        {/* Abilities */}
        <PowerCard title="Habilidades (Forma)" extra={
          canEdit && (
            <AddItemDialog<Ability>
              title="Nova Habilidade (Forma)" triggerLabel="Adicionar"
              initial={{ id: "", nome: "", descricao: "", modificador: "" }}
              fields={[
                { key: "nome", label: "Nome" },
                { key: "descricao", label: "Descrição", type: "textarea" },
                { key: "modificador", label: "Modificador" },
              ]}
              onAdd={(a) => setPf({ abilities: [...effAbilities, { ...a, id: genId() }] })} />
          )
        }>
          <ListRows rows={effAbilities} canEdit={canEdit}
            fields={["nome", "descricao", "modificador"]}
            onChange={(v) => setPf({ abilities: v as Ability[] })} />
        </PowerCard>

        {/* Plots */}
        <PowerCard title="Tramas (Forma)" extra={
          canEdit && (
            <AddItemDialog<Plot>
              title="Nova Trama (Forma)" triggerLabel="Adicionar"
              initial={{ id: "", nome: "", uso: "", alcance: "Pessoal", dano: "", efeito: "", dt_descricao: "" }}
              fields={[
                { key: "nome", label: "Nome" },
                { key: "uso", label: "Uso" },
                { key: "alcance", label: "Alcance", type: "select", options: PLOT_RANGE_OPTIONS },
                { key: "dano", label: "Dano" },
                { key: "efeito", label: "Efeito", type: "textarea" },
                { key: "dt_descricao", label: "DT / Descrição", type: "textarea" },
              ]}
              onAdd={(p) => setPf({ plots: [...effPlots, { ...p, id: genId() }] })} />
          )
        }>
          <ListRows rows={effPlots} canEdit={canEdit}
            fields={["nome", "uso", "alcance", "dano", "efeito", "dt_descricao"]}
            onChange={(v) => setPf({ plots: v as Plot[] })} />
        </PowerCard>

        {/* Inventory */}
        <PowerCard title="Inventário (Forma)" extra={
          canEdit && (
            <AddItemDialog<InventoryItem>
              title="Novo Item (Forma)" triggerLabel="Adicionar"
              initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
              fields={[
                { key: "nome", label: "Nome" },
                { key: "descricao", label: "Descrição", type: "textarea" },
                { key: "espaco", label: "Espaço", type: "number" },
              ]}
              onAdd={(it) => setPf({ inventory: [...effInventory, { ...it, id: genId() }] })} />
          )
        }>
          <ListRows rows={effInventory} canEdit={canEdit}
            fields={["nome", "descricao"]}
            onChange={(v) => setPf({ inventory: v as InventoryItem[] })} />
        </PowerCard>

        <p className="text-center text-[10px] text-orange-200/60 py-6">
          Forma de Poder · Tadeon Nexus
        </p>
      </div>
    </div>
  );
}

function PowerCard({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="p-4 mb-4 bg-card/30 backdrop-blur-md border-orange-500/30 shadow-[0_0_25px_-10px_rgba(255,120,60,0.55)] hover:border-orange-400/60 transition-all animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="font-cinzel font-bold bg-gradient-to-r from-orange-300 to-pink-300 bg-clip-text text-transparent">{title}</h3>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-2 text-center border border-border/40">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${accent}`}>{value}</div>
    </div>
  );
}

function CurrentBlock({ label, current, max, color, disabled, onChange }:
  { label: string; current: number; max: number; color: string; disabled?: boolean; onChange: (v: number) => void }) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return (
    <div className="bg-card/40 border border-orange-400/20 rounded-lg p-3 transition-all hover:border-orange-400/50">
      <div className="flex items-baseline justify-between">
        <div className="font-cinzel font-bold text-orange-100">{label}</div>
        <div className="text-xl font-bold">{current} / {max}</div>
      </div>
      <div className="w-full h-2 bg-secondary rounded-full my-2 overflow-hidden">
        <div className={`h-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={disabled} onClick={() => onChange(current - 1)}>
          <Minus className="w-3 h-3" />
        </Button>
        <Input type="number" disabled={disabled} value={current}
          onChange={(e) => onChange(Number(e.target.value))} className="h-7 text-center text-xs" />
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={disabled} onClick={() => onChange(current + 1)}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

function ListRows<T extends { id: string }>({ rows, canEdit, fields, onChange }: {
  rows: T[]; canEdit: boolean; fields: string[]; onChange: (v: T[]) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-xs text-orange-200/60 italic text-center py-3">Nenhum item ainda.</p>;
  }
  const update = (idx: number, key: string, value: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };
  return (
    <div className="space-y-1.5">
      {rows.map((it, idx) => (
        <div key={it.id} className="bg-background/20 border border-orange-400/15 rounded-lg p-2 grid gap-1.5"
          style={{ gridTemplateColumns: `${fields.map(() => "minmax(0, 1fr)").join(" ")} auto` }}>
          {fields.map((f) => (
            <Input key={f}
              disabled={!canEdit}
              value={String((it as Record<string, unknown>)[f] ?? "")}
              placeholder={f}
              onChange={(e) => update(idx, f, e.target.value)}
              className="h-8 text-xs bg-background/40" />
          ))}
          {canEdit && (
            <Button size="sm" variant="ghost"
              onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/20">
              <Trash className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
