import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleDot,
  Eye,
  Flag,
  Gauge,
  Link2,
  ListChecks,
  Pause,
  Play,
  Radio,
  ScrollText,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  threatStats,
  type MasterClue,
  type MasterFold,
  type MasterNpc,
  type MasterScene,
  type MasterThreat,
  type NpcState,
} from "@/lib/master-data";
import { ResistanceDtCalculator } from "@/components/master/resistance-dt-calculator";

interface SessionScene extends MasterScene {
  monsterIds: string[];
}

interface SessionSheet {
  id: string;
  name: string;
  exposure: number;
  stats: { pv_current: number; ps_current: number; pe_current: number; pa_current?: number };
}

interface SessionInitiative {
  id: string;
  name: string;
  init: number;
  pv: number;
  isPlayer: boolean;
}

interface SessionWorkspaceProps {
  campaignTitle: string;
  campaignPhase: string;
  scenes: SessionScene[];
  clues: MasterClue[];
  npcs: MasterNpc[];
  threats: MasterThreat[];
  folds: MasterFold[];
  sheets: SessionSheet[];
  initiative: SessionInitiative[];
  reminders: string;
  onScenesChange: (value: SessionScene[]) => void;
  onCluesChange: (value: MasterClue[]) => void;
  onNpcsChange: (value: MasterNpc[]) => void;
  onThreatsChange: (value: MasterThreat[]) => void;
  onRemindersChange: (value: string) => void;
}

const npcStates: NpcState[] = ["Pleno", "Abalado", "Comprometido", "Incapacitado", "Morto"];

export function SessionWorkspace({
  campaignTitle,
  campaignPhase,
  scenes,
  clues,
  npcs,
  threats,
  folds,
  sheets,
  initiative,
  reminders,
  onScenesChange,
  onCluesChange,
  onNpcsChange,
  onThreatsChange,
  onRemindersChange,
}: SessionWorkspaceProps) {
  const activeScene = scenes.find((scene) => scene.status === "Em curso");
  const [selectedSceneId, setSelectedSceneId] = useState(
    activeScene?.id ?? scenes.find((scene) => scene.status !== "Concluída")?.id ?? "",
  );

  useEffect(() => {
    if (scenes.some((scene) => scene.id === selectedSceneId)) return;
    setSelectedSceneId(
      scenes.find((scene) => scene.status === "Em curso")?.id ??
        scenes.find((scene) => scene.status !== "Concluída")?.id ??
        scenes[0]?.id ??
        "",
    );
  }, [scenes, selectedSceneId]);

  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId);
  const sceneClues = useMemo(
    () =>
      clues.filter(
        (clue) => clue.sceneId === selectedSceneId || selectedScene?.clueIds.includes(clue.id),
      ),
    [clues, selectedScene, selectedSceneId],
  );
  const sceneNpcs = useMemo(
    () => npcs.filter((npc) => selectedScene?.npcIds.includes(npc.id)),
    [npcs, selectedScene],
  );
  const sceneThreats = useMemo(
    () =>
      threats.filter(
        (threat) =>
          selectedScene?.threatIds.includes(threat.id) ||
          selectedScene?.monsterIds.includes(threat.id),
      ),
    [selectedScene, threats],
  );
  const unresolvedFolds = folds.filter((fold) => !fold.sealed);
  const pendingClues = clues.filter((clue) => !clue.discovered);

  const updateScene = (patch: Partial<SessionScene>) => {
    if (!selectedScene) return;
    onScenesChange(
      scenes.map((scene) => (scene.id === selectedScene.id ? { ...scene, ...patch } : scene)),
    );
  };

  const startScene = () => {
    if (!selectedScene) return;
    onScenesChange(
      scenes.map((scene) =>
        scene.id === selectedScene.id ? { ...scene, status: "Em curso" } : scene,
      ),
    );
  };

  const concludeScene = () => {
    if (!selectedScene) return;
    updateScene({ status: "Concluída" });
  };

  return (
    <div className="space-y-4">
      <Card className="tadeon-surface relative overflow-hidden rounded-2xl p-5 md:p-7">
        <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <Radio className="h-3 w-3 text-primary" />
                Mesa operacional
              </Badge>
              {activeScene && (
                <Badge className="gap-1.5">
                  <CircleDot className="h-3 w-3" />
                  Cena em curso
                </Badge>
              )}
            </div>
            <p className="tadeon-eyebrow">{campaignTitle}</p>
            <h2 className="font-cinzel text-2xl font-semibold md:text-3xl">
              {campaignPhase || "Sessão sem fase registrada"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Controle o que está em cena sem alternar entre os arquivos completos. Todas as
              alterações continuam dependentes do botão Salvar do painel.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric value={pendingClues.length} label="Pistas" />
            <Metric value={unresolvedFolds.length} label="Dobras" />
            <Metric value={initiative.length} label="Iniciativa" />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-4">
          <Card className="tadeon-surface rounded-2xl p-5 md:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Label htmlFor="session-scene">Cena em foco</Label>
                <Select value={selectedSceneId} onValueChange={setSelectedSceneId}>
                  <SelectTrigger id="session-scene" className="mt-2">
                    <SelectValue placeholder="Selecione uma cena" />
                  </SelectTrigger>
                  <SelectContent>
                    {scenes.map((scene) => (
                      <SelectItem key={scene.id} value={scene.id}>
                        {scene.title} · {scene.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={selectedScene?.status === "Em curso" ? "secondary" : "default"}
                  onClick={startScene}
                  disabled={!selectedScene || selectedScene.status === "Concluída"}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Iniciar
                </Button>
                <Button
                  variant="outline"
                  onClick={concludeScene}
                  disabled={!selectedScene || selectedScene.status === "Concluída"}
                  className="gap-2"
                >
                  <Flag className="h-4 w-4" />
                  Concluir
                </Button>
              </div>
            </div>

            {selectedScene ? (
              <div className="mt-5 grid gap-4">
                <div>
                  <Label htmlFor="scene-narrative">Objetivo narrativo</Label>
                  <Textarea
                    id="scene-narrative"
                    className="mt-2 min-h-24"
                    value={selectedScene.narrative}
                    onChange={(event) => updateScene({ narrative: event.target.value })}
                    placeholder="O que esta cena precisa estabelecer ou transformar?"
                  />
                </div>
                <div>
                  <Label htmlFor="scene-next">Próxima transição</Label>
                  <Input
                    id="scene-next"
                    className="mt-2"
                    value={selectedScene.nextStep}
                    onChange={(event) => updateScene({ nextStep: event.target.value })}
                    placeholder="Condição ou gancho que conduz à próxima cena"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <LayerCard
                    icon={<Eye className="h-4 w-4" />}
                    title="Superficial"
                    text={selectedScene.superficialLayer}
                  />
                  <LayerCard
                    icon={<ListChecks className="h-4 w-4" />}
                    title="Atenta"
                    text={selectedScene.attentiveLayer}
                  />
                  <LayerCard
                    icon={<Sparkles className="h-4 w-4" />}
                    title="Profunda"
                    text={selectedScene.deepLayer}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                Crie uma cena na aba Cenas para iniciar o espaço de sessão.
              </div>
            )}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="tadeon-surface rounded-2xl p-5">
              <PanelTitle icon={<Link2 className="h-4 w-4" />} title="Pistas da cena" />
              {sceneClues.length ? (
                <div className="mt-4 space-y-2">
                  {sceneClues.map((clue) => (
                    <label
                      key={clue.id}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 p-3"
                    >
                      <Checkbox
                        checked={clue.discovered}
                        onCheckedChange={(checked) =>
                          onCluesChange(
                            clues.map((item) =>
                              item.id === clue.id
                                ? { ...item, discovered: checked === true }
                                : item,
                            ),
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{clue.title}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {clue.type} · {clue.depth}
                          {clue.guaranteed ? " · Garantida" : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <EmptyState text="Nenhuma pista ligada à cena em foco." />
              )}
            </Card>

            <Card className="tadeon-surface rounded-2xl p-5">
              <PanelTitle icon={<Users className="h-4 w-4" />} title="NPCs presentes" />
              {sceneNpcs.length ? (
                <div className="mt-4 space-y-2">
                  {sceneNpcs.map((npc) => (
                    <div
                      key={npc.id}
                      className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{npc.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {npc.classification} · Moral {npc.morale}
                        </p>
                      </div>
                      <Select
                        value={npc.state}
                        onValueChange={(value) =>
                          onNpcsChange(
                            npcs.map((item) =>
                              item.id === npc.id ? { ...item, state: value as NpcState } : item,
                            ),
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {npcStates.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState text="Nenhum NPC ligado à cena em foco." />
              )}
            </Card>
          </div>

          <Card className="tadeon-surface rounded-2xl p-5">
            <PanelTitle icon={<Shield className="h-4 w-4" />} title="Ameaças em cena" />
            {sceneThreats.length ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {sceneThreats.map((threat) => {
                  const maximum = threatStats(threat).pp;
                  const percentage = maximum ? Math.max(0, (threat.currentPp / maximum) * 100) : 0;
                  return (
                    <div key={threat.id} className="rounded-xl border border-border/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{threat.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Magnitude {threat.magnitude} · {threat.archetype}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {threat.currentPp}/{maximum} PP
                        </Badge>
                      </div>
                      <Progress value={percentage} className="mt-3 h-1.5" />
                      <div className="mt-3 flex items-center gap-2">
                        <Label htmlFor={`threat-pp-${threat.id}`} className="text-[10px]">
                          PP atual
                        </Label>
                        <Input
                          id={`threat-pp-${threat.id}`}
                          type="number"
                          min={0}
                          max={maximum}
                          value={threat.currentPp}
                          onChange={(event) =>
                            onThreatsChange(
                              threats.map((item) =>
                                item.id === threat.id
                                  ? {
                                      ...item,
                                      currentPp: Math.max(
                                        0,
                                        Math.min(maximum, Number(event.target.value) || 0),
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                          className="h-8 w-24"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState text="Nenhuma ameaça ligada à cena em foco." />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <ResistanceDtCalculator compact />
          <Card className="tadeon-surface rounded-2xl p-5">
            <PanelTitle icon={<ScrollText className="h-4 w-4" />} title="Lembretes da sessão" />
            <Textarea
              className="mt-4 min-h-40"
              value={reminders}
              onChange={(event) => onRemindersChange(event.target.value)}
              placeholder="Pendências, consequências, nomes e detalhes que não podem escapar…"
            />
          </Card>

          <Card className="tadeon-surface rounded-2xl p-5">
            <PanelTitle icon={<Activity className="h-4 w-4" />} title="Iniciativa atual" />
            {initiative.length ? (
              <ol className="mt-4 space-y-2">
                {[...initiative]
                  .sort((a, b) => b.init - a.init)
                  .map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5"
                    >
                      <span className="tadeon-mono text-xs text-primary">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                      <Badge variant="secondary">INI {entry.init}</Badge>
                    </li>
                  ))}
              </ol>
            ) : (
              <EmptyState text="A ordem de iniciativa está vazia." />
            )}
          </Card>

          <Card className="tadeon-surface rounded-2xl p-5">
            <PanelTitle icon={<Gauge className="h-4 w-4" />} title="Personagens" />
            {sheets.length ? (
              <div className="mt-4 space-y-2">
                {sheets.map((sheet) => (
                  <div key={sheet.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{sheet.name}</p>
                      <Badge variant="outline">Rank {sheet.exposure}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-center sm:grid-cols-4">
                      {[
                        ["PV", sheet.stats.pv_current],
                        ["PS", sheet.stats.ps_current],
                        ["PE", sheet.stats.pe_current],
                        ["PA", sheet.stats.pa_current ?? 0],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-md bg-secondary/55 px-1 py-1.5">
                          <p className="text-xs font-semibold">{value}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhuma ficha disponível." />
            )}
          </Card>

          {unresolvedFolds.length > 0 && (
            <Card className="tadeon-surface rounded-2xl p-5">
              <PanelTitle icon={<Pause className="h-4 w-4" />} title="Dobras abertas" />
              <div className="mt-4 space-y-2">
                {unresolvedFolds.map((fold) => (
                  <div key={fold.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{fold.name}</p>
                      <Badge variant="outline">{fold.stage}</Badge>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Permanência {fold.permanence}/{fold.maxPermanence} · Tensão {fold.tension}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-border/60 bg-background/35 px-3 py-2 text-center">
      <p className="font-cinzel text-xl font-semibold">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h3 className="font-cinzel text-lg font-semibold">{title}</h3>
    </div>
  );
}

function LayerCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-primary">
        {icon}
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <p className="line-clamp-5 text-xs leading-relaxed text-muted-foreground">
        {text || "Camada ainda não registrada."}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center">
      <CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}
