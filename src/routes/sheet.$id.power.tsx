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
import { ArrowLeft, Save, Loader2, Plus, Minus, Trash, Sparkles, Flame } from "lucide-react";
import { toast } from "sonner";
import {
  type Attributes, type Stats, type Weapon, type InventoryItem, type Ability, type Plot,
  type RankRow, type UpgradeCosts, type Description, type Conditions, type StatUpgrades,
  getRankBase, genId, DEFAULT_UPGRADE_COSTS,
} from "@/lib/sheet-types";
import { AddItemDialog } from "@/components/sheet/add-item-dialog";

export const Route = createFileRoute("/sheet/$id/power")({
  head: () => ({ meta: [{ title: "VP — Tadeon Nexus" }] }),
  component: () => (
    <ProtectedShell>
      <PowerFormPage />
    </ProtectedShell>
  ),
});

const PLOT_RANGE_OPTIONS = ["Pessoal", "Curto", "Médio", "Longo", "Extremo"];
const WEAPON_RANGE_OPTIONS = ["Curto", "Médio", "Longo", "Extremo"];

interface VPData {
  __initialized?: boolean;
  __synced_ids?: { weapons: string[]; inventory: string[]; abilities: string[]; plots: string[]; fragments_items: string[] };
  __synced_exposure?: number;
  // Mirror fields
  name?: string; occupation?: string; age?: string; brand?: string; origin?: string; motivation?: string;
  exposure?: number; equilibrium?: number;
  attributes?: Attributes;
  stat_mods?: Partial<Pick<Stats, "pv_mod" | "ps_mod" | "pe_mod" | "def_mod" | "def_equip">>;
  conditions?: Conditions;
  weapons?: Weapon[];
  inventory?: InventoryItem[];
  abilities?: Ability[];
  plots?: Plot[];
  fragments_items?: InventoryItem[];
  stat_upgrades?: StatUpgrades;
  description?: Description;
  notes?: string;
}

interface BaseRow {
  id: string; owner_id: string;
  name: string; occupation: string; age: string; brand: string; origin: string; motivation: string;
  exposure: number; equilibrium: number;
  attributes: Attributes; stats: Stats;
  conditions: Conditions;
  weapons: Weapon[]; inventory: InventoryItem[]; abilities: Ability[]; plots: Plot[];
  fragments_items: InventoryItem[]; stat_upgrades: StatUpgrades;
  description: Description; notes: string;
  power_form_enabled: boolean;
  power_form_data: VPData;
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function syncFromBase(base: BaseRow, prev: VPData): VPData {
  const next: VPData = { ...prev };
  // First time: clone everything
  if (!next.__initialized) {
    next.__initialized = true;
    next.name = base.name;
    next.occupation = base.occupation;
    next.age = base.age;
    next.brand = base.brand;
    next.origin = base.origin;
    next.motivation = base.motivation;
    next.exposure = base.exposure;
    next.equilibrium = base.equilibrium;
    next.attributes = { ...base.attributes };
    next.stat_mods = {
      pv_mod: base.stats.pv_mod, ps_mod: base.stats.ps_mod, pe_mod: base.stats.pe_mod,
      def_mod: base.stats.def_mod, def_equip: base.stats.def_equip,
    };
    next.conditions = { ...base.conditions };
    next.weapons = base.weapons.map((w) => ({ ...w }));
    next.inventory = base.inventory.map((w) => ({ ...w }));
    next.abilities = base.abilities.map((w) => ({ ...w }));
    next.plots = base.plots.map((w) => ({ ...w }));
    next.fragments_items = (base.fragments_items ?? []).map((w) => ({ ...w }));
    next.stat_upgrades = { ...base.stat_upgrades };
    next.description = { ...base.description };
    next.notes = base.notes;
    next.__synced_exposure = base.exposure;
    next.__synced_ids = {
      weapons: base.weapons.map((x) => x.id),
      inventory: base.inventory.map((x) => x.id),
      abilities: base.abilities.map((x) => x.id),
      plots: base.plots.map((x) => x.id),
      fragments_items: (base.fragments_items ?? []).map((x) => x.id),
    };
    return next;
  }
  // Incremental sync: append base items not yet seen
  const synced = next.__synced_ids ?? { weapons: [], inventory: [], abilities: [], plots: [], fragments_items: [] };
  const mergeList = <T extends { id: string }>(key: keyof typeof synced, baseList: T[], vpList: T[] | undefined): T[] => {
    const seen = new Set(synced[key]);
    const additions = baseList.filter((b) => !seen.has(b.id)).map((b) => ({ ...b }));
    additions.forEach((a) => synced[key].push(a.id));
    return [...(vpList ?? []), ...additions];
  };
  next.weapons = mergeList("weapons", base.weapons, next.weapons);
  next.inventory = mergeList("inventory", base.inventory, next.inventory);
  next.abilities = mergeList("abilities", base.abilities, next.abilities);
  next.plots = mergeList("plots", base.plots, next.plots);
  next.fragments_items = mergeList("fragments_items", base.fragments_items ?? [], next.fragments_items);
  next.__synced_ids = synced;
  // Exposure: copy delta
  const lastExp = next.__synced_exposure ?? base.exposure;
  if (base.exposure > lastExp) {
    next.exposure = (next.exposure ?? base.exposure) + (base.exposure - lastExp);
  }
  next.__synced_exposure = base.exposure;
  return next;
}

function PowerFormPage() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [base, setBase] = useState<BaseRow | null>(null);
  const [vp, setVp] = useState<VPData>({});
  const [currents, setCurrents] = useState<{ pv: number; ps: number; pe: number }>({ pv: 0, ps: 0, pe: 0 });
  const [rankTable, setRankTable] = useState<RankRow[]>([]);
  const [_upgradeCosts, setUpgradeCosts] = useState<UpgradeCosts>(DEFAULT_UPGRADE_COSTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextSave = useRef(true);

  const canEdit = role === "mestre" || (base?.owner_id === user?.id && role !== "espectador");

  useEffect(() => {
    void (async () => {
      const [{ data, error }, { data: settingsJson }] = await Promise.all([
        supabase.from("character_sheets").select("*").eq("id", id).maybeSingle(),
        supabase.rpc("get_public_game_settings"),
      ]);
      if (error || !data) { toast.error("Ficha não encontrada."); void navigate({ to: "/" }); return; }
      const raw = data as unknown as Record<string, unknown>;
      if (!raw.power_form_enabled) {
        toast.error("VP não liberada pelo mestre.");
        void navigate({ to: "/sheet/$id", params: { id } });
        return;
      }
      const baseRow: BaseRow = {
        id: String(raw.id), owner_id: String(raw.owner_id),
        name: String(raw.name ?? ""), occupation: String(raw.occupation ?? ""),
        age: String(raw.age ?? ""), brand: String(raw.brand ?? ""),
        origin: String(raw.origin ?? ""), motivation: String(raw.motivation ?? ""),
        exposure: Number(raw.exposure ?? 0), equilibrium: Number(raw.equilibrium ?? 0),
        attributes: raw.attributes as Attributes, stats: raw.stats as Stats,
        conditions: raw.conditions as Conditions,
        weapons: (raw.weapons as Weapon[]) ?? [],
        inventory: (raw.inventory as InventoryItem[]) ?? [],
        abilities: (raw.abilities as Ability[]) ?? [],
        plots: (raw.plots as Plot[]) ?? [],
        fragments_items: (raw.fragments_items as InventoryItem[]) ?? [],
        stat_upgrades: raw.stat_upgrades as StatUpgrades,
        description: (raw.description as Description) ?? { historia: "", personalidade: "", objetivos: "", observacoes: "" },
        notes: String(raw.notes ?? ""),
        power_form_enabled: true,
        power_form_data: (raw.power_form_data as VPData) ?? {},
      };
      setBase(baseRow);
      const synced = syncFromBase(baseRow, baseRow.power_form_data);
      setVp(synced);
      setCurrents({
        pv: Number((baseRow.stats as Stats).pv_current ?? 0),
        ps: Number((baseRow.stats as Stats).ps_current ?? 0),
        pe: Number((baseRow.stats as Stats).pe_current ?? 0),
      });
      const g = (settingsJson as Record<string, unknown> | null) ?? {};
      setRankTable((g.rank_table as RankRow[] | undefined) ?? []);
      setUpgradeCosts((g.upgrade_costs as UpgradeCosts | undefined) ?? DEFAULT_UPGRADE_COSTS);
      setLoading(false);
      // Persist the synced state so future loads don't re-process
      if (synced !== baseRow.power_form_data) {
        void supabase.from("character_sheets").update({ power_form_data: synced as never }).eq("id", baseRow.id);
      }
    })();
  }, [id, navigate]);

  useEffect(() => {
    if (!base || !canEdit) return;
    if (skipNextSave.current) { skipNextSave.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(), 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp, currents]);

  const doSave = async () => {
    if (!base) return;
    setSaving(true);
    const nextStats: Stats = { ...base.stats, pv_current: currents.pv, ps_current: currents.ps, pe_current: currents.pe };
    const { error } = await supabase.from("character_sheets")
      .update({ stats: nextStats as never, power_form_data: vp as never })
      .eq("id", base.id);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
  };

  const patch = (p: Partial<VPData>) => setVp((prev) => ({ ...prev, ...p }));

  if (loading || !base) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
  }

  const attrs = vp.attributes ?? base.attributes;
  const upg = vp.stat_upgrades ?? base.stat_upgrades;
  const mods = vp.stat_mods ?? {};
  const exposure = vp.exposure ?? base.exposure;
  const rank = getRankBase(exposure, rankTable);
  const pvMax = rank.pv + (mods.pv_mod ?? 0) + 3 * attrs.COR + 3 * upg.pv;
  const psMax = rank.ps + (mods.ps_mod ?? 0) + 3 * attrs.MEN + 3 * upg.ps;
  const peMax = rank.pe + (mods.pe_mod ?? 0) + 3 * attrs.ERU + 2 * upg.pe;
  const defTotal = clamp(rank.def + (mods.def_equip ?? 0) + (mods.def_mod ?? 0) + upg.def, 0, 25);
  const invCapacity = 5 + 2 * attrs.COR;
  const invUsed =
    (vp.weapons ?? []).reduce((s, w) => s + (Number(w.peso) || 0), 0) +
    (vp.inventory ?? []).reduce((s, i) => s + (Number(i.espaco) || 0), 0) +
    (vp.fragments_items ?? []).reduce((s, i) => s + (Number(i.espaco) || 0), 0);

  const pvCap = Math.floor(pvMax * 1.5);
  const pvMin = -Math.floor(pvMax * 0.5);
  const psCap = Math.floor(psMax * 1.5);
  const psMin = -Math.floor(psMax * 0.5);
  const peCap = Math.floor(peMax * 1.5);
  const peMin = -Math.floor(peMax * 0.5);

  return (
    <div
      className="min-h-screen relative pb-24 animate-in fade-in-0 duration-500"
      style={{
        background:
          "radial-gradient(ellipse at top, rgba(251,113,133,0.30), transparent 55%), radial-gradient(ellipse at bottom, rgba(168,85,247,0.25), transparent 55%), linear-gradient(180deg, #200712 0%, #0a0210 100%)",
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 vp-pulse"
        style={{ background: "radial-gradient(circle at 50% 20%, rgba(255,120,40,0.22), transparent 55%)" }} />
      <style>{`@keyframes vpPulse{0%,100%{opacity:.55}50%{opacity:1}}.vp-pulse{animation:vpPulse 3s ease-in-out infinite}`}</style>

      <div className="max-w-6xl mx-auto p-3 md:p-6 relative z-10">
        {/* Header */}
        <div className="sticky top-0 z-20 -mx-3 md:-mx-6 px-3 md:px-6 py-3 mb-4 bg-background/40 backdrop-blur-xl border-b border-orange-500/50 shadow-[0_4px_30px_rgba(255,100,50,0.35)]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/sheet/$id", params: { id: base.id } })} title="Voltar à ficha base">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Sparkles className="w-5 h-5 text-orange-300 animate-pulse" />
            <h1 className="font-cinzel text-lg md:text-2xl font-bold flex-1 truncate bg-gradient-to-r from-orange-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,150,80,0.6)]">
              {vp.name ?? base.name} · VP
            </h1>
            {canEdit && (
              <>
                {saving && <span className="text-[10px] text-orange-200 hidden sm:flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Salvando…</span>}
                <Button size="sm" onClick={doSave}
                  className="gap-1.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white shadow-[0_0_20px_rgba(255,120,60,0.6)]">
                  <Save className="w-4 h-4" /> <span className="hidden sm:inline">Salvar</span>
                </Button>
              </>
            )}
          </div>
          <p className="text-[11px] text-orange-200/80 mt-1 flex items-center gap-1">
            <Flame className="w-3 h-3" /> PV/PS/PE atuais são compartilhados com a base. Tudo o mais é independente — adições na base são copiadas para cá uma vez.
          </p>
        </div>

        <Tabs defaultValue="ficha" className="w-full">
          <TabsList className="bg-card/40 border border-orange-500/30">
            <TabsTrigger value="ficha" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">Ficha</TabsTrigger>
            <TabsTrigger value="desc" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100">Descrição</TabsTrigger>
          </TabsList>

          <TabsContent value="ficha" className="mt-3 space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            {/* Info */}
            <VPCard title="Informações">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {([
                  ["name", "Nome"], ["occupation", "Ocupação"], ["age", "Idade"],
                  ["brand", "Marca"], ["origin", "Origem"], ["motivation", "Motivação"],
                ] as const).map(([k, label]) => (
                  <div key={k}>
                    <Label className="text-orange-200/80 text-[11px]">{label}</Label>
                    <Input disabled={!canEdit} value={(vp[k] ?? "") as string}
                      onChange={(e) => patch({ [k]: e.target.value } as Partial<VPData>)}
                      className="bg-card/40 border-orange-500/30 focus-visible:ring-orange-400" />
                  </div>
                ))}
                <div>
                  <Label className="text-orange-200/80 text-[11px]">Exposição</Label>
                  <Input type="number" disabled={!canEdit} value={exposure}
                    onChange={(e) => patch({ exposure: Number(e.target.value) || 0 })}
                    className="bg-card/40 border-orange-500/30" />
                </div>
                <div>
                  <Label className="text-orange-200/80 text-[11px]">Equilíbrio (-10 a 10)</Label>
                  <Input type="number" disabled={!canEdit} value={vp.equilibrium ?? 0}
                    onChange={(e) => patch({ equilibrium: clamp(Number(e.target.value) || 0, -10, 10) })}
                    className="bg-card/40 border-orange-500/30" />
                </div>
              </div>
            </VPCard>

            {/* Attributes */}
            <VPCard title="Atributos">
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => (
                  <div key={k} className="rounded-lg p-2 text-center border border-orange-500/40 bg-orange-500/10 shadow-[0_0_15px_-6px_rgba(255,140,60,0.6)]">
                    <div className="font-cinzel text-xs text-orange-200">{k}</div>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Button size="sm" variant="ghost" disabled={!canEdit} className="h-6 w-6 p-0"
                        onClick={() => patch({ attributes: { ...attrs, [k]: Math.max(0, attrs[k] - 1) } })}><Minus className="w-3 h-3" /></Button>
                      <span className="w-6 text-center font-bold text-lg">{attrs[k]}</span>
                      <Button size="sm" variant="ghost" disabled={!canEdit} className="h-6 w-6 p-0"
                        onClick={() => patch({ attributes: { ...attrs, [k]: Math.min(10, attrs[k] + 1) } })}><Plus className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </VPCard>

            {/* Points (current shared, max VP-only) */}
            <VPCard title="Pontos">
              <div className="grid grid-cols-3 gap-3">
                <PointBlock label="PV" max={pvMax} current={currents.pv} disabled={!canEdit} color="from-red-500 to-rose-400"
                  onChange={(v) => setCurrents((p) => ({ ...p, pv: clamp(v, pvMin, pvCap) }))} />
                <PointBlock label="PS" max={psMax} current={currents.ps} disabled={!canEdit} color="from-purple-500 to-fuchsia-400"
                  onChange={(v) => setCurrents((p) => ({ ...p, ps: clamp(v, psMin, psCap) }))} />
                <PointBlock label="PE" max={peMax} current={currents.pe} disabled={!canEdit} color="from-emerald-500 to-teal-400"
                  onChange={(v) => setCurrents((p) => ({ ...p, pe: clamp(v, peMin, peCap) }))} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-xs">
                <ModField label="Mod PV" value={mods.pv_mod ?? 0} disabled={!canEdit} onChange={(v) => patch({ stat_mods: { ...mods, pv_mod: clamp(v, -100, 150) } })} />
                <ModField label="Mod PS" value={mods.ps_mod ?? 0} disabled={!canEdit} onChange={(v) => patch({ stat_mods: { ...mods, ps_mod: clamp(v, -100, 150) } })} />
                <ModField label="Mod PE" value={mods.pe_mod ?? 0} disabled={!canEdit} onChange={(v) => patch({ stat_mods: { ...mods, pe_mod: clamp(v, -100, 150) } })} />
                <ModField label="Mod Def" value={mods.def_mod ?? 0} disabled={!canEdit} onChange={(v) => patch({ stat_mods: { ...mods, def_mod: clamp(v, -100, 150) } })} />
              </div>
            </VPCard>

            {/* Defenses */}
            <VPCard title="Defesa">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <Stat label="Base (rank)" value={rank.def} />
                <Stat label="Equip" value={mods.def_equip ?? 0} />
                <Stat label="Modificador" value={mods.def_mod ?? 0} />
                <Stat label="Total" value={defTotal} accent="text-sky-300 font-bold" />
              </div>
            </VPCard>

            {/* Inventory */}
            <VPCard title={`Inventário (${invUsed} / ${invCapacity})`} extra={canEdit && (
              <AddItemDialog<InventoryItem>
                title="Novo Item (VP)" triggerLabel="Adicionar"
                initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
                fields={[{ key: "nome", label: "Nome" }, { key: "descricao", label: "Descrição", type: "textarea" }, { key: "espaco", label: "Peso", type: "number" }]}
                onAdd={(it) => patch({ inventory: [...(vp.inventory ?? []), { ...it, id: genId() }] })} />
            )}>
              <ItemRows rows={vp.inventory ?? []} canEdit={canEdit} fields={["nome", "descricao", "espaco"]}
                onChange={(v) => patch({ inventory: v as InventoryItem[] })} />
            </VPCard>

            {/* Weapons */}
            <VPCard title="Armas" extra={canEdit && (
              <AddItemDialog<Weapon>
                title="Nova Arma (VP)" triggerLabel="Adicionar"
                initial={{ id: "", nome: "", tipo: "", alcance: "Curto", dano: "", critico: "", peso: 0, extra: "" }}
                fields={[
                  { key: "nome", label: "Nome" }, { key: "tipo", label: "Tipo" },
                  { key: "alcance", label: "Alcance", type: "select", options: WEAPON_RANGE_OPTIONS },
                  { key: "dano", label: "Dano" }, { key: "critico", label: "Crítico" },
                  { key: "peso", label: "Peso", type: "number" }, { key: "extra", label: "Extra" },
                ]}
                onAdd={(w) => patch({ weapons: [...(vp.weapons ?? []), { ...w, id: genId() }] })} />
            )}>
              <ItemRows rows={vp.weapons ?? []} canEdit={canEdit}
                fields={["nome", "tipo", "alcance", "dano", "critico", "extra"]}
                onChange={(v) => patch({ weapons: v as Weapon[] })} />
            </VPCard>

            {/* Abilities */}
            <VPCard title="Habilidades" extra={canEdit && (
              <AddItemDialog<Ability>
                title="Nova Habilidade (VP)" triggerLabel="Adicionar"
                initial={{ id: "", nome: "", descricao: "", modificador: "" }}
                fields={[{ key: "nome", label: "Nome" }, { key: "descricao", label: "Descrição", type: "textarea" }, { key: "modificador", label: "Modificador" }]}
                onAdd={(a) => patch({ abilities: [...(vp.abilities ?? []), { ...a, id: genId() }] })} />
            )}>
              <ItemRows rows={vp.abilities ?? []} canEdit={canEdit}
                fields={["nome", "descricao", "modificador"]}
                onChange={(v) => patch({ abilities: v as Ability[] })} />
            </VPCard>

            {/* Plots */}
            <VPCard title="Tramas" extra={canEdit && (
              <AddItemDialog<Plot>
                title="Nova Trama (VP)" triggerLabel="Adicionar"
                initial={{ id: "", nome: "", uso: "", alcance: "Pessoal", dano: "", efeito: "", dt_descricao: "" }}
                fields={[
                  { key: "nome", label: "Nome" }, { key: "uso", label: "Uso" },
                  { key: "alcance", label: "Alcance", type: "select", options: PLOT_RANGE_OPTIONS },
                  { key: "dano", label: "Dano" },
                  { key: "efeito", label: "Efeito", type: "textarea" },
                  { key: "dt_descricao", label: "DT / Descrição", type: "textarea" },
                ]}
                onAdd={(p) => patch({ plots: [...(vp.plots ?? []), { ...p, id: genId() }] })} />
            )}>
              <ItemRows rows={vp.plots ?? []} canEdit={canEdit}
                fields={["nome", "uso", "alcance", "dano", "efeito", "dt_descricao"]}
                onChange={(v) => patch({ plots: v as Plot[] })} />
            </VPCard>

            {/* Fragments */}
            <VPCard title="Fragmentos" extra={canEdit && (
              <AddItemDialog<InventoryItem>
                title="Novo Fragmento (VP)" triggerLabel="Adicionar"
                initial={{ id: "", nome: "", descricao: "", espaco: 1 }}
                fields={[{ key: "nome", label: "Nome" }, { key: "descricao", label: "Descrição", type: "textarea" }, { key: "espaco", label: "Peso", type: "number" }]}
                onAdd={(it) => patch({ fragments_items: [...(vp.fragments_items ?? []), { ...it, id: genId() }] })} />
            )}>
              <ItemRows rows={vp.fragments_items ?? []} canEdit={canEdit} fields={["nome", "descricao", "espaco"]}
                onChange={(v) => patch({ fragments_items: v as InventoryItem[] })} />
            </VPCard>

            {/* Notes */}
            <VPCard title="Anotações">
              <Textarea disabled={!canEdit} value={vp.notes ?? ""} rows={5}
                onChange={(e) => patch({ notes: e.target.value })}
                className="bg-card/40 border-orange-500/30" />
            </VPCard>
          </TabsContent>

          <TabsContent value="desc" className="mt-3 space-y-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
            {(["historia", "personalidade", "objetivos", "observacoes"] as const).map((k) => (
              <VPCard key={k} title={({ historia: "História", personalidade: "Personalidade", objetivos: "Objetivos", observacoes: "Observações" } as const)[k]}>
                <Textarea disabled={!canEdit} rows={6}
                  value={(vp.description?.[k] ?? "") as string}
                  onChange={(e) => patch({ description: { ...(vp.description ?? { historia: "", personalidade: "", objetivos: "", observacoes: "" }), [k]: e.target.value } })}
                  className="bg-card/40 border-orange-500/30" />
              </VPCard>
            ))}
          </TabsContent>
        </Tabs>

        <p className="text-center text-[10px] text-orange-200/60 py-6">VP · Tadeon Nexus</p>
      </div>
    </div>
  );
}

function VPCard({ title, children, extra }: { title: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="p-4 bg-card/30 backdrop-blur-md border-orange-500/30 shadow-[0_0_25px_-10px_rgba(255,120,60,0.55)] hover:border-orange-400/60 transition-all">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-cinzel text-sm font-bold text-orange-200 tracking-wide">{title}</h3>
        {extra}
      </div>
      {children}
    </Card>
  );
}

function Stat({ label, value, accent = "" }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-md border border-orange-500/25 bg-orange-500/5 p-2">
      <div className="text-[10px] uppercase tracking-wider text-orange-200/70">{label}</div>
      <div className={`text-lg font-bold ${accent || "text-orange-50"}`}>{value}</div>
    </div>
  );
}

function ModField({ label, value, disabled, onChange }: { label: string; value: number; disabled?: boolean; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-orange-200/70">{label}</Label>
      <Input type="number" disabled={disabled} value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="h-8 bg-card/40 border-orange-500/30" />
    </div>
  );
}

function PointBlock({ label, max, current, disabled, color, onChange }: { label: string; max: number; current: number; disabled?: boolean; color: string; onChange: (v: number) => void }) {
  const pct = Math.max(0, Math.min(100, ((current + Math.abs(Math.min(0, current))) / Math.max(1, max + Math.abs(Math.min(0, current)))) * 100));
  return (
    <div className="rounded-lg border border-orange-500/30 bg-card/40 p-3">
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-cinzel text-xs text-orange-200">{label}</span>
        <span className="text-[11px] text-orange-200/70">/ {max}</span>
      </div>
      <div className="h-2 rounded-full bg-black/40 overflow-hidden mb-2">
        <div className={`h-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-center gap-1">
        <Button size="sm" variant="ghost" disabled={disabled} className="h-7 w-7 p-0" onClick={() => onChange(current - 1)}><Minus className="w-3 h-3" /></Button>
        <Input type="number" disabled={disabled} value={current} onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-7 w-16 text-center bg-card/40 border-orange-500/30" />
        <Button size="sm" variant="ghost" disabled={disabled} className="h-7 w-7 p-0" onClick={() => onChange(current + 1)}><Plus className="w-3 h-3" /></Button>
      </div>
    </div>
  );
}

function ItemRows<T extends { id: string } & Record<string, unknown>>({ rows, canEdit, fields, onChange }: {
  rows: T[]; canEdit: boolean; fields: string[]; onChange: (v: T[]) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-[11px] text-orange-200/50 italic py-2">Vazio.</p>;
  }
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <div key={r.id} className="grid gap-1.5 p-2 rounded-md border border-orange-500/20 bg-black/20"
          style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) auto` }}>
          {fields.map((f) => (
            <Input key={f} disabled={!canEdit} placeholder={f} value={String(r[f] ?? "")}
              onChange={(e) => {
                const next = [...rows];
                const nv = ["peso", "espaco"].includes(f) ? Number(e.target.value) : e.target.value;
                next[i] = { ...next[i], [f]: nv } as T;
                onChange(next);
              }}
              className="h-8 text-xs bg-card/40 border-orange-500/20" />
          ))}
          {canEdit && (
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-orange-300 hover:text-red-400"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash className="w-3.5 h-3.5" /></Button>
          )}
        </div>
      ))}
    </div>
  );
}
