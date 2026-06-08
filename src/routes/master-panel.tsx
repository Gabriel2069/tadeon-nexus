import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ProtectedShell } from "@/components/protected-shell";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2, Save, Plus, Trash, ChevronUp, ChevronDown, Maximize2, Eye, EyeOff,
  Swords, Skull, Search as SearchIcon, Users, ScrollText, Pin, Cog, Sparkles, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { RankRow, SkillBranch, UpgradeCosts, ConditionOptionsMap, ConditionKey, Attributes } from "@/lib/sheet-types";
import { genId, DEFAULT_UPGRADE_COSTS, DEFAULT_CONDITION_OPTIONS, CONDITION_META } from "@/lib/sheet-types";

export const Route = createFileRoute("/master-panel")({
  head: () => ({
    meta: [
      { title: "Painel do Mestre — Tadeon Nexus" },
      { name: "description", content: "Painel do mestre do Tadeon Nexus: cenas, NPCs, monstros, pistas, iniciativa e configurações da mesa de RPG." },
      { property: "og:title", content: "Painel do Mestre — Tadeon Nexus" },
      { property: "og:description", content: "Painel do mestre do Tadeon Nexus: cenas, NPCs, monstros, pistas, iniciativa e configurações da mesa de RPG." },
      { property: "og:url", content: "https://tadeon-nexus.lovable.app/master-panel" },
    ],
    links: [
      { rel: "canonical", href: "https://tadeon-nexus.lovable.app/master-panel" },
    ],
  }),
  component: () => (
    <ProtectedShell requireRole="mestre">
      <MasterPanel />
    </ProtectedShell>
  ),
});

interface NPC { id: string; name: string; role: string; description: string; secret: string; mood: string }
interface Monster { id: string; name: string; pv: number; pe: number; def: number; attack: string; weakness: string; notes: string }
interface Clue { id: string; title: string; content: string; discovered: boolean }
interface InitEntry { id: string; name: string; init: number; pv: number; isPlayer: boolean }
interface Scene {
  id: string; title: string; type: string; status: "Planejada" | "Em curso" | "Concluída";
  narrative: string; description: string;
  npcIds: string[]; monsterIds: string[]; clueIds: string[];
}

interface SettingsRow {
  id: string;
  initiative_notes: string;
  reminders: string;
  quick_refs: string;
  npcs: NPC[];
  monsters: Monster[];
  clues: Clue[];
  scenes_detailed: Scene[];
  initiative_order: InitEntry[];
  pinned_sheet_ids: string[];
  rank_table: RankRow[];
  skill_branches: SkillBranch[];
  upgrade_costs: UpgradeCosts;
  condition_options: ConditionOptionsMap;
  skill_groups: { attr: string; label: string; skills: string[] }[];
  skill_training_costs: [number, number, number];
}

interface SheetSummary {
  id: string; name: string; owner_email: string;
  exposure: number;
  stats: { pv_current: number; ps_current: number; pe_current: number };
  attributes: Record<string, number>;
  equilibrium: number;
  power_form_enabled?: boolean;
}


function MasterPanel() {
  const [s, setS] = useState<SettingsRow | null>(null);
  const [sheets, setSheets] = useState<SheetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: gs }, { data: ch }] = await Promise.all([
        supabase.from("game_settings").select("*").eq("key", "global").maybeSingle(),
        supabase.from("character_sheets").select("id,name,owner_email,exposure,stats,attributes,equilibrium,power_form_enabled"),
      ]);
      if (gs) {
        const g = gs as unknown as Record<string, unknown>;
        setS({
          ...(gs as unknown as SettingsRow),
          npcs: (g.npcs as NPC[]) ?? [],
          monsters: (g.monsters as Monster[]) ?? [],
          clues: (g.clues as Clue[]) ?? [],
          scenes_detailed: (g.scenes_detailed as Scene[]) ?? [],
          initiative_order: (g.initiative_order as InitEntry[]) ?? [],
          pinned_sheet_ids: (g.pinned_sheet_ids as string[]) ?? [],
          rank_table: (g.rank_table as RankRow[]) ?? [],
          skill_branches: (g.skill_branches as SkillBranch[]) ?? [],
          upgrade_costs: (g.upgrade_costs as UpgradeCosts) ?? DEFAULT_UPGRADE_COSTS,
          condition_options: (g.condition_options as ConditionOptionsMap) ?? DEFAULT_CONDITION_OPTIONS,
          skill_groups: (g.skill_groups as SettingsRow["skill_groups"]) ?? [
            { attr: "COR", label: "Corpo", skills: ["Acrobacia","Atletismo","Combate","Furtividade"] },
            { attr: "MEN", label: "Mente", skills: ["Investigação","Percepção","Sobrevivência","Vontade"] },
            { attr: "INS", label: "Instinto", skills: ["Iniciativa","Pontaria","Reflexos","Intuição"] },
            { attr: "PRE", label: "Presença", skills: ["Atuação","Diplomacia","Enganação","Intimidação"] },
            { attr: "ERU", label: "Erudição", skills: ["Ciências","Medicina","Ocultismo","Tecnologia"] },
          ],
          skill_training_costs: ((g.skill_training_costs as number[] | undefined) && (g.skill_training_costs as number[]).length >= 3
            ? [(g.skill_training_costs as number[])[0], (g.skill_training_costs as number[])[1], (g.skill_training_costs as number[])[2]]
            : [2, 3, 4]) as [number, number, number],
        });
      }
      setSheets((ch as unknown as SheetSummary[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    const { id, ...payload } = s;
    const { error } = await supabase.from("game_settings").update(payload as never).eq("id", id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Painel salvo!");
  };

  const upd = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) =>
    setS((p) => (p ? { ...p, [k]: v } : p));

  if (loading || !s) {
    return <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-3 md:p-6 pb-24">
      <div className="sticky top-0 z-10 -mx-3 md:-mx-6 px-3 md:px-6 py-3 mb-4 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-cinzel text-xl md:text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Painel do Mestre
          </h1>
          <Button onClick={save} disabled={saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span className="hidden sm:inline">Salvar</span>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scenes" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start gap-1 bg-card/60 p-1">
          <Trig value="scenes" icon={<ScrollText className="w-3.5 h-3.5" />}>Cenas</Trig>
          <Trig value="initiative" icon={<Swords className="w-3.5 h-3.5" />}>Iniciativa</Trig>
          <Trig value="npcs" icon={<Users className="w-3.5 h-3.5" />}>NPCs</Trig>
          <Trig value="monsters" icon={<Skull className="w-3.5 h-3.5" />}>Monstros</Trig>
          <Trig value="clues" icon={<SearchIcon className="w-3.5 h-3.5" />}>Pistas</Trig>
          <Trig value="pinned" icon={<Pin className="w-3.5 h-3.5" />}>Fichas</Trig>
          <Trig value="notes" icon={<ScrollText className="w-3.5 h-3.5" />}>Notas</Trig>
          <Trig value="data" icon={<Cog className="w-3.5 h-3.5" />}>Dados & Fórmulas</Trig>
        </TabsList>

        <TabsContent value="scenes" className="mt-0">
          <ScenesPanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="initiative" className="mt-0">
          <InitiativePanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="npcs" className="mt-0">
          <NPCsPanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="monsters" className="mt-0">
          <MonstersPanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="clues" className="mt-0">
          <CluesPanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="pinned" className="mt-0">
          <PinnedPanel s={s} upd={upd} sheets={sheets} setSheets={setSheets} />
        </TabsContent>
        <TabsContent value="notes" className="mt-0">
          <NotesPanel s={s} upd={upd} />
        </TabsContent>
        <TabsContent value="data" className="mt-0">
          <DataPanel s={s} upd={upd} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Trig({ value, icon, children }: { value: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
      {icon} {children}
    </TabsTrigger>
  );
}

type UpdFn = <K extends keyof SettingsRow>(k: K, v: SettingsRow[K]) => void;
interface PanelProps { s: SettingsRow; upd: UpdFn }

/* ============ Scenes ============ */
function ScenesPanel({ s, upd }: PanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const expanded = s.scenes_detailed.find((sc) => sc.id === expandedId);

  const add = () => {
    const newScene: Scene = {
      id: genId(), title: "Nova Cena", type: "Investigação", status: "Planejada",
      narrative: "", description: "", npcIds: [], monsterIds: [], clueIds: [],
    };
    upd("scenes_detailed", [...s.scenes_detailed, newScene]);
    setExpandedId(newScene.id);
  };
  const update = (id: string, patch: Partial<Scene>) =>
    upd("scenes_detailed", s.scenes_detailed.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)));
  const remove = (id: string) => {
    upd("scenes_detailed", s.scenes_detailed.filter((sc) => sc.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Mapa mental de cenas: visão geral e detalhes expansíveis.</p>
        <Button size="sm" onClick={add} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Nova Cena</Button>
      </div>

      {s.scenes_detailed.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground italic">Nenhuma cena criada.</Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {s.scenes_detailed.map((sc) => {
            const statusColor =
              sc.status === "Em curso" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
              sc.status === "Concluída" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
              "bg-blue-500/20 text-blue-400 border-blue-500/40";
            return (
              <Card key={sc.id} className="p-3 bg-card/70 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => setExpandedId(sc.id)}>
                <div className="flex items-start justify-between gap-1">
                  <h4 className="font-cinzel text-sm font-bold line-clamp-2">{sc.title}</h4>
                  <Maximize2 className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{sc.type}</div>
                <span className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded-full border ${statusColor}`}>{sc.status}</span>
                <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                  {sc.npcIds.length > 0 && <span>👤 {sc.npcIds.length}</span>}
                  {sc.monsterIds.length > 0 && <span>💀 {sc.monsterIds.length}</span>}
                  {sc.clueIds.length > 0 && <span>🔍 {sc.clueIds.length}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {expanded && (
        <Dialog open={!!expandedId} onOpenChange={(o) => !o && setExpandedId(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">{expanded.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs">Título</Label>
                  <Input value={expanded.title} onChange={(e) => update(expanded.id, { title: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Input value={expanded.type} onChange={(e) => update(expanded.id, { type: e.target.value })} />
                </div>
                <div className="sm:col-span-3">
                  <Label className="text-xs">Status</Label>
                  <select value={expanded.status}
                    onChange={(e) => update(expanded.id, { status: e.target.value as Scene["status"] })}
                    className="w-full bg-input border border-border rounded-md px-2 py-2 text-sm">
                    <option>Planejada</option>
                    <option>Em curso</option>
                    <option>Concluída</option>
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Texto Narrativo</Label>
                <Textarea rows={4} value={expanded.narrative}
                  onChange={(e) => update(expanded.id, { narrative: e.target.value })}
                  placeholder="Texto que o mestre pode ler em voz alta..." />
              </div>
              <div>
                <Label className="text-xs">Descrição / Notas</Label>
                <Textarea rows={3} value={expanded.description}
                  onChange={(e) => update(expanded.id, { description: e.target.value })} />
              </div>

              <LinkPicker label="NPCs" icon={<Users className="w-3.5 h-3.5" />}
                items={s.npcs.map((n) => ({ id: n.id, label: n.name }))}
                selected={expanded.npcIds}
                onChange={(ids) => update(expanded.id, { npcIds: ids })} />
              <LinkPicker label="Monstros" icon={<Skull className="w-3.5 h-3.5" />}
                items={s.monsters.map((m) => ({ id: m.id, label: m.name }))}
                selected={expanded.monsterIds}
                onChange={(ids) => update(expanded.id, { monsterIds: ids })} />
              <LinkPicker label="Pistas" icon={<SearchIcon className="w-3.5 h-3.5" />}
                items={s.clues.map((c) => ({ id: c.id, label: c.title }))}
                selected={expanded.clueIds}
                onChange={(ids) => update(expanded.id, { clueIds: ids })} />

              <div className="flex justify-between pt-3 border-t border-border">
                <Button variant="destructive" size="sm" onClick={() => remove(expanded.id)} className="gap-1.5">
                  <Trash className="w-3.5 h-3.5" /> Excluir
                </Button>
                <Button size="sm" onClick={() => setExpandedId(null)}>Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function LinkPicker({ label, icon, items, selected, onChange }: {
  label: string; icon: React.ReactNode;
  items: { id: string; label: string }[]; selected: string[]; onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <div>
      <Label className="text-xs flex items-center gap-1.5">{icon} {label}</Label>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic mt-1">Crie {label.toLowerCase()} primeiro.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {items.map((it) => {
            const on = selected.includes(it.id);
            return (
              <button key={it.id} type="button" onClick={() => toggle(it.id)}
                className={`text-[11px] px-2 py-1 rounded-full border transition-all ${
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:border-primary/50"
                }`}>
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ Initiative ============ */
function InitiativePanel({ s, upd }: PanelProps) {
  const [name, setName] = useState("");
  const [init, setInit] = useState(0);
  const sorted = [...s.initiative_order].sort((a, b) => b.init - a.init);

  const add = (isPlayer = false) => {
    if (!name.trim()) return;
    upd("initiative_order", [...s.initiative_order, { id: genId(), name, init, pv: 0, isPlayer }]);
    setName(""); setInit(0);
  };
  const update = (id: string, patch: Partial<InitEntry>) =>
    upd("initiative_order", s.initiative_order.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => upd("initiative_order", s.initiative_order.filter((e) => e.id !== id));
  const clear = () => upd("initiative_order", []);

  return (
    <Card className="p-4">
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Label className="text-xs">Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="NPC, jogador..." />
        </div>
        <div className="w-24">
          <Label className="text-xs">Iniciativa</Label>
          <Input type="number" value={init} onChange={(e) => setInit(Number(e.target.value))} />
        </div>
        <Button onClick={() => add(false)} className="gap-1.5"><Plus className="w-4 h-4" /> NPC</Button>
        <Button onClick={() => add(true)} variant="secondary" className="gap-1.5"><Plus className="w-4 h-4" /> Jogador</Button>
        {sorted.length > 0 && (
          <Button onClick={clear} variant="ghost" className="text-destructive">Limpar</Button>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        {sorted.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-6">Nenhum combatente na ordem.</p>
        ) : sorted.map((e, idx) => (
          <div key={e.id} className={`flex items-center gap-2 p-2 rounded-lg ${
            idx === 0 ? "bg-primary/15 border border-primary/40" : "bg-secondary/40"
          }`}>
            <span className="font-cinzel font-bold w-8 text-center text-primary">{idx + 1}º</span>
            <Input value={e.name} onChange={(ev) => update(e.id, { name: ev.target.value })} className="h-8 flex-1" />
            <Input type="number" value={e.init} onChange={(ev) => update(e.id, { init: Number(ev.target.value) })} className="h-8 w-16 text-center" />
            <Input type="number" value={e.pv} onChange={(ev) => update(e.id, { pv: Number(ev.target.value) })} className="h-8 w-16 text-center" placeholder="PV" />
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${e.isPlayer ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
              {e.isPlayer ? "J" : "N"}
            </span>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(e.id)}>
              <Trash className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============ Generic CRUD list with dialog ============ */
function CrudList<T extends { id: string }>({
  items, fields, labels, initial, onChange, titleKey, addLabel,
}: {
  items: T[]; fields: { key: keyof T; label: string; type?: "text" | "number" | "textarea" | "bool" }[];
  labels?: never; initial: T; onChange: (v: T[]) => void;
  titleKey: keyof T; addLabel: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const add = () => {
    const n = { ...initial, id: genId() };
    onChange([...items, n]);
    setOpenId(n.id);
  };
  const update = (id: string, patch: Partial<T>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => { onChange(items.filter((it) => it.id !== id)); if (openId === id) setOpenId(null); };
  const editing = items.find((it) => it.id === openId);

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-3">
        <p className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "entrada" : "entradas"}</p>
        <Button size="sm" onClick={add} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> {addLabel}</Button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-6">Vazio.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {items.map((it) => (
            <button key={it.id} onClick={() => setOpenId(it.id)}
              className="text-left bg-secondary/40 hover:bg-secondary/70 rounded-lg p-2.5 transition-all hover:border-primary/40 border border-transparent">
              <div className="font-cinzel text-sm font-bold truncate">{String(it[titleKey] || "(sem nome)")}</div>
              <div className="text-[10px] text-muted-foreground">Clique para editar</div>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">{String(editing[titleKey] || "Editar")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {fields.map((f) => {
                const val = editing[f.key];
                if (f.type === "textarea") return (
                  <div key={String(f.key)}>
                    <Label className="text-xs">{f.label}</Label>
                    <Textarea rows={3} value={String(val ?? "")}
                      onChange={(e) => update(editing.id, { [f.key]: e.target.value } as Partial<T>)} />
                  </div>
                );
                if (f.type === "bool") return (
                  <label key={String(f.key)} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={Boolean(val)}
                      onChange={(e) => update(editing.id, { [f.key]: e.target.checked } as Partial<T>)} />
                    {f.label}
                  </label>
                );
                return (
                  <div key={String(f.key)}>
                    <Label className="text-xs">{f.label}</Label>
                    <Input type={f.type === "number" ? "number" : "text"}
                      value={f.type === "number" ? Number(val ?? 0) : String(val ?? "")}
                      onChange={(e) => update(editing.id, {
                        [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                      } as Partial<T>)} />
                  </div>
                );
              })}
              <div className="flex justify-between pt-2 border-t border-border">
                <Button variant="destructive" size="sm" onClick={() => remove(editing.id)} className="gap-1.5">
                  <Trash className="w-3.5 h-3.5" /> Excluir
                </Button>
                <Button size="sm" onClick={() => setOpenId(null)}>Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function NPCsPanel({ s, upd }: PanelProps) {
  return (
    <CrudList<NPC>
      items={s.npcs}
      initial={{ id: "", name: "", role: "", description: "", secret: "", mood: "" }}
      fields={[
        { key: "name", label: "Nome" },
        { key: "role", label: "Papel" },
        { key: "mood", label: "Humor" },
        { key: "description", label: "Descrição", type: "textarea" },
        { key: "secret", label: "Segredo (só o mestre vê)", type: "textarea" },
      ]}
      titleKey="name"
      addLabel="Novo NPC"
      onChange={(v) => upd("npcs", v)}
    />
  );
}
function MonstersPanel({ s, upd }: PanelProps) {
  return (
    <CrudList<Monster>
      items={s.monsters}
      initial={{ id: "", name: "", pv: 10, pe: 0, def: 10, attack: "", weakness: "", notes: "" }}
      fields={[
        { key: "name", label: "Nome" },
        { key: "pv", label: "PV", type: "number" },
        { key: "pe", label: "PE", type: "number" },
        { key: "def", label: "Defesa", type: "number" },
        { key: "attack", label: "Ataque" },
        { key: "weakness", label: "Fraqueza" },
        { key: "notes", label: "Notas", type: "textarea" },
      ]}
      titleKey="name"
      addLabel="Novo Monstro"
      onChange={(v) => upd("monsters", v)}
    />
  );
}
function CluesPanel({ s, upd }: PanelProps) {
  return (
    <CrudList<Clue>
      items={s.clues}
      initial={{ id: "", title: "", content: "", discovered: false }}
      fields={[
        { key: "title", label: "Título" },
        { key: "content", label: "Conteúdo", type: "textarea" },
        { key: "discovered", label: "Descoberta pelos jogadores", type: "bool" },
      ]}
      titleKey="title"
      addLabel="Nova Pista"
      onChange={(v) => upd("clues", v)}
    />
  );
}

/* ============ Pinned sheets ============ */
function PinnedPanel({ s, upd, sheets, setSheets }: PanelProps & {
  sheets: SheetSummary[];
  setSheets: React.Dispatch<React.SetStateAction<SheetSummary[]>>;
}) {
  const navigate = useNavigate();
  const pinned = useMemo(() => s.pinned_sheet_ids
    .map((id) => sheets.find((sh) => sh.id === id))
    .filter((x): x is SheetSummary => !!x), [s.pinned_sheet_ids, sheets]);
  const toggle = (id: string) => {
    const next = s.pinned_sheet_ids.includes(id)
      ? s.pinned_sheet_ids.filter((x) => x !== id)
      : [...s.pinned_sheet_ids, id];
    upd("pinned_sheet_ids", next);
  };

  const togglePowerForm = async (sh: SheetSummary) => {
    const next = !sh.power_form_enabled;
    setSheets((prev) => prev.map((x) => (x.id === sh.id ? { ...x, power_form_enabled: next } : x)));
    const { error } = await supabase
      .from("character_sheets")
      .update({ power_form_enabled: next })
      .eq("id", sh.id);
    if (error) {
      toast.error("Falha ao atualizar Forma de Poder.");
      setSheets((prev) => prev.map((x) => (x.id === sh.id ? { ...x, power_form_enabled: !next } : x)));
    } else {
      toast.success(next ? "Forma de Poder liberada." : "Forma de Poder bloqueada.");
    }
  };



  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-2">Selecionar fichas</h3>
        <p className="text-xs text-muted-foreground mb-3">Escolha quais fichas exibir lado a lado.</p>
        <div className="flex flex-wrap gap-2">
          {sheets.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhuma ficha criada.</p>
          ) : sheets.map((sh) => {
            const on = s.pinned_sheet_ids.includes(sh.id);
            return (
              <button key={sh.id} onClick={() => toggle(sh.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                  on ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:border-primary/50"
                }`}>
                {on ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {sh.name || sh.owner_email}
              </button>
            );
          })}
        </div>
      </Card>

      {pinned.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground italic">Selecione fichas acima para comparar.</Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {pinned.map((sh) => {
            const eq = Math.max(-10, Math.min(10, Number(sh.equilibrium ?? 0)));
            const eqPct = ((eq + 10) / 20) * 100;
            return (
            <Card key={sh.id} className="p-3 bg-card/70">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-cinzel font-bold truncate">{sh.name || "Sem nome"}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{sh.owner_email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]"
                    onClick={() => navigate({ to: "/sheet/$id", params: { id: sh.id } })}>
                    <ExternalLink className="w-3 h-3" /> Abrir
                  </Button>
                  <button
                    type="button"
                    onClick={() => togglePowerForm(sh)}
                    title={sh.power_form_enabled ? "Forma de Poder LIBERADA — clique para bloquear" : "Forma de Poder bloqueada — clique para liberar"}
                    className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                      sh.power_form_enabled
                        ? "bg-primary/15 border-primary text-primary shadow-[0_0_8px_-2px_hsl(var(--primary))]"
                        : "bg-secondary/30 border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    {sh.power_form_enabled ? "Forma ON" : "Forma OFF"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mt-2 text-center text-xs">
                <Mini label="PV" v={sh.stats?.pv_current ?? 0} color="text-red-400" />
                <Mini label="PS" v={sh.stats?.ps_current ?? 0} color="text-purple-400" />
                <Mini label="PE" v={sh.stats?.pe_current ?? 0} color="text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Equilíbrio</span>
                  <span>{eq > 0 ? `+${eq}` : eq}</span>
                </div>
                <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="absolute inset-0" style={{
                    background: "linear-gradient(90deg, hsl(0,75%,18%) 0%, hsl(0,75%,50%) 50%, hsl(50,95%,55%) 50%, hsl(50,70%,95%) 100%)",
                    opacity: 0.35,
                  }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/70"
                    style={{ left: `calc(${eqPct}% - 1px)` }} />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5"><span>-10</span><span>0</span><span>+10</span></div>
              </div>
              <div className="mt-2">
                <div className="text-[10px] text-muted-foreground flex justify-between"><span>Exposição</span><span>{sh.exposure ?? 0}/100</span></div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
                    style={{ width: `${sh.exposure ?? 0}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1 mt-2 text-center text-[10px]">
                {["COR","MEN","INS","PRE","ERU"].map((a) => (
                  <div key={a} className="bg-secondary/40 rounded p-1">
                    <div className="text-muted-foreground">{a}</div>
                    <div className="font-bold text-sm">{sh.attributes?.[a] ?? 0}</div>
                  </div>
                ))}
              </div>
            </Card>
          );})}
        </div>
      )}
    </div>
  );
}
function Mini({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="bg-secondary/40 rounded p-1">
      <div className={`text-[10px] font-bold ${color}`}>{label}</div>
      <div className="font-bold">{v}</div>
    </div>
  );
}

/** Render text preserving newlines and converting URLs into clickable links (new tab). */
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80 break-all"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}



/* ============ Notes ============ */
function NotesPanel({ s, upd }: PanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-2">Notas de Iniciativa</h3>
        <Textarea rows={6} value={s.initiative_notes} onChange={(e) => upd("initiative_notes", e.target.value)} />
      </Card>
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-2">Lembretes</h3>
        <Textarea rows={6} value={s.reminders} onChange={(e) => upd("reminders", e.target.value)} />
      </Card>
      <Card className="p-4 md:col-span-2">
        <h3 className="font-cinzel font-bold mb-2">Referências Rápidas</h3>
        <Textarea rows={6} value={s.quick_refs} onChange={(e) => upd("quick_refs", e.target.value)}
          placeholder="Cole regras, links (https://...), atalhos. Links aparecem clicáveis no preview abaixo." />
        {s.quick_refs?.trim() && (
          <div className="mt-3 p-3 rounded-lg bg-secondary/30 border border-border/60 text-sm leading-relaxed whitespace-pre-wrap break-words">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Preview</p>
            <LinkifiedText text={s.quick_refs} />
          </div>
        )}
      </Card>

    </div>
  );
}

/* ============ Data & Formulas ============ */
function DataPanel({ s, upd }: PanelProps) {
  const moveRank = (idx: number, dir: -1 | 1) => {
    const arr = [...s.rank_table];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    upd("rank_table", arr);
  };
  const addRank = () => upd("rank_table", [...s.rank_table, { rank: 0, pv: 10, ps: 10, pe: 5, pa: 0, def: 10, pm: 0 }]);
  const seedRanks = () => {
    const arr: RankRow[] = [];
    for (let r = 0; r <= 100; r += 5) {
      arr.push({ rank: r, pv: 10 + r, ps: 10 + r, pe: 5 + Math.floor(r / 2), pa: 0, def: 10 + Math.floor(r / 5), pm: r * 2 });
    }
    upd("rank_table", arr);
  };
  const updRank = (i: number, key: keyof RankRow, val: number) =>
    upd("rank_table", s.rank_table.map((r, idx) => idx === i ? { ...r, [key]: val } : r));
  const rmRank = (i: number) => upd("rank_table", s.rank_table.filter((_, idx) => idx !== i));

  const addBranch = () => upd("skill_branches", [...s.skill_branches, { id: genId(), label: "Novo Ramo", color: "#fbbf24", nodes: [] }]);
  const updBranch = (id: string, patch: Partial<SkillBranch>) =>
    upd("skill_branches", s.skill_branches.map((b) => b.id === id ? { ...b, ...patch } : b));
  const rmBranch = (id: string) => upd("skill_branches", s.skill_branches.filter((b) => b.id !== id));
  const addNode = (bId: string) => updBranch(bId, {
    nodes: [...(s.skill_branches.find((b) => b.id === bId)?.nodes ?? []),
      { id: genId(), name: "Nova Habilidade", desc: "", cost: 5, minRank: 0, requires: [], attrReqs: [] }],
  });
  const updNode = (bId: string, nId: string, patch: Partial<SkillBranch["nodes"][0]>) => {
    const b = s.skill_branches.find((x) => x.id === bId);
    if (!b) return;
    updBranch(bId, { nodes: b.nodes.map((n) => n.id === nId ? { ...n, ...patch } : n) });
  };
  const rmNode = (bId: string, nId: string) => {
    const b = s.skill_branches.find((x) => x.id === bId);
    if (!b) return;
    updBranch(bId, { nodes: b.nodes.filter((n) => n.id !== nId) });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-cinzel font-bold">Tabela de Rank</h3>
            <p className="text-xs text-muted-foreground">Valores base por nível de exposição (0 → 100, de 5 em 5).</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={seedRanks} className="gap-1.5">Gerar 0–100</Button>
            <Button size="sm" onClick={addRank} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Linha</Button>
          </div>
        </div>
        {s.rank_table.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">Sem linhas. Use "Gerar 0–100" para começar.</p>
        ) : (
          <div className="space-y-1 overflow-x-auto">
            <div className="grid gap-1.5 min-w-[640px] text-[10px] text-muted-foreground uppercase font-bold px-1"
              style={{ gridTemplateColumns: "auto repeat(7, 1fr) auto" }}>
              <div>#</div><div>Rank</div><div>PV</div><div>PS</div><div>PE</div><div>PA</div><div>Def</div><div>PM</div><div></div>
            </div>
            {s.rank_table.map((r, i) => (
              <div key={i} className="grid gap-1.5 min-w-[640px] items-center"
                style={{ gridTemplateColumns: "auto repeat(7, 1fr) auto" }}>
                <div className="flex flex-col">
                  <button onClick={() => moveRank(i, -1)}><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveRank(i, 1)}><ChevronDown className="w-3 h-3" /></button>
                </div>
                {(["rank", "pv", "ps", "pe", "pa", "def", "pm"] as const).map((k) => (
                  <Input key={k} type="number"
                    min={k === "rank" ? 0 : undefined}
                    max={k === "rank" ? 100 : undefined}
                    step={k === "rank" ? 5 : 1}
                    value={r[k]} onChange={(e) => updRank(i, k, Number(e.target.value))} className="h-8 text-xs" />
                ))}
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => rmRank(i)}>
                  <Trash className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Upgrade Costs */}
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-1">Custos de Aprimoramento (PM)</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Fórmula: até <em>níveis grátis</em>, custa o valor base; depois soma o incremento por nível adicional.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {(["pv", "ps", "pe", "def"] as const).map((k) => {
            const rule = s.upgrade_costs[k];
            return (
              <div key={k} className="bg-secondary/40 rounded-lg p-3 space-y-2">
                <div className="font-cinzel font-bold uppercase text-sm">{k}</div>
                <div>
                  <Label className="text-[10px]">Custo Base</Label>
                  <Input type="number" value={rule.base} className="h-8"
                    onChange={(e) => upd("upgrade_costs", { ...s.upgrade_costs, [k]: { ...rule, base: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label className="text-[10px]">Níveis no custo base</Label>
                  <Input type="number" value={rule.freeLevels} className="h-8"
                    onChange={(e) => upd("upgrade_costs", { ...s.upgrade_costs, [k]: { ...rule, freeLevels: Number(e.target.value) } })} />
                </div>
                <div>
                  <Label className="text-[10px]">Incremento por nível</Label>
                  <Input type="number" value={rule.increment} className="h-8"
                    onChange={(e) => upd("upgrade_costs", { ...s.upgrade_costs, [k]: { ...rule, increment: Number(e.target.value) } })} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Skill Training Costs */}
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-1">Custos de Treinamento de Perícia (PM)</h3>
        <p className="text-xs text-muted-foreground mb-3">
          PM gasto para evoluir cada perícia de um nível de treino para o próximo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["Iniciado (+5)", "Apurado (+10)", "Versado (+15)"] as const).map((label, i) => (
            <div key={label} className="bg-secondary/40 rounded-lg p-3 space-y-2">
              <div className="font-cinzel font-bold text-sm">{label}</div>
              <Input type="number" min={0} value={s.skill_training_costs[i] ?? 0} className="h-8"
                onChange={(e) => {
                  const next = [...s.skill_training_costs] as [number, number, number];
                  next[i] = Number(e.target.value);
                  upd("skill_training_costs", next);
                }} />
            </div>
          ))}
        </div>
      </Card>


      {/* Conditions editor */}
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-1">Listas de Condições</h3>
        <p className="text-xs text-muted-foreground mb-3">Uma opção por linha. A primeira opção deve ser "Normal".</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(CONDITION_META) as ConditionKey[]).map((c) => (
            <div key={c} className="bg-secondary/30 rounded-lg p-3">
              <Label className="text-xs flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full" style={{ background: CONDITION_META[c].color }} />
                {CONDITION_META[c].label}
              </Label>
              <Textarea rows={5} value={(s.condition_options[c] ?? []).join("\n")}
                onChange={(e) =>
                  upd("condition_options", {
                    ...s.condition_options,
                    [c]: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean),
                  })
                } />
            </div>
          ))}
        </div>
      </Card>

      {/* Skill Groups editor */}
      <Card className="p-4">
        <h3 className="font-cinzel font-bold mb-1">Listas de Perícias</h3>
        <p className="text-xs text-muted-foreground mb-3">Uma perícia por linha em cada grupo de atributo.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {s.skill_groups.map((g, gi) => (
            <div key={g.attr + gi} className="bg-secondary/30 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <Input value={g.attr} className="h-8 font-cinzel font-bold"
                  onChange={(e) => upd("skill_groups", s.skill_groups.map((x, i) => i === gi ? { ...x, attr: e.target.value.toUpperCase() } : x))} />
                <Input value={g.label} className="h-8"
                  onChange={(e) => upd("skill_groups", s.skill_groups.map((x, i) => i === gi ? { ...x, label: e.target.value } : x))} />
              </div>
              <Textarea rows={5} value={g.skills.join("\n")}
                onChange={(e) =>
                  upd("skill_groups", s.skill_groups.map((x, i) => i === gi ? { ...x, skills: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : x))
                } />
              <Button size="sm" variant="ghost" className="text-destructive h-7 gap-1"
                onClick={() => upd("skill_groups", s.skill_groups.filter((_, i) => i !== gi))}>
                <Trash className="w-3 h-3" /> Remover grupo
              </Button>
            </div>
          ))}
        </div>
        <Button size="sm" className="mt-3 gap-1.5"
          onClick={() => upd("skill_groups", [...s.skill_groups, { attr: "NOV", label: "Novo Grupo", skills: [] }])}>
          <Plus className="w-3.5 h-3.5" /> Novo grupo
        </Button>
      </Card>



      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-cinzel font-bold">Árvore de Habilidades</h3>
            <p className="text-xs text-muted-foreground">Defina ramos e nós que os jogadores podem comprar com PM.</p>
          </div>
          <Button size="sm" onClick={addBranch} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Ramo</Button>
        </div>
        {s.skill_branches.length === 0 ? (
          <p className="text-xs text-muted-foreground italic text-center py-4">Nenhum ramo.</p>
        ) : (
          <div className="space-y-3">
            {s.skill_branches.map((b) => (
              <div key={b.id} className="border border-border rounded-lg p-3 bg-secondary/30">
                <div className="flex items-center gap-2 mb-2">
                  <input type="color" value={b.color} onChange={(e) => updBranch(b.id, { color: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                  <Input value={b.label} onChange={(e) => updBranch(b.id, { label: e.target.value })} className="h-8 flex-1" />
                  <Button size="sm" onClick={() => addNode(b.id)} className="gap-1"><Plus className="w-3 h-3" /> Nó</Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => rmBranch(b.id)}>
                    <Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {b.nodes.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic">Sem nós.</p>
                ) : (
                  <div className="space-y-2">
                    {b.nodes.map((n) => (
                      <div key={n.id} className="bg-background/40 rounded p-2 space-y-2">
                        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto_auto] items-center">
                          <Input value={n.name} placeholder="Nome" onChange={(e) => updNode(b.id, n.id, { name: e.target.value })} className="h-8 text-xs" />
                          <Input value={n.desc} placeholder="Descrição" onChange={(e) => updNode(b.id, n.id, { desc: e.target.value })} className="h-8 text-xs" />
                          <Input type="number" value={n.cost} placeholder="PM" onChange={(e) => updNode(b.id, n.id, { cost: Number(e.target.value) })} className="h-8 w-20 text-xs" title="Custo em PM" />
                          <Input type="number" min={0} max={100} step={5} value={n.minRank} placeholder="Rank" onChange={(e) => updNode(b.id, n.id, { minRank: Number(e.target.value) })} className="h-8 w-20 text-xs" title="Rank mínimo" />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => rmNode(b.id, n.id)}>
                            <Trash className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-2 flex-wrap pl-1">
                          <span className="text-[10px] uppercase text-muted-foreground mt-1.5">Req. atributos:</span>
                          {(["COR", "MEN", "INS", "PRE", "ERU"] as (keyof Attributes)[]).map((a) => {
                            const cur = (n.attrReqs || []).find((x) => x.attr === a)?.value ?? 0;
                            return (
                              <label key={a} className="flex items-center gap-1 text-[10px] bg-secondary/40 px-1.5 py-1 rounded">
                                <span className="font-cinzel font-bold">{a}</span>
                                <Input type="number" min={0} max={5} value={cur}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    const others = (n.attrReqs || []).filter((x) => x.attr !== a);
                                    const next = v > 0 ? [...others, { attr: a, value: v }] : others;
                                    updNode(b.id, n.id, { attrReqs: next });
                                  }}
                                  className="h-6 w-11 text-xs px-1" />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
