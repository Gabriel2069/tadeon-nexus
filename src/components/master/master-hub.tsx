import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CircleDot,
  Gauge,
  Link2,
  Map,
  Minus,
  Pin,
  Plus,
  Radio,
  ScrollText,
  Search,
  ShieldAlert,
  Sparkles,
  Trash,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { genId } from "@/lib/sheet-types";
import type { MasterTab } from "@/components/master/master-panel-navigation";
import {
  calculateEncounterBalance,
  combinedThreatMagnitude,
  createEmptyClue,
  createEmptyFold,
  createEmptyInterlude,
  createEmptyNpc,
  createEmptyThreat,
  getFoldStageReference,
  maxThreatAbilityComplexity,
  maxThreatImpact,
  maxThreatPpPurchases,
  maxThreatRdPurchases,
  maxThreatVector,
  threatStats,
  threatValidationIssues,
  type MasterClue,
  type MasterFold,
  type MasterInterlude,
  type MasterNpc,
  type MasterScene,
  type MasterThreat,
} from "@/lib/master-data";

const THREAT_AREAS = [
  "Engajado",
  "Próximo",
  "Distante",
  "Longo",
  "Extremo",
  "Cone curto",
  "Cone longo",
  "Linha curta",
  "Linha longa",
  "Raio pequeno",
  "Raio médio",
  "Raio grande",
  "Aura curta",
  "Aura ampla",
  "Corrente",
] as const;

const THREAT_MOVEMENT_MODES = [
  "Escalada",
  "Natação",
  "Voo",
  "Deslocamento por Costura",
  "Teleporte curto",
  "Teleporte médio",
] as const;

export interface MasterSheetOverview {
  id: string;
  name: string;
  exposure: number;
  equilibrium: number;
  stats: {
    pv_current: number;
    ps_current: number;
    pe_current: number;
    pa_current?: number;
  };
}

function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-cinzel text-xl font-bold">{title}</h2>
        <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | number;
  options: readonly (string | number)[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
      {children}
    </Card>
  );
}

export function DashboardHub({
  campaignTitle,
  campaignPhase,
  scenes,
  npcs,
  clues,
  threats,
  interludes,
  folds,
  sheets,
  onCampaignTitle,
  onCampaignPhase,
  onNavigate,
  onOpenSheet,
}: {
  campaignTitle: string;
  campaignPhase: string;
  scenes: MasterScene[];
  npcs: MasterNpc[];
  clues: MasterClue[];
  threats: MasterThreat[];
  interludes: MasterInterlude[];
  folds: MasterFold[];
  sheets: MasterSheetOverview[];
  onCampaignTitle: (value: string) => void;
  onCampaignPhase: (value: string) => void;
  onNavigate: (tab: MasterTab) => void;
  onOpenSheet: (sheetId: string) => void;
}) {
  const openFolds = folds.filter((fold) => !fold.sealed).length;
  const openClues = clues.filter((clue) => !clue.discovered).length;
  const activeScenes = scenes.filter(
    (scene) => scene.status === "Em curso",
  ).length;
  const averageRank = sheets.length
    ? Math.round(
        sheets.reduce((sum, sheet) => sum + sheet.exposure, 0) / sheets.length,
      )
    : 0;
  const metrics = [
    ["Cenas ativas", activeScenes, Map],
    ["Pistas ocultas", openClues, BrainCircuit],
    ["Ameaças", threats.length, ShieldAlert],
    ["Dobras abertas", openFolds, CircleDot],
    ["Personagens", sheets.length, Users],
    ["Rank médio", averageRank, Gauge],
  ] as const;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-primary/35 bg-gradient-to-br from-primary/15 via-card to-card p-5">
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative grid gap-3 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
              <Sparkles className="h-4 w-4" /> Central de campanha
            </div>
            <Input
              value={campaignTitle}
              onChange={(event) => onCampaignTitle(event.target.value)}
              className="h-auto border-0 bg-transparent p-0 font-cinzel text-2xl font-bold shadow-none focus-visible:ring-0 md:text-3xl"
              placeholder="Nome da campanha"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">
              Fase / objetivo atual
            </Label>
            <Input
              value={campaignPhase}
              onChange={(event) => onCampaignPhase(event.target.value)}
              placeholder="Ex.: localizar a Âncora"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {metrics.map(([label, value, Icon]) => (
          <Card
            key={label}
            className="tadeon-master-metric tadeon-interactive-card p-3"
          >
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider">
                {label}
              </span>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-2 font-cinzel text-2xl font-bold">{value}</div>
          </Card>
        ))}
      </div>

      <div className="tadeon-master-overview-grid grid gap-3 lg:grid-cols-[minmax(15rem,0.72fr)_minmax(0,1.7fr)]">
        <Card className="tadeon-master-flow p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="tadeon-eyebrow">Atalhos conectados</p>
              <h3 className="mt-1 font-cinzel text-lg font-bold">
                Fluxo de condução
              </h3>
            </div>
            <ArrowRight className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <div className="mt-3 grid gap-1.5">
            {(
              [
                ["session", "Sessão ativa", "Cena, elenco e lembretes", Radio],
                ["scenes", "Cenas", "Estrutura e camadas", ScrollText],
                ["investigation", "Investigação", "Pistas e ligações", Search],
                ["pinned", "Fichas", "Leitura conjunta do grupo", Pin],
              ] as const
            ).map(([tab, label, detail, Icon], index) => (
              <button
                key={tab}
                type="button"
                className="tadeon-master-flow__item"
                onClick={() => onNavigate(tab)}
              >
                <span className="tadeon-master-flow__index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>

        <Card className="tadeon-master-roster p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="tadeon-eyebrow">Elenco da campanha</p>
              <h3 className="mt-1 font-cinzel text-lg font-bold">
                Visão conjunta das fichas
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Recursos atuais, exposição e equilíbrio em uma única leitura.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate("pinned")}
            >
              <Pin className="h-3.5 w-3.5" />
              Comparar fichas
            </Button>
          </div>
          {sheets.length ? (
            <div className="tadeon-master-roster__grid mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {sheets.slice(0, 9).map((sheet) => (
                <button
                  key={sheet.id}
                  type="button"
                  className="tadeon-master-character-card tadeon-interactive-card"
                  onClick={() => onOpenSheet(sheet.id)}
                  aria-label={`Abrir ficha de ${sheet.name}`}
                >
                  <span className="tadeon-master-character-card__head">
                    <span className="min-w-0">
                      <strong className="tadeon-interactive-card__title">
                        {sheet.name || "Sem nome"}
                      </strong>
                      <small>Rank {sheet.exposure}</small>
                    </span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <span className="tadeon-master-character-card__stats">
                    {[
                      ["PV", sheet.stats.pv_current],
                      ["PS", sheet.stats.ps_current],
                      ["PE", sheet.stats.pe_current],
                      ["PA", sheet.stats.pa_current ?? 0],
                    ].map(([label, value]) => (
                      <span key={String(label)}>
                        <strong>{value}</strong>
                        <small>{label}</small>
                      </span>
                    ))}
                  </span>
                  <span className="tadeon-master-character-card__balance">
                    <span>Equilíbrio</span>
                    <strong>
                      {sheet.equilibrium > 0
                        ? `+${sheet.equilibrium}`
                        : sheet.equilibrium}
                    </strong>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              Nenhuma ficha disponível nesta campanha.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-cinzel font-bold">Próximos focos</h3>
          <div className="mt-3 space-y-2 text-sm">
            {scenes
              .filter((scene) => scene.status !== "Concluída")
              .slice(0, 4)
              .map((scene) => (
                <div
                  key={scene.id}
                  className="flex items-center gap-3 rounded-lg bg-secondary/35 p-2.5"
                >
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <span className="flex-1 font-medium">{scene.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {scene.status}
                  </span>
                </div>
              ))}
            {!scenes.some((scene) => scene.status !== "Concluída") && (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhuma cena pendente.
              </p>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-cinzel font-bold">Preparação</h3>
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p>
              {interludes.filter((item) => item.status !== "Concluída").length}{" "}
              interlúdio(s) aberto(s)
            </p>
            <p>
              {npcs.filter((npc) => npc.state === "Pleno").length} NPC(s) em
              condição plena
            </p>
            <p>
              {
                clues.filter((clue) => clue.guaranteed && !clue.discovered)
                  .length
              }{" "}
              pista(s) garantida(s) pendente(s)
            </p>
            <p className="rounded-md border border-primary/25 bg-primary/5 p-2 text-foreground">
              O painel organiza dados e cálculos. Todas as rolagens continuam
              sendo feitas na mesa.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function InvestigationHub({
  clues,
  scenes,
  onChange,
}: {
  clues: MasterClue[];
  scenes: MasterScene[];
  onChange: (value: MasterClue[]) => void;
}) {
  const add = () =>
    onChange([
      ...clues,
      { ...createEmptyClue(), id: genId(), title: "Nova Pista" },
    ]);
  const patch = (id: string, changes: Partial<MasterClue>) =>
    onChange(
      clues.map((clue) => (clue.id === id ? { ...clue, ...changes } : clue)),
    );

  return (
    <div className="space-y-4">
      <PanelHeading
        title="Teia de Investigação"
        description="Organize pistas por camada, conexão e cena. Pistas garantidas evitam que a investigação trave por um único teste."
        action={
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Pista
          </Button>
        }
      />
      {clues.length === 0 ? (
        <EmptyState>Crie a primeira pista para começar a teia.</EmptyState>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {clues.map((clue, index) => (
            <Card
              key={clue.id}
              className={`p-4 ${clue.discovered ? "border-emerald-500/35" : ""}`}
            >
              <div className="flex items-start gap-2">
                <Input
                  value={clue.title}
                  onChange={(event) =>
                    patch(clue.id, { title: event.target.value })
                  }
                  className="font-cinzel font-bold"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  aria-label={`Remover pista ${index + 1}`}
                  onClick={() =>
                    onChange(clues.filter((item) => item.id !== clue.id))
                  }
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={clue.content}
                onChange={(event) =>
                  patch(clue.id, { content: event.target.value })
                }
                rows={3}
                placeholder="O que os personagens podem descobrir?"
                className="mt-2"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <SelectField
                  label="Tipo"
                  value={clue.type}
                  options={[
                    "Direta",
                    "Fragmento Narrativo",
                    "Contexto",
                    "Ligação",
                  ]}
                  onChange={(value) =>
                    patch(clue.id, { type: value as MasterClue["type"] })
                  }
                />
                <SelectField
                  label="Camada"
                  value={clue.depth}
                  options={["Superficial", "Atenta", "Profunda"]}
                  onChange={(value) =>
                    patch(clue.id, { depth: value as MasterClue["depth"] })
                  }
                />
                <SelectField
                  label="Cena"
                  value={clue.sceneId}
                  options={["", ...scenes.map((scene) => scene.id)]}
                  onChange={(value) => patch(clue.id, { sceneId: value })}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={clue.discovered ? "default" : "outline"}
                  onClick={() =>
                    patch(clue.id, { discovered: !clue.discovered })
                  }
                >
                  <Check className="mr-1 h-3.5 w-3.5" />{" "}
                  {clue.discovered ? "Descoberta" : "Oculta"}
                </Button>
                <Button
                  size="sm"
                  variant={clue.guaranteed ? "secondary" : "outline"}
                  onClick={() =>
                    patch(clue.id, { guaranteed: !clue.guaranteed })
                  }
                >
                  <BookOpenCheck className="mr-1 h-3.5 w-3.5" />{" "}
                  {clue.guaranteed ? "Garantida" : "Condicional"}
                </Button>
              </div>
              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="mb-2 flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Link2 className="h-3 w-3" /> Ligações
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {clues
                    .filter((item) => item.id !== clue.id)
                    .map((item) => {
                      const active = clue.linkedClueIds.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            patch(clue.id, {
                              linkedClueIds: active
                                ? clue.linkedClueIds.filter(
                                    (id) => id !== item.id,
                                  )
                                : [...clue.linkedClueIds, item.id],
                            })
                          }
                          className={`rounded-full border px-2 py-1 text-[10px] ${active ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                        >
                          {item.title}
                        </button>
                      );
                    })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function NpcHub({
  npcs,
  onChange,
}: {
  npcs: MasterNpc[];
  onChange: (value: MasterNpc[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = npcs.find((npc) => npc.id === openId);
  const add = () => {
    const npc = { ...createEmptyNpc(), id: genId(), name: "Novo NPC" };
    onChange([...npcs, npc]);
    setOpenId(npc.id);
  };
  const patch = (id: string, changes: Partial<MasterNpc>) =>
    onChange(npcs.map((npc) => (npc.id === id ? { ...npc, ...changes } : npc)));
  return (
    <div className="space-y-4">
      <PanelHeading
        title="Elenco de NPCs"
        description="Fichas narrativas e operacionais com convicção, limite, procedimento, relações, moral e estado."
        action={
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> NPC
          </Button>
        }
      />
      {npcs.length === 0 ? (
        <EmptyState>Nenhum NPC cadastrado.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {npcs.map((npc) => (
            <Card
              key={npc.id}
              role="button"
              tabIndex={0}
              aria-label={`Editar NPC ${npc.name}`}
              className="cursor-pointer p-4 transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:border-primary/50 active:scale-[.99]"
              onClick={() => setOpenId(npc.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setOpenId(npc.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-cinzel font-bold">{npc.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {npc.occupation || npc.role || "Sem função"}
                  </p>
                </div>
                <span className="rounded-full border px-2 py-0.5 text-[10px] text-primary">
                  {npc.classification}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded bg-secondary/40 p-2">
                  <span className="text-muted-foreground">PV</span>
                  <strong className="block">{npc.pv}</strong>
                </div>
                <div className="rounded bg-secondary/40 p-2">
                  <span className="text-muted-foreground">DEF</span>
                  <strong className="block">{npc.def}</strong>
                </div>
                <div className="rounded bg-secondary/40 p-2">
                  <span className="text-muted-foreground">Moral</span>
                  <strong className="block">{npc.morale}/5</strong>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                {npc.description || "Sem descrição."}
              </p>
            </Card>
          ))}
        </div>
      )}
      {active && (
        <Dialog
          open={Boolean(active)}
          onOpenChange={(open) => !open && setOpenId(null)}
        >
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-cinzel">{active.name}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={active.name}
                  onChange={(event) =>
                    patch(active.id, { name: event.target.value })
                  }
                />
              </label>
              <SelectField
                label="Classificação"
                value={active.classification}
                options={[
                  "Incidental",
                  "Secundário",
                  "Operacional",
                  "Principal",
                ]}
                onChange={(value) =>
                  patch(active.id, {
                    classification: value as MasterNpc["classification"],
                  })
                }
              />
              <SelectField
                label="Estado"
                value={active.state}
                options={[
                  "Pleno",
                  "Abalado",
                  "Comprometido",
                  "Incapacitado",
                  "Morto",
                ]}
                onChange={(value) =>
                  patch(active.id, { state: value as MasterNpc["state"] })
                }
              />
              {["organization", "occupation", "role", "appearance"].map(
                (key) => (
                  <label key={key} className="space-y-1">
                    <Label>
                      {
                        (
                          {
                            organization: "Organização",
                            occupation: "Ocupação",
                            role: "Função",
                            appearance: "Aparência",
                          } as Record<string, string>
                        )[key]
                      }
                    </Label>
                    <Input
                      value={String(active[key as keyof MasterNpc] ?? "")}
                      onChange={(event) =>
                        patch(active.id, { [key]: event.target.value })
                      }
                    />
                  </label>
                ),
              )}
              <label className="space-y-1">
                <Label>Moral (1–5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={active.morale}
                  onChange={(event) =>
                    patch(active.id, {
                      morale: Math.max(
                        1,
                        Math.min(5, Number(event.target.value)),
                      ) as MasterNpc["morale"],
                    })
                  }
                />
              </label>
              {["pv", "ps", "pe", "def", "movement"].map((key) => (
                <label key={key} className="space-y-1">
                  <Label>{key.toUpperCase()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={Number(active[key as keyof MasterNpc])}
                    onChange={(event) =>
                      patch(active.id, {
                        [key]: Math.max(
                          0,
                          Math.round(Number(event.target.value) || 0),
                        ),
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Atributos
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(
                    Object.keys(
                      active.attributes,
                    ) as (keyof MasterNpc["attributes"])[]
                  ).map((key) => (
                    <label key={key} className="space-y-1 text-center">
                      <span className="text-[10px] text-muted-foreground">
                        {key}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={5}
                        value={active.attributes[key]}
                        onChange={(event) =>
                          patch(active.id, {
                            attributes: {
                              ...active.attributes,
                              [key]: Math.max(
                                0,
                                Math.min(
                                  5,
                                  Math.round(Number(event.target.value) || 0),
                                ),
                              ),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Vetores funcionais
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(
                    Object.keys(
                      active.vectors,
                    ) as (keyof MasterNpc["vectors"])[]
                  ).map((key) => (
                    <label key={key} className="space-y-1 text-center">
                      <span className="text-[10px] capitalize text-muted-foreground">
                        {key}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        step={2}
                        value={active.vectors[key]}
                        onChange={(event) =>
                          patch(active.id, {
                            vectors: {
                              ...active.vectors,
                              [key]: Math.max(
                                0,
                                Math.min(
                                  10,
                                  Math.round(
                                    (Number(event.target.value) || 0) / 2,
                                  ) * 2,
                                ),
                              ),
                            },
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                "description",
                "conviction",
                "limit",
                "procedure",
                "resources",
                "relationships",
                "socialTension",
                "abilities",
                "inventory",
                "secret",
              ].map((key) => (
                <label key={key} className="space-y-1">
                  <Label>
                    {
                      (
                        {
                          description: "Descrição",
                          conviction: "Convicção",
                          limit: "Limite",
                          procedure: "Procedimento",
                          resources: "Recursos",
                          relationships: "Relações",
                          socialTension: "Tensão social",
                          abilities: "Habilidades",
                          inventory: "Inventário",
                          secret: "Segredo do mestre",
                        } as Record<string, string>
                      )[key]
                    }
                  </Label>
                  <Textarea
                    rows={2}
                    value={String(active[key as keyof MasterNpc] ?? "")}
                    onChange={(event) =>
                      patch(active.id, { [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => {
                onChange(npcs.filter((npc) => npc.id !== active.id));
                setOpenId(null);
              }}
            >
              <Trash className="mr-1 h-4 w-4" /> Excluir NPC
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function ThreatHub({
  threats,
  onChange,
}: {
  threats: MasterThreat[];
  onChange: (value: MasterThreat[]) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = threats.find((threat) => threat.id === openId);
  const add = () => {
    const threat = { ...createEmptyThreat(), id: genId(), name: "Nova Ameaça" };
    onChange([...threats, threat]);
    setOpenId(threat.id);
  };
  const patch = (id: string, changes: Partial<MasterThreat>) =>
    onChange(
      threats.map((threat) =>
        threat.id === id ? { ...threat, ...changes } : threat,
      ),
    );
  return (
    <div className="space-y-4">
      <PanelHeading
        title="Construtor de Ameaças"
        description="Magnitude I–XX, orçamento de CP, PP, DEF, RD, reações, vetores e pontos de selagem. O painel calcula a ficha, sem executar rolagens."
        action={
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Ameaça
          </Button>
        }
      />
      {threats.length === 0 ? (
        <EmptyState>Nenhuma ameaça construída.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {threats.map((threat) => {
            const stats = threatStats(threat);
            const issues = threatValidationIssues(threat);
            const invalid = issues.length > 0;
            return (
              <Card
                key={threat.id}
                className={`cursor-pointer p-4 hover:border-primary/50 ${invalid ? "border-destructive/60" : ""}`}
                onClick={() => setOpenId(threat.id)}
              >
                <div className="flex justify-between gap-2">
                  <div>
                    <h3 className="font-cinzel font-bold">{threat.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Magnitude {threat.magnitude} · {threat.archetype}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[10px] ${invalid ? "text-destructive" : "text-emerald-300"}`}
                  >
                    {stats.spent}/{stats.cp} CP
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1 text-center text-xs sm:grid-cols-4">
                  <div className="rounded bg-secondary/40 p-1.5">
                    PP<strong className="block">{stats.pp}</strong>
                  </div>
                  <div className="rounded bg-secondary/40 p-1.5">
                    DEF<strong className="block">{stats.def}</strong>
                  </div>
                  <div className="rounded bg-secondary/40 p-1.5">
                    RD<strong className="block">{stats.rd}</strong>
                  </div>
                  <div className="rounded bg-secondary/40 p-1.5">
                    REA<strong className="block">{stats.reactions}</strong>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {active &&
        (() => {
          const stats = threatStats(active);
          const issues = threatValidationIssues(active);
          const valid = issues.length === 0;
          return (
            <Dialog
              open={Boolean(active)}
              onOpenChange={(open) => !open && setOpenId(null)}
            >
              <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-cinzel">
                    {active.name}
                  </DialogTitle>
                </DialogHeader>
                <div
                  className={`rounded-lg border p-3 ${valid ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive bg-destructive/5"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Orçamento de construção
                    </span>
                    <strong>
                      {stats.spent} / {stats.cp} CP
                    </strong>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full ${valid ? "bg-emerald-500" : "bg-destructive"}`}
                      style={{
                        width: `${Math.min(100, (stats.spent / Math.max(1, stats.cp)) * 100)}%`,
                      }}
                    />
                  </div>
                  {issues.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] text-destructive">
                      {issues.map((issue) => (
                        <li key={issue}>• {issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <label className="space-y-1">
                    <Label>Nome</Label>
                    <Input
                      value={active.name}
                      onChange={(event) =>
                        patch(active.id, { name: event.target.value })
                      }
                    />
                  </label>
                  <SelectField
                    label="Magnitude"
                    value={active.magnitude}
                    options={Array.from(
                      { length: 20 },
                      (_, index) => index + 1,
                    )}
                    onChange={(value) =>
                      patch(active.id, {
                        magnitude: Number(value),
                        currentPp: threatStats({
                          ...active,
                          magnitude: Number(value),
                        }).pp,
                      })
                    }
                  />
                  <SelectField
                    label="Arquétipo"
                    value={active.archetype}
                    options={[
                      "Predador",
                      "Colosso",
                      "Manifestação",
                      "Emboscador",
                      "Enxame",
                    ]}
                    onChange={(value) =>
                      patch(active.id, {
                        archetype: value as MasterThreat["archetype"],
                      })
                    }
                  />
                  <SelectField
                    label="Índice de Desafio"
                    value={active.challengeIndex}
                    options={[1, 2, 3, 4, 5]}
                    onChange={(value) =>
                      patch(active.id, {
                        challengeIndex: Number(
                          value,
                        ) as MasterThreat["challengeIndex"],
                      })
                    }
                  />
                  <label className="space-y-1">
                    <Label>PP atual</Label>
                    <Input
                      type="number"
                      min={0}
                      max={stats.pp}
                      value={active.currentPp}
                      onChange={(event) =>
                        patch(active.id, {
                          currentPp: Math.max(
                            0,
                            Math.min(
                              stats.pp,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                  {["taxonomy", "manifestation", "nature"].map((key) => (
                    <label key={key} className="space-y-1">
                      <Label>
                        {
                          (
                            {
                              taxonomy: "Taxonomia",
                              manifestation: "Manifestação",
                              nature: "Natureza",
                            } as Record<string, string>
                          )[key]
                        }
                      </Label>
                      <Input
                        value={String(active[key as keyof MasterThreat] ?? "")}
                        onChange={(event) =>
                          patch(active.id, { [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(
                    [
                      ["ppPurchases", "PP (+6 / 1 CP)"],
                      ["defPurchases", "DEF (+1 / 2 CP)"],
                      ["rdPurchases", "RD (2, 3, 4… CP)"],
                      ["reactionPurchases", "Reação (+1 / 8 CP)"],
                      ["movementPurchases", "Mov. (+3m / 1 CP)"],
                    ] as const
                  ).map(([key, label]) => {
                    const maximum =
                      key === "ppPurchases"
                        ? maxThreatPpPurchases(active.magnitude)
                        : key === "defPurchases"
                          ? 4
                          : key === "rdPurchases"
                            ? maxThreatRdPurchases(active.magnitude)
                            : key === "reactionPurchases"
                              ? 1
                              : undefined;
                    return (
                      <label key={key} className="space-y-1">
                        <Label className="text-[10px]">
                          {label}
                          {maximum != null ? ` · máx. ${maximum}` : ""}
                        </Label>
                        <Input
                          type="number"
                          min={0}
                          max={maximum}
                          value={active[key]}
                          onChange={(event) => {
                            const value = Math.max(
                              0,
                              Math.round(Number(event.target.value) || 0),
                            );
                            patch(active.id, {
                              [key]:
                                maximum == null
                                  ? value
                                  : Math.min(maximum, value),
                            });
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1">
                    <Label>Condições especiais</Label>
                    <Textarea
                      rows={3}
                      value={active.specialConditions}
                      onChange={(event) =>
                        patch(active.id, {
                          specialConditions: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <Label>Notas táticas</Label>
                    <Textarea
                      rows={3}
                      value={active.notes}
                      onChange={(event) =>
                        patch(active.id, { notes: event.target.value })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <Label>Manifestação do ponto de selagem</Label>
                    <Textarea
                      rows={2}
                      value={active.stitchManifestation}
                      onChange={(event) =>
                        patch(active.id, {
                          stitchManifestation: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <Label>Condição de selagem</Label>
                    <Textarea
                      rows={2}
                      value={active.stitchCondition}
                      onChange={(event) =>
                        patch(active.id, {
                          stitchCondition: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1 sm:col-span-2">
                    <Label>Consequência da selagem</Label>
                    <Textarea
                      rows={2}
                      value={active.stitchConsequence}
                      onChange={(event) =>
                        patch(active.id, {
                          stitchConsequence: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Atributos
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
                      {(
                        Object.keys(
                          active.attributes,
                        ) as (keyof MasterThreat["attributes"])[]
                      ).map((key) => (
                        <label key={key} className="space-y-1">
                          <span className="text-[10px] text-muted-foreground">
                            {key}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={5}
                            value={active.attributes[key]}
                            onChange={(event) =>
                              patch(active.id, {
                                attributes: {
                                  ...active.attributes,
                                  [key]: Math.max(
                                    0,
                                    Math.min(
                                      5,
                                      Math.round(
                                        Number(event.target.value) || 0,
                                      ),
                                    ),
                                  ),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
                    <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                      Vetores de Tensão
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-5">
                      {Object.entries(active.vectors).map(([key, value]) => (
                        <label key={key} className="space-y-1">
                          <span className="text-[10px] text-muted-foreground">
                            {key}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={maxThreatVector(active.magnitude)}
                            value={value}
                            onChange={(event) =>
                              patch(active.id, {
                                vectors: {
                                  ...active.vectors,
                                  [key]: Math.max(
                                    0,
                                    Math.min(
                                      maxThreatVector(active.magnitude),
                                      Math.round(
                                        Number(event.target.value) || 0,
                                      ),
                                    ),
                                  ),
                                },
                              })
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Mobilidade comprada
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {THREAT_MOVEMENT_MODES.map((mode) => {
                      const activeMode = active.movementModes.includes(mode);
                      return (
                        <Button
                          key={mode}
                          type="button"
                          size="sm"
                          variant={activeMode ? "default" : "outline"}
                          onClick={() =>
                            patch(active.id, {
                              movementModes: activeMode
                                ? active.movementModes.filter(
                                    (item) => item !== mode,
                                  )
                                : [...active.movementModes, mode],
                            })
                          }
                        >
                          {mode}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Ataques
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Impacto, Vetor e Alcance entram automaticamente no
                        orçamento.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch(active.id, {
                          attacks: [
                            ...active.attacks,
                            {
                              id: genId(),
                              name: "Novo ataque",
                              vector: "Corpo",
                              impact: 1,
                              area: "Engajado",
                              effect: "",
                            },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Ataque
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {active.attacks.map((attack) => (
                      <div
                        key={attack.id}
                        className="grid gap-2 rounded-lg border border-border/50 bg-background/25 p-2 lg:grid-cols-[1.2fr_150px_90px_150px_2fr_auto]"
                      >
                        <Input
                          value={attack.name}
                          placeholder="Nome"
                          onChange={(event) =>
                            patch(active.id, {
                              attacks: active.attacks.map((item) =>
                                item.id === attack.id
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <select
                          value={attack.vector}
                          onChange={(event) =>
                            patch(active.id, {
                              attacks: active.attacks.map((item) =>
                                item.id === attack.id
                                  ? {
                                      ...item,
                                      vector: event.target
                                        .value as typeof item.vector,
                                    }
                                  : item,
                              ),
                            })
                          }
                          className="rounded-md border border-border bg-input px-2 text-xs"
                        >
                          {Object.keys(active.vectors).map((vector) => (
                            <option key={vector}>{vector}</option>
                          ))}
                        </select>
                        <select
                          value={attack.impact}
                          onChange={(event) =>
                            patch(active.id, {
                              attacks: active.attacks.map((item) =>
                                item.id === attack.id
                                  ? {
                                      ...item,
                                      impact: Number(
                                        event.target.value,
                                      ) as typeof item.impact,
                                    }
                                  : item,
                              ),
                            })
                          }
                          className="rounded-md border border-border bg-input px-2 text-xs"
                        >
                          {[1, 2, 3, 4, 5, 6].map((impact) => (
                            <option
                              key={impact}
                              value={impact}
                              disabled={
                                impact > maxThreatImpact(active.magnitude)
                              }
                            >
                              Impacto {impact}
                            </option>
                          ))}
                        </select>
                        <select
                          value={
                            attack.area === "Nenhuma" ? "Engajado" : attack.area
                          }
                          onChange={(event) =>
                            patch(active.id, {
                              attacks: active.attacks.map((item) =>
                                item.id === attack.id
                                  ? {
                                      ...item,
                                      area: event.target
                                        .value as typeof item.area,
                                    }
                                  : item,
                              ),
                            })
                          }
                          className="rounded-md border border-border bg-input px-2 text-xs"
                        >
                          {(attack.area === "Cena" ||
                            attack.area === "Território") && (
                            <option value={attack.area}>
                              {attack.area} · inválido para ataque
                            </option>
                          )}
                          {THREAT_AREAS.map((area) => (
                            <option key={area}>{area}</option>
                          ))}
                        </select>
                        <Input
                          value={attack.effect}
                          placeholder="Efeito / observação"
                          onChange={(event) =>
                            patch(active.id, {
                              attacks: active.attacks.map((item) =>
                                item.id === attack.id
                                  ? { ...item, effect: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Excluir ataque ${attack.name || "sem nome"}`}
                          onClick={() =>
                            patch(active.id, {
                              attacks: active.attacks.filter(
                                (item) => item.id !== attack.id,
                              ),
                            })
                          }
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Habilidades da ameaça
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Complexidade I–V atualiza o custo de CP.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        patch(active.id, {
                          abilities: [
                            ...active.abilities,
                            {
                              id: genId(),
                              name: "Nova habilidade",
                              complexity: 1,
                              description: "",
                            },
                          ],
                        })
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" /> Habilidade
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {active.abilities.map((ability) => (
                      <div
                        key={ability.id}
                        className="grid gap-2 rounded-lg border border-border/50 bg-background/25 p-2 sm:grid-cols-[1fr_130px_2fr_auto]"
                      >
                        <Input
                          value={ability.name}
                          onChange={(event) =>
                            patch(active.id, {
                              abilities: active.abilities.map((item) =>
                                item.id === ability.id
                                  ? { ...item, name: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <select
                          value={ability.complexity}
                          onChange={(event) =>
                            patch(active.id, {
                              abilities: active.abilities.map((item) =>
                                item.id === ability.id
                                  ? {
                                      ...item,
                                      complexity: Number(
                                        event.target.value,
                                      ) as typeof item.complexity,
                                    }
                                  : item,
                              ),
                            })
                          }
                          className="rounded-md border border-border bg-input px-2 text-xs"
                        >
                          {[1, 2, 3, 4, 5].map((complexity) => (
                            <option
                              key={complexity}
                              value={complexity}
                              disabled={
                                complexity >
                                maxThreatAbilityComplexity(active.magnitude)
                              }
                            >
                              Complexidade {complexity}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={ability.description}
                          placeholder="Descrição"
                          onChange={(event) =>
                            patch(active.id, {
                              abilities: active.abilities.map((item) =>
                                item.id === ability.id
                                  ? { ...item, description: event.target.value }
                                  : item,
                              ),
                            })
                          }
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Excluir habilidade ${ability.name || "sem nome"}`}
                          onClick={() =>
                            patch(active.id, {
                              abilities: active.abilities.filter(
                                (item) => item.id !== ability.id,
                              ),
                            })
                          }
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  className="mt-4"
                  onClick={() => {
                    onChange(
                      threats.filter((threat) => threat.id !== active.id),
                    );
                    setOpenId(null);
                  }}
                >
                  <Trash className="mr-1 h-4 w-4" /> Excluir ameaça
                </Button>
              </DialogContent>
            </Dialog>
          );
        })()}
    </div>
  );
}

export function InterludeHub({
  interludes,
  onChange,
}: {
  interludes: MasterInterlude[];
  onChange: (value: MasterInterlude[]) => void;
}) {
  const add = () =>
    onChange([...interludes, { ...createEmptyInterlude(), id: genId() }]);
  const patch = (id: string, changes: Partial<MasterInterlude>) =>
    onChange(
      interludes.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    );
  return (
    <div className="space-y-4">
      <PanelHeading
        title="Planejador de Interlúdios"
        description="Controle tempo, qualidade do abrigo, alimentação, profundidade narrativa e atividades principais ou secundárias."
        action={
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Interlúdio
          </Button>
        }
      />
      {interludes.length === 0 ? (
        <EmptyState>Nenhum interlúdio preparado.</EmptyState>
      ) : (
        <div className="space-y-3">
          {interludes.map((item, index) => (
            <Card key={item.id} className="p-4">
              <div className="flex gap-2">
                <Input
                  value={item.title}
                  onChange={(event) =>
                    patch(item.id, { title: event.target.value })
                  }
                  className="font-cinzel font-bold"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Remover interlúdio ${index + 1}`}
                  onClick={() =>
                    onChange(interludes.filter((entry) => entry.id !== item.id))
                  }
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-5">
                <SelectField
                  label="Status"
                  value={item.status}
                  options={["Planejada", "Em curso", "Concluída"]}
                  onChange={(value) =>
                    patch(item.id, {
                      status: value as MasterInterlude["status"],
                    })
                  }
                />
                <SelectField
                  label="Tempo"
                  value={item.time}
                  options={["Acelerado", "Tranquilo", "Prolongado"]}
                  onChange={(value) =>
                    patch(item.id, { time: value as MasterInterlude["time"] })
                  }
                />
                <SelectField
                  label="Qualidade"
                  value={item.quality}
                  options={[
                    "Hostil",
                    "Precário",
                    "Adequado",
                    "Confortável",
                    "Luxuoso",
                    "Refúgio",
                  ]}
                  onChange={(value) =>
                    patch(item.id, {
                      quality: value as MasterInterlude["quality"],
                    })
                  }
                />
                <SelectField
                  label="Narração"
                  value={item.narration}
                  options={[
                    "Superficial",
                    "Consciente",
                    "Ancorado",
                    "Enraizado",
                  ]}
                  onChange={(value) =>
                    patch(item.id, {
                      narration: value as MasterInterlude["narration"],
                    })
                  }
                />
                <SelectField
                  label="Alimentação"
                  value={item.food}
                  options={["Sem comida", "Básica", "Boa", "Especial"]}
                  onChange={(value) =>
                    patch(item.id, { food: value as MasterInterlude["food"] })
                  }
                />
              </div>
              <div className="mt-3 space-y-2">
                {item.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="grid gap-2 rounded-lg bg-secondary/30 p-2 md:grid-cols-[1fr_130px_2fr_2fr_auto]"
                  >
                    <Input
                      value={activity.character}
                      placeholder="Personagem"
                      onChange={(event) =>
                        patch(item.id, {
                          activities: item.activities.map((entry) =>
                            entry.id === activity.id
                              ? { ...entry, character: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    <select
                      value={activity.kind}
                      onChange={(event) =>
                        patch(item.id, {
                          activities: item.activities.map((entry) =>
                            entry.id === activity.id
                              ? {
                                  ...entry,
                                  kind: event.target.value as typeof entry.kind,
                                }
                              : entry,
                          ),
                        })
                      }
                      className="rounded-md border border-border bg-input px-2 text-sm"
                    >
                      <option>Principal</option>
                      <option>Secundária</option>
                    </select>
                    <Input
                      value={activity.activity}
                      placeholder="Atividade"
                      onChange={(event) =>
                        patch(item.id, {
                          activities: item.activities.map((entry) =>
                            entry.id === activity.id
                              ? { ...entry, activity: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    <Input
                      value={activity.outcome}
                      placeholder="Resultado / custo"
                      onChange={(event) =>
                        patch(item.id, {
                          activities: item.activities.map((entry) =>
                            entry.id === activity.id
                              ? { ...entry, outcome: event.target.value }
                              : entry,
                          ),
                        })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Excluir atividade ${activity.activity || "sem nome"}`}
                      onClick={() =>
                        patch(item.id, {
                          activities: item.activities.filter(
                            (entry) => entry.id !== activity.id,
                          ),
                        })
                      }
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    patch(item.id, {
                      activities: [
                        ...item.activities,
                        {
                          id: genId(),
                          character: "",
                          kind: "Principal",
                          activity: "",
                          outcome: "",
                        },
                      ],
                    })
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Atividade
                </Button>
              </div>
              <Textarea
                className="mt-3"
                rows={2}
                value={item.notes}
                onChange={(event) =>
                  patch(item.id, { notes: event.target.value })
                }
                placeholder="Notas do interlúdio"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function FoldHub({
  folds,
  onChange,
}: {
  folds: MasterFold[];
  onChange: (value: MasterFold[]) => void;
}) {
  const add = () => onChange([...folds, { ...createEmptyFold(), id: genId() }]);
  const patch = (id: string, changes: Partial<MasterFold>) =>
    onChange(
      folds.map((fold) => (fold.id === id ? { ...fold, ...changes } : fold)),
    );
  return (
    <div className="space-y-4">
      <PanelHeading
        title="Dobras e Selagem"
        description="Acompanhe estágio, tensão, permanência, pulso e pontos de costura. Marcar um ponto não executa testes: apenas registra o estado da sessão."
        action={
          <Button size="sm" onClick={add}>
            <Plus className="mr-1 h-4 w-4" /> Dobra
          </Button>
        }
      />
      {folds.length === 0 ? (
        <EmptyState>Nenhuma dobra ativa.</EmptyState>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {folds.map((fold, index) => {
            const stageReference = getFoldStageReference(fold.stage);
            return (
              <Card
                key={fold.id}
                className={`p-4 ${fold.sealed ? "border-emerald-500/40" : "border-violet-500/30"}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={fold.name}
                    onChange={(event) =>
                      patch(fold.id, { name: event.target.value })
                    }
                    className="font-cinzel font-bold"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={fold.sealed ? "default" : "outline"}
                      className="flex-1 sm:flex-none"
                      onClick={() => patch(fold.id, { sealed: !fold.sealed })}
                    >
                      {fold.sealed ? "Selada" : "Aberta"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={`Remover dobra ${index + 1}`}
                      onClick={() =>
                        onChange(folds.filter((entry) => entry.id !== fold.id))
                      }
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <SelectField
                    label="Estágio"
                    value={fold.stage}
                    options={[
                      "Pré-Furo",
                      "Furo I",
                      "Furo II",
                      "Furo III",
                      "Âncora I",
                      "Âncora II",
                      "Âncora III",
                      "Zona de Aspecto",
                      "Revérbero",
                    ]}
                    onChange={(value) => {
                      const nextStage = value as MasterFold["stage"];
                      const nextReference = getFoldStageReference(nextStage);
                      const nextMaximum =
                        fold.maxPermanence <= stageReference.basePermanence
                          ? nextReference.basePermanence
                          : Math.min(
                              12,
                              Math.max(
                                nextReference.basePermanence,
                                fold.maxPermanence,
                              ),
                            );
                      patch(fold.id, {
                        stage: nextStage,
                        tension:
                          nextStage === "Revérbero"
                            ? 0
                            : Math.min(4, Math.max(0, fold.tension)),
                        maxPermanence: nextMaximum,
                        permanence: Math.min(fold.permanence, nextMaximum),
                      });
                    }}
                  />
                  <label className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Tensão
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={4}
                      disabled={fold.stage === "Revérbero"}
                      value={fold.tension}
                      onChange={(event) =>
                        patch(fold.id, {
                          tension: Math.max(
                            0,
                            Math.min(
                              4,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Permanência
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={fold.maxPermanence}
                      value={fold.permanence}
                      onChange={(event) =>
                        patch(fold.id, {
                          permanence: Math.max(
                            0,
                            Math.min(
                              fold.maxPermanence,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                  <label className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Máximo
                    </Label>
                    <Input
                      type="number"
                      min={stageReference.basePermanence}
                      max={12}
                      value={fold.maxPermanence}
                      onChange={(event) =>
                        patch(fold.id, {
                          maxPermanence: Math.max(
                            stageReference.basePermanence,
                            Math.min(
                              12,
                              Math.round(Number(event.target.value) || 0),
                            ),
                          ),
                          permanence: Math.min(
                            fold.permanence,
                            Math.max(
                              stageReference.basePermanence,
                              Math.min(
                                12,
                                Math.round(Number(event.target.value) || 0),
                              ),
                            ),
                          ),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-secondary/20 p-2 text-center text-[10px] sm:grid-cols-4">
                  <div>
                    <span className="text-muted-foreground">DT base</span>
                    <strong className="block text-foreground">
                      {stageReference.dt}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Cargas</span>
                    <strong className="block text-foreground">
                      {stageReference.charges}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Permanência-base
                    </span>
                    <strong className="block text-foreground">
                      {stageReference.basePermanence}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pulso</span>
                    <strong className="block text-foreground">
                      {stageReference.pulseModifier == null
                        ? "estável"
                        : `1d6 + ${stageReference.pulseModifier}`}
                    </strong>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Input
                    value={fold.nature}
                    onChange={(event) =>
                      patch(fold.id, { nature: event.target.value })
                    }
                    placeholder="Natureza da dobra"
                  />
                  <Input
                    value={fold.environmentalEffect}
                    onChange={(event) =>
                      patch(fold.id, {
                        environmentalEffect: event.target.value,
                      })
                    }
                    placeholder="Efeito ambiental"
                  />
                  <Textarea
                    rows={2}
                    value={fold.pulseConsequence}
                    onChange={(event) =>
                      patch(fold.id, { pulseConsequence: event.target.value })
                    }
                    placeholder="Consequência do pulso"
                  />
                  <Textarea
                    rows={2}
                    value={fold.notes}
                    onChange={(event) =>
                      patch(fold.id, { notes: event.target.value })
                    }
                    placeholder="Notas"
                  />
                </div>
                <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                  {fold.stitchPoints.map((point) => (
                    <div
                      key={point.id}
                      className="grid gap-2 sm:grid-cols-[150px_1fr_auto_auto]"
                    >
                      <Input
                        value={point.factor}
                        onChange={(event) =>
                          patch(fold.id, {
                            stitchPoints: fold.stitchPoints.map((entry) =>
                              entry.id === point.id
                                ? { ...entry, factor: event.target.value }
                                : entry,
                            ),
                          })
                        }
                        placeholder="Fator narrativo"
                      />
                      <Input
                        value={point.description}
                        onChange={(event) =>
                          patch(fold.id, {
                            stitchPoints: fold.stitchPoints.map((entry) =>
                              entry.id === point.id
                                ? { ...entry, description: event.target.value }
                                : entry,
                            ),
                          })
                        }
                        placeholder="Ponto de costura"
                      />
                      <Button
                        size="sm"
                        variant={point.resolved ? "default" : "outline"}
                        onClick={() =>
                          patch(fold.id, {
                            stitchPoints: fold.stitchPoints.map((entry) =>
                              entry.id === point.id
                                ? { ...entry, resolved: !entry.resolved }
                                : entry,
                            ),
                          })
                        }
                      >
                        {point.resolved ? "Resolvido" : "Pendente"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Excluir ponto ${point.description || point.factor || "sem nome"}`}
                        onClick={() =>
                          patch(fold.id, {
                            stitchPoints: fold.stitchPoints.filter(
                              (entry) => entry.id !== point.id,
                            ),
                          })
                        }
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      patch(fold.id, {
                        stitchPoints: [
                          ...fold.stitchPoints,
                          {
                            id: genId(),
                            factor: "Fator narrativo",
                            description: "",
                            resolved: false,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Ponto de costura
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EncounterHub({
  sheets,
  npcs,
  threats,
}: {
  sheets: MasterSheetOverview[];
  npcs: MasterNpc[];
  threats: MasterThreat[];
}) {
  const [selectedSheetIds, setSelectedSheetIds] = useState<string[]>(() =>
    sheets.map((sheet) => sheet.id),
  );
  const [selectedNpcIds, setSelectedNpcIds] = useState<string[]>([]);
  const [npcRankReferences, setNpcRankReferences] = useState<Record<string, number>>({});
  const [additionalParticipants, setAdditionalParticipants] = useState(0);
  const [additionalRank, setAdditionalRank] = useState(0);
  const [threatQuantities, setThreatQuantities] = useState<Record<string, number>>({});

  const selectedSheets = sheets.filter((sheet) => selectedSheetIds.includes(sheet.id));
  const selectedNpcs = npcs.filter((npc) => selectedNpcIds.includes(npc.id));
  const participantRanks = [
    ...selectedSheets.map((sheet) => Math.max(0, sheet.exposure)),
    ...selectedNpcs.map((npc) => Math.max(0, npcRankReferences[npc.id] ?? 0)),
    ...Array.from({ length: Math.max(0, additionalParticipants) }, () =>
      Math.max(0, additionalRank),
    ),
  ];
  const participants = participantRanks.length;
  const partyValid = participants >= 2 && participants <= 7;
  const rankTotal = participantRanks.reduce((sum, rank) => sum + rank, 0);
  const rankAverage = participants ? rankTotal / participants : 0;
  const selectedThreats = threats.flatMap((threat) =>
    Array.from(
      { length: Math.max(0, Math.min(20, threatQuantities[threat.id] ?? 0)) },
      () => threat,
    ),
  );
  const combinedMagnitude = combinedThreatMagnitude(
    selectedThreats.map((threat) => threat.magnitude),
  );
  const balance = calculateEncounterBalance(
    rankAverage,
    participants,
    Math.max(1, combinedMagnitude.total),
  );

  const toggleSheet = (sheetId: string) => {
    setSelectedSheetIds((current) =>
      current.includes(sheetId)
        ? current.filter((id) => id !== sheetId)
        : [...current, sheetId],
    );
  };

  const toggleNpc = (npcId: string) => {
    setSelectedNpcIds((current) =>
      current.includes(npcId)
        ? current.filter((id) => id !== npcId)
        : [...current, npcId],
    );
  };

  const updateThreatQuantity = (threatId: string, quantity: number) => {
    setThreatQuantities((current) => ({
      ...current,
      [threatId]: Math.max(0, Math.min(20, Math.round(quantity || 0))),
    }));
  };

  return (
    <div className="tadeon-encounter-workspace space-y-4">
      <PanelHeading
        title="Balanço de Encontro"
        description="Monte o grupo com fichas, NPCs aliados e participantes sem ficha. Depois componha as ameaças por quantidade — a seleção automática agora é apenas uma ajuda, nunca uma limitação."
      />
      <Card className="tadeon-encounter-summary">
        <div className="tadeon-encounter-summary__reading" data-reading={partyValid ? balance.reading : "invalid"}>
          <span>Leitura atual</span>
          <strong>
            {!partyValid
              ? "Complete o grupo"
              : selectedThreats.length
                ? balance.reading
                : "Aguardando ameaças"}
          </strong>
          <small>
            {partyValid
              ? `Referência de Magnitude ${balance.reference}`
              : "Use entre 2 e 7 participantes"}
          </small>
        </div>
        <div className="tadeon-encounter-summary__metrics">
          {[
            ["Participantes", participants],
            ["Rank médio", rankAverage.toFixed(1)],
            ["Ameaças", selectedThreats.length],
            ["Magnitude", combinedMagnitude.total],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </Card>

      <div className="tadeon-encounter-composer">
        <Card className="tadeon-encounter-party">
          <div className="tadeon-encounter-card-heading">
            <div>
              <p className="tadeon-eyebrow">01 · Composição</p>
              <h3>Grupo participante</h3>
            </div>
            <span>{participants}/7</span>
          </div>

          <section className="tadeon-encounter-source">
            <div className="tadeon-encounter-source__heading">
              <div>
                <strong>Fichas da campanha</strong>
                <small>Rank lido automaticamente</small>
              </div>
              {sheets.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSheetIds(
                      selectedSheetIds.length === sheets.length ? [] : sheets.map((sheet) => sheet.id),
                    )
                  }
                >
                  {selectedSheetIds.length === sheets.length ? "Limpar" : "Todas"}
                </button>
              )}
            </div>
            <div className="tadeon-encounter-roster">
              {sheets.map((sheet) => {
                const active = selectedSheetIds.includes(sheet.id);
                return (
                  <button
                    key={sheet.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleSheet(sheet.id)}
                    className="tadeon-encounter-member"
                  >
                    <span className="tadeon-encounter-member__check">
                      {active ? <Check /> : null}
                    </span>
                    <span className="min-w-0">
                      <strong>{sheet.name || "Ficha sem nome"}</strong>
                      <small>Rank {sheet.exposure}</small>
                    </span>
                  </button>
                );
              })}
              {sheets.length === 0 && <p>Nenhuma ficha acessível.</p>}
            </div>
          </section>

          <section className="tadeon-encounter-source">
            <div className="tadeon-encounter-source__heading">
              <div>
                <strong>NPCs aliados</strong>
                <small>Informe o Rank de referência desta cena</small>
              </div>
            </div>
            <div className="tadeon-encounter-roster">
              {npcs.map((npc) => {
                const active = selectedNpcIds.includes(npc.id);
                return (
                  <div key={npc.id} className="tadeon-encounter-npc" data-active={active}>
                    <button type="button" aria-pressed={active} onClick={() => toggleNpc(npc.id)}>
                      <span className="tadeon-encounter-member__check">
                        {active ? <Check /> : null}
                      </span>
                      <span className="min-w-0">
                        <strong>{npc.name}</strong>
                        <small>{npc.classification}</small>
                      </span>
                    </button>
                    {active && (
                      <label>
                        <span>Rank ref.</span>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={5}
                          value={npcRankReferences[npc.id] ?? 0}
                          onChange={(event) =>
                            setNpcRankReferences((current) => ({
                              ...current,
                              [npc.id]: Math.max(0, Number(event.target.value) || 0),
                            }))
                          }
                        />
                      </label>
                    )}
                  </div>
                );
              })}
              {npcs.length === 0 && <p>Nenhum NPC cadastrado.</p>}
            </div>
          </section>

          <section className="tadeon-encounter-source tadeon-encounter-manual">
            <div className="tadeon-encounter-source__heading">
              <div>
                <strong>Participantes sem cadastro</strong>
                <small>Convidados, aliados temporários ou fichas externas</small>
              </div>
            </div>
            <div className="tadeon-encounter-manual__fields">
              <label>
                <span>Quantidade</span>
                <Input
                  type="number"
                  min={0}
                  max={7}
                  value={additionalParticipants}
                  onChange={(event) =>
                    setAdditionalParticipants(
                      Math.max(0, Math.min(7, Number(event.target.value) || 0)),
                    )
                  }
                />
              </label>
              <label>
                <span>Rank médio</span>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={additionalRank}
                  disabled={additionalParticipants === 0}
                  onChange={(event) =>
                    setAdditionalRank(Math.max(0, Number(event.target.value) || 0))
                  }
                />
              </label>
            </div>
          </section>

          {!partyValid && (
            <p className="tadeon-encounter-warning" role="status">
              O grupo precisa ter entre 2 e 7 participantes, somando fichas, NPCs e entradas
              manuais.
            </p>
          )}
        </Card>

        <Card className="tadeon-encounter-threats">
          <div className="tadeon-encounter-card-heading">
            <div>
              <p className="tadeon-eyebrow">02 · Oposição</p>
              <h3>Ameaças do encontro</h3>
            </div>
            <span>{selectedThreats.length}</span>
          </div>
          <div className="tadeon-encounter-threat-list">
            {threats.map((threat) => {
              const quantity = threatQuantities[threat.id] ?? 0;
              return (
                <div key={threat.id} className="tadeon-encounter-threat" data-active={quantity > 0}>
                  <div className="min-w-0">
                    <strong>{threat.name}</strong>
                    <span>
                      Magnitude {threat.magnitude} · {threat.archetype}
                    </span>
                  </div>
                  <div className="tadeon-encounter-threat__quantity">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Remover ${threat.name}`}
                      disabled={quantity === 0}
                      onClick={() => updateThreatQuantity(threat.id, quantity - 1)}
                    >
                      <Minus />
                    </Button>
                    <output aria-label={`${quantity} ${threat.name}`}>{quantity}</output>
                    <Button
                      type="button"
                      size="icon"
                      variant={quantity > 0 ? "outline" : "default"}
                      aria-label={`Adicionar ${threat.name}`}
                      onClick={() => updateThreatQuantity(threat.id, quantity + 1)}
                    >
                      <Plus />
                    </Button>
                  </div>
                </div>
              );
            })}
            {threats.length === 0 && (
              <p className="tadeon-encounter-empty">Cadastre ameaças antes de montar o encontro.</p>
            )}
          </div>
          <div className="tadeon-encounter-total">
            <span>
              <small>Magnitude combinada</small>
              <strong>{combinedMagnitude.total}</strong>
            </span>
            <span>
              <small>Potencial do grupo</small>
              <strong>{partyValid ? balance.potential.toFixed(1) : "—"}</strong>
            </span>
          </div>
          {combinedMagnitude.adjustment > 0 && (
            <p className="tadeon-encounter-adjustment">
              Soma {combinedMagnitude.base} + {combinedMagnitude.adjustment} pela economia de ações.
            </p>
          )}
          <details className="tadeon-encounter-formula">
            <summary>Como esta leitura foi calculada</summary>
            <p>
              Rank médio = {rankTotal} ÷ {participants || "N"} = {rankAverage.toFixed(1)}.
              {partyValid
                ? ` Potencial = média × fator de ${participants} participantes (${balance.potential.toFixed(1)}). A referência considera também o tamanho do grupo.`
                : " Complete a composição para calcular o potencial."}
            </p>
          </details>
        </Card>
      </div>
      <Card className="tadeon-encounter-context flex items-start gap-3 p-4 text-xs text-muted-foreground">
        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>
          Fatores de terreno, informação, surpresa, recursos e objetivo da cena
          podem mudar muito a dificuldade. Use a leitura como referência e
          ajuste narrativamente.
        </p>
      </Card>
    </div>
  );
}
