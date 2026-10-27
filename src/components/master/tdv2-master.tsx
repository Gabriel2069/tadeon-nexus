import { tabletopPersistenceService } from "@/lib/tabletop/tabletop-persistence-service";
import { TdvOperations, TdvPhysicalResolution, TdvOppositionRead } from "./tdv2-procedures";
import { cacheTdv2MasterState } from "@/lib/offline-cache";
import { WorkspaceActions } from "@/components/workspace-actions";
import { AssetLibraryPanel } from "@/components/assets/asset-library-panel";
import { loadFeatureFlags } from "@/lib/feature-flag-repository";
import { useEffect, useState, useRef } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageState } from "@/components/page-state";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { SaveStatus } from "@/components/save-status";
import { Section } from "@/components/sheet/sheet-ui";
import {
  TdvDisclosure,
  TdvCheck,
  TdvField,
  TdvNumber,
  TdvSelect,
} from "@/components/sheet/tdv2-sheet";
import { useMasterDraft } from "./use-master-draft";
import {
  DICE,
  DIFFICULTIES,
  POSITIONS,
  RECORD_FIELDS,
  constitution,
  readTest,
  resolveTest,
  tdv2CharacterSchema,
  uid,
  type TdvCharacter,
} from "@/lib/tdv2";
import {
  OPPOSITION_FIELDS,
  newOpposition,
  newTdvMaster,
  nextRound,
  orderInitiative,
  pressureChange,
  spendImpulse,
  spendResponse,
  tdvMasterSchema,
  type TdvMasterState,
} from "@/lib/tdv2-master";
import { toast } from "sonner";
import "@/styles/workspace.css";
import "@/styles/sheet-premium.css";

type RosterRow = { id: string; name: string; tdv2_data: TdvCharacter; updated_at: string };
export function Tdv2MasterPanel({
  embedded = false,
  initialTab = "scene",
}: {
  embedded?: boolean;
  initialTab?: string;
}) {
  const { user, role } = useAuth();
  return (
    <TdvMasterWorkspace key={`${user?.id}:${role}`} embedded={embedded} initialTab={initialTab} />
  );
}
function TdvMasterWorkspace({ embedded, initialTab }: { embedded: boolean; initialTab: string }) {
  const { user, role } = useAuth();
  const [error, setError] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0),
    [roster, setRoster] = useState<RosterRow[]>([]),
    [legacy, setLegacy] = useState<{ id: string; name: string }[]>([]),
    [pressureCause, setPressureCause] = useState(""),
    [busy, setBusy] = useState<string | null>(null),
    [tab, setTab] = useState(initialTab);
  const revision = useRef(0);
  const [conflict, setConflict] = useState(false);
  const [scenes, setScenes] = useState<{ id: string; name: string }[]>([]);
  const draft = useMasterDraft<{ id: string; state: TdvMasterState }>(async (snapshot, signal) => {
    if (conflict) throw new Error("A condução mudou em outra janela.");
    const parsed = tdvMasterSchema.parse(snapshot.state);
    const { data, error } = await supabase
      .from("game_settings")
      .update({ tdv2_state: parsed as never })
      .eq("id", snapshot.id)
      .eq("tdv2_revision", revision.current)
      .select("id,tdv2_revision")
      .abortSignal(signal)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      setConflict(true);
      throw new Error("A condução mudou em outra janela.");
    }
    revision.current = data.tdv2_revision;
  });
  useEffect(() => {
    if (!draft.value || !user || role !== "mestre") return;
    const timer = window.setTimeout(
      () => cacheTdv2MasterState(draft.value!.state, { userId: user.id, role }),
      600,
    );
    return () => window.clearTimeout(timer);
  }, [draft.value, user, role]);
  const latest = useRef<TdvMasterState | null>(null);
  const initiativeAbort = useRef<AbortController | null>(null);
  useEffect(() => () => initiativeAbort.current?.abort(), []);
  latest.current = draft.value?.state ?? null;
  const [assetsEnabled, setAssetsEnabled] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void loadFeatureFlags().then((flags) => {
      if (alive) setAssetsEnabled(flags.nexus_assets_v2_enabled);
    });
    return () => {
      alive = false;
    };
  }, []);
  const load = draft.load;
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    void (async () => {
      try {
        const [settings, sheets] = await Promise.all([
          supabase
            .from("game_settings")
            .select("id,campaign_id,tdv2_state,tdv2_revision")
            .eq("key", "global")
            .abortSignal(abort.signal)
            .maybeSingle(),
          supabase
            .from("character_sheets")
            .select("id,name,rules_version,tdv2_data,updated_at")
            .abortSignal(abort.signal),
        ]);
        if (abort.signal.aborted) return;
        if (settings.error || sheets.error || !settings.data)
          throw new Error("Não foi possível carregar a condução da mesa.");
        const raw = settings.data.tdv2_state;
        const empty = !raw || (typeof raw === "object" && Object.keys(raw).length === 0);
        const state = empty ? newTdvMaster() : tdvMasterSchema.parse(raw);
        revision.current = settings.data.tdv2_revision ?? 0;
        setConflict(false);
        setCampaignId(settings.data.campaign_id);
        if (settings.data.campaign_id) {
          const result = await tabletopPersistenceService.listScenes(settings.data.campaign_id);
          if (abort.signal.aborted) return;
          setScenes(result);
        } else setScenes([]);
        load({ id: settings.data.id, state });
        setLegacy(
          (sheets.data ?? [])
            .filter((row) => row.rules_version !== 2)
            .map((row) => ({ id: row.id, name: row.name })),
        );
        setRoster(
          (sheets.data ?? []).flatMap((row) => {
            const c = tdv2CharacterSchema.safeParse(row.tdv2_data);
            return row.rules_version === 2 && c.success
              ? [{ id: row.id, name: row.name, tdv2_data: c.data, updated_at: row.updated_at }]
              : [];
          }),
        );
        setError(null);
      } catch {
        if (!abort.signal.aborted)
          setError(
            "A condução não pôde ser carregada ou precisa de revisão de formato. Nenhum registro foi substituído.",
          );
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    })();
    return () => abort.abort();
  }, [attempt, load]);
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      (draft.dirty || draft.saving) &&
      (embedded
        ? current.pathname !== next.pathname ||
          JSON.stringify(current.search) !== JSON.stringify(next.search)
        : current.pathname !== next.pathname),
    enableBeforeUnload: draft.dirty || draft.saving,
    withResolver: true,
  });
  if (loading)
    return (
      <div role="status" className="p-8">
        <Loader2 className="animate-spin" />
        Reunindo a condução TdV II…
      </div>
    );
  if (error || !draft.value)
    return (
      <PageState
        icon={AlertTriangle}
        title="A condução TdV II não abriu"
        description={error ?? "Registro indisponível."}
        action={<Button onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</Button>}
      />
    );
  const s = draft.value.state,
    update = (state: TdvMasterState) => draft.update("state", state),
    field = (
      key:
        | "title"
        | "objective"
        | "oppositionGoal"
        | "endCondition"
        | "position"
        | "urgency"
        | "rest"
        | "notes",
      value: string,
    ) => update({ ...s, [key]: value });
  const run = (fn: () => TdvMasterState) => {
    try {
      update(fn());
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const addParticipant = (row: RosterRow) => {
    if (s.participants.some((p) => p.sheetId === row.id)) return;
    const c = constitution(row.tdv2_data);
    update({
      ...s,
      participants: [
        ...s.participants,
        {
          id: uid(),
          sheetId: row.id,
          name: row.name,
          cadence: c.matrices["Cadência"],
          score: null,
          impulses: 2,
          response: true,
          position: "Disputada",
        },
      ],
    });
  };
  const rollInitiative = async (id: string) => {
    const participant = s.participants.find((p) => p.id === id),
      row = roster.find((r) => r.id === participant?.sheetId);
    if (!row || busy) return;
    setBusy(id);
    const controller = new AbortController();
    initiativeAbort.current = controller;
    try {
      const rolled = resolveTest(row.tdv2_data, {
        matrix: "Cadência",
        alinhavo: "Iniciativa",
        dt: 2,
        prumoPro: 0,
        prumoDes: 0,
        tentoPro: 0,
        tentoDes: 0,
        force: "",
        extraordinary: false,
        counterpart: "",
        context: {
          intention: "Disputar Iniciativa",
          approach: "Cadência e Iniciativa",
          change: `Rodada ${s.round}`,
          point: s.objective,
          risk: true,
        },
      });
      const { data, error } = await supabase
        .from("character_sheets")
        .update({ tdv2_data: rolled.character as never })
        .eq("id", row.id)
        .eq("updated_at", row.updated_at)
        .select("updated_at")
        .abortSignal(controller.signal)
        .maybeSingle();
      if (controller.signal.aborted) return;
      if (error || !data)
        throw new Error("A ficha mudou durante a ação; atualize antes de rolar novamente.");
      setRoster((previous) =>
        previous.map((r) =>
          r.id === row.id ? { ...r, tdv2_data: rolled.character, updated_at: data.updated_at } : r,
        ),
      );
      const current = latest.current;
      if (current)
        update({
          ...current,
          participants: current.participants.map((p) =>
            p.id === id
              ? { ...p, score: rolled.result.criticalFailure ? 0 : rolled.result.enlace }
              : p,
          ),
        });
      toast.info(
        `Prumo ${rolled.result.prumo} + Tento ${rolled.result.tento} = ${rolled.result.enlace}${rolled.result.criticalFailure ? " · Falha Crítica, Cadência Abalada" : ""}`,
      );
    } catch (e) {
      if (!controller.signal.aborted) toast.error((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  };
  const applyToSheet = async (row: RosterRow, character: TdvCharacter) => {
    if (busy) return false;
    setBusy(row.id);
    const controller = new AbortController();
    initiativeAbort.current = controller;
    try {
      const { data, error } = await supabase
        .from("character_sheets")
        .update({ tdv2_data: tdv2CharacterSchema.parse(character) as never })
        .eq("id", row.id)
        .eq("updated_at", row.updated_at)
        .select("updated_at")
        .abortSignal(controller.signal)
        .maybeSingle();
      if (controller.signal.aborted) return false;
      if (error || !data)
        throw new Error(
          "A ficha mudou durante a ação. Recarregue a condução antes de aplicar a consequência; seus dados originais continuam na ferramenta.",
        );
      setRoster((previous) =>
        previous.map((r) =>
          r.id === row.id ? { ...r, tdv2_data: character, updated_at: data.updated_at } : r,
        ),
      );
      toast.success(
        "Consequência incorporada à ficha. Não aplique novamente o mesmo acontecimento.",
      );
      return true;
    } catch (e) {
      if (!controller.signal.aborted) toast.error((e as Error).message);
      return false;
    } finally {
      if (!controller.signal.aborted) setBusy(null);
    }
  };
  return (
    <div
      data-page-layout={embedded ? undefined : true}
      className={
        embedded ? "tadeon-tdv2-master" : "tadeon-page tadeon-master-panel tadeon-tdv2-master"
      }
    >
      {embedded ? (
        <div className="tdv-actions">
          {!embedded && <WorkspaceActions workspace="/master-panel" />}
          <SaveStatus
            state={
              draft.error ? "error" : draft.saving ? "saving" : draft.dirty ? "pending" : "saved"
            }
            savedAt={draft.savedAt}
            onRetry={() => void draft.save()}
          />
          <Button
            disabled={!draft.dirty || draft.saving || conflict}
            onClick={() => void draft.save()}
          >
            Salvar condução
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tabletop">Abrir Mesa</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/master-panel" search={{ edition: undefined, tab: undefined }}>
              Ferramentas da campanha
            </Link>
          </Button>
        </div>
      ) : (
        <PageHeader
          section="master"
          eyebrow="TdV II · Condução da Tessitura"
          title="Painel do Mestre"
          description="Objetivo, Posição, Pressão e aquilo que permanece."
          actions={
            <div className="tdv-actions">
              {!embedded && <WorkspaceActions workspace="/master-panel" />}
              <SaveStatus
                state={
                  draft.error
                    ? "error"
                    : draft.saving
                      ? "saving"
                      : draft.dirty
                        ? "pending"
                        : "saved"
                }
                savedAt={draft.savedAt}
                onRetry={() => void draft.save()}
              />
              <Button
                disabled={!draft.dirty || draft.saving || conflict}
                onClick={() => void draft.save()}
              >
                Salvar condução
              </Button>
              <Button variant="outline" asChild>
                <Link to="/tabletop">Abrir Mesa</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/master-panel" search={{ edition: undefined, tab: undefined }}>
                  Ferramentas da campanha
                </Link>
              </Button>
            </div>
          }
        />
      )}
      {conflict && (
        <div className="tdv-legacy-notice" role="alert">
          <h2>A condução mudou em outra janela</h2>
          <p>
            Seu rascunho continua aqui. Guarde uma cópia antes de carregar a versão atual; salvar
            por cima está bloqueado.
          </p>
          <div className="tdv-actions">
            <Button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(s, null, 2)], { type: "application/json" }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "conducao-tdv2-rascunho.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Guardar rascunho
            </Button>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              Carregar versão atual
            </Button>
          </div>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="tdv-tabs">
          <TabsTrigger value="scene">Cena e rodada</TabsTrigger>
          <TabsTrigger value="procedures">Resolução e operações</TabsTrigger>
          <TabsTrigger value="world">Pessoas e ameaças</TabsTrigger>
          <TabsTrigger value="investigation">Investigação e Selagem</TabsTrigger>
          <TabsTrigger value="reference">Referência</TabsTrigger>
          {assetsEnabled && <TabsTrigger value="assets">Arquivos e miniaturas</TabsTrigger>}
        </TabsList>
        <TabsContent value="scene" data-sheet-content>
          <Section id="tdv-master-scene" title="O que está em disputa">
            <TdvField
              label="Título da cena"
              value={s.title}
              onChange={(v) => field("title", v)}
              short
            />
            <div className="tdv-grid">
              {(
                [
                  ["objective", "Objetivo dos personagens"],
                  ["oppositionGoal", "Objetivo da oposição"],
                  ["endCondition", "Condições de encerramento e rotas alternativas"],
                  ["position", "Posição inicial e relações decisivas"],
                  ["urgency", "Urgência e janela de oportunidade"],
                  ["rest", "Resto e Permanência"],
                ] as const
              ).map(([key, label]) => (
                <TdvField key={key} label={label} value={s[key]} onChange={(v) => field(key, v)} />
              ))}
            </div>
          </Section>
          <Section id="tdv-master-public-round" title="Rodada pública na Mesa">
            <div className="tdv-field">
              <label htmlFor="tdv-public-scene">Cena que recebe os contadores</label>
              <select
                id="tdv-public-scene"
                value={s.tabletopSceneId ?? ""}
                onChange={(e) => update({ ...s, tabletopSceneId: e.target.value })}
              >
                <option value="">Manter rodada apenas na condução privada</option>
                {scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="tdv-note">
              Ao salvar, somente rodada, Impulsos, Resposta e Posição serão publicados nos tokens
              vinculados às fichas participantes. Objetivos, pistas e notas continuam privados. Com
              a sala ativa, a Mesa recebe a atualização; fora dela, carregue a cena para obter o
              estado salvo.
            </p>
          </Section>
          <Section id="tdv-master-pressure" title="Frentes de Pressão">
            <TdvField
              label="Acontecimento ou intervenção que altera a Pressão"
              value={pressureCause}
              onChange={setPressureCause}
            />
            <div className="tdv-folios">
              {s.pressures.map((front) => (
                <div className="tdv-folio" key={front.id}>
                  <TdvField
                    label="Nome da frente"
                    value={front.name}
                    short
                    onChange={(v) =>
                      update({
                        ...s,
                        pressures: s.pressures.map((p) =>
                          p.id === front.id ? { ...p, name: v } : p,
                        ),
                      })
                    }
                  />
                  <TdvField
                    label="Ruptura anunciada ao atingir 4"
                    value={front.rupture}
                    onChange={(v) =>
                      update({
                        ...s,
                        pressures: s.pressures.map((p) =>
                          p.id === front.id ? { ...p, rupture: v } : p,
                        ),
                      })
                    }
                  />
                  <div className="tdv-actions">
                    <Button
                      variant="outline"
                      disabled={front.value === 0}
                      onClick={() => run(() => pressureChange(s, front.id, -1, pressureCause))}
                    >
                      Reduzir Pressão
                    </Button>
                    <output aria-label={`Pressão de ${front.name || "frente"}`}>
                      {front.value} / 4
                    </output>
                    <Button
                      variant="outline"
                      disabled={front.value === 4}
                      onClick={() => run(() => pressureChange(s, front.id, 1, pressureCause))}
                    >
                      Aumentar Pressão
                    </Button>
                  </div>
                  {front.value === 4 && (
                    <p role="alert">
                      Ruptura: {front.rupture || "registre a consequência estrutural anunciada"}
                    </p>
                  )}
                  <details>
                    <summary>Histórico da frente</summary>
                    {front.history.map((entry, i) => (
                      <p key={i}>{entry}</p>
                    ))}
                  </details>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      update({ ...s, pressures: s.pressures.filter((p) => p.id !== front.id) })
                    }
                  >
                    Encerrar frente
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() =>
                update({
                  ...s,
                  pressures: [
                    ...s.pressures,
                    { id: uid(), name: "", value: 0, cause: "", rupture: "", history: [] },
                  ],
                })
              }
            >
              Nova frente de Pressão
            </Button>
            <p className="tdv-note">
              Pressão 0–4 acompanha deterioração de uma frente. Não equivale à Tensão pessoal nem à
              Urgência.
            </p>
          </Section>
          <Section id="tdv-master-round" title={`Rodada ${s.round}`}>
            <div className="tdv-actions">
              <Button variant="outline" onClick={() => run(() => nextRound(s))}>
                Iniciar próxima rodada
              </Button>
              <Button variant="outline" onClick={() => run(() => orderInitiative(s))}>
                Ordenar prioridade contestada
              </Button>
            </div>
            <p className="tdv-note">
              Ordem primariamente ficcional. Quando disputada: Cadência + Iniciativa; maior Enlace,
              depois Cadência. Persistindo empate, a ordem anterior permanece para decisão da
              ficção. Impulsos não acumulam.
            </p>
            <div className="tdv-master-participants">
              {s.participants.map((p) => (
                <div key={p.id} className="tdv-folio">
                  <div className="tdv-actions">
                    <strong>{p.name}</strong>
                    <Button variant="ghost" asChild>
                      <Link to="/sheet/$id" params={{ id: p.sheetId }}>
                        Abrir ficha
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        update({ ...s, participants: s.participants.filter((x) => x.id !== p.id) })
                      }
                    >
                      Retirar da rodada
                    </Button>
                  </div>
                  <div className="tdv-grid">
                    <TdvSelect
                      label={`Posição de ${p.name}`}
                      value={p.position}
                      options={POSITIONS}
                      onChange={(v) =>
                        update({
                          ...s,
                          participants: s.participants.map((x) =>
                            x.id === p.id ? { ...x, position: v as typeof p.position } : x,
                          ),
                        })
                      }
                    />
                    <div className="tdv-actions">
                      <output>
                        {p.impulses} Impulsos · {p.response ? "1 Resposta" : "Resposta utilizada"}
                      </output>
                      <Button
                        variant="outline"
                        disabled={p.impulses < 1}
                        onClick={() => run(() => spendImpulse(s, p.id, 1))}
                      >
                        Usar 1 Impulso
                      </Button>
                      <Button
                        variant="outline"
                        disabled={p.impulses < 2}
                        onClick={() => run(() => spendImpulse(s, p.id, 2))}
                      >
                        Usar 2 Impulsos
                      </Button>
                      <Button
                        variant="outline"
                        disabled={!p.response}
                        onClick={() => run(() => spendResponse(s, p.id))}
                      >
                        Usar Resposta
                      </Button>
                    </div>
                  </div>
                  <div className="tdv-actions">
                    <span>
                      Prioridade: {p.score ?? "definida pela ficção"} · Cadência {p.cadence}
                    </span>
                    <Button
                      variant="outline"
                      disabled={Boolean(busy)}
                      onClick={() => void rollInitiative(p.id)}
                    >
                      Rolar Iniciativa
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <details className="tdv-disclosure">
              <summary>Adicionar personagens TdV II</summary>
              {roster
                .filter((r) => r.tdv2_data.ready)
                .map((row) => (
                  <div className="tdv-actions" key={row.id}>
                    <span>{row.name}</span>
                    <Button
                      variant="outline"
                      disabled={s.participants.some((p) => p.sheetId === row.id)}
                      onClick={() => addParticipant(row)}
                    >
                      Incluir na rodada
                    </Button>
                    <Button variant="ghost" asChild>
                      <Link to="/sheet/$id" params={{ id: row.id }}>
                        Revisar Feição e conceder Marco
                      </Link>
                    </Button>
                  </div>
                ))}
            </details>
            {legacy.length > 0 && (
              <details className="tdv-disclosure">
                <summary>Fichas que aguardam revisão para TdV II · {legacy.length}</summary>
                {legacy.map((row) => (
                  <div className="tdv-actions" key={row.id}>
                    <span>{row.name}</span>
                    <Button variant="outline" asChild>
                      <Link to="/sheet/$id" params={{ id: row.id }}>
                        Revisar conversão
                      </Link>
                    </Button>
                  </div>
                ))}
              </details>
            )}
          </Section>
        </TabsContent>
        <TabsContent value="procedures" data-sheet-content>
          <TdvOperations state={s} onChange={update} />
          <TdvPhysicalResolution roster={roster} onApply={applyToSheet} busy={!!busy} />
          <TdvOppositionRead />
        </TabsContent>
        <TabsContent value="world" data-sheet-content>
          <Section id="tdv-master-opposition" title="Estado suficiente da oposição">
            <p className="tdv-note">
              Figurante, Adversário e Ameaça representam quantidades de estado. Magnitude 0–4 indica
              escala; não calcula bônus, pontos ou equivalência de grupo.
            </p>
            <div className="tdv-actions">
              {(["Figurante", "Adversário", "Ameaça"] as const).map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  onClick={() =>
                    update({ ...s, opposition: [...s.opposition, newOpposition(kind)] })
                  }
                >
                  Novo {kind}
                </Button>
              ))}
            </div>
            {s.opposition.map((record, index) => (
              <TdvDisclosure key={record.id} initiallyOpen={!record.name}>
                <summary>
                  {record.kind} · {record.name || `Presença ${index + 1}`}
                </summary>
                <TdvField
                  label={`Identidade da presença ${index + 1}`}
                  short
                  value={record.name}
                  onChange={(v) =>
                    update({
                      ...s,
                      opposition: s.opposition.map((x) =>
                        x.id === record.id ? { ...x, name: v } : x,
                      ),
                    })
                  }
                />
                {record.kind === "Ameaça" && (
                  <TdvSelect
                    label={`Magnitude de ${record.name || "ameaça"}`}
                    value={String(record.magnitude)}
                    options={["0", "1", "2", "3", "4"]}
                    onChange={(v) =>
                      update({
                        ...s,
                        opposition: s.opposition.map((x) =>
                          x.id === record.id ? { ...x, magnitude: Number(v) } : x,
                        ),
                      })
                    }
                  />
                )}
                <div className="tdv-grid">
                  {OPPOSITION_FIELDS.filter(
                    (key) =>
                      record.kind !== "Figurante" ||
                      [
                        "Intenção",
                        "Capacidade relevante",
                        "Consequência típica",
                        "Notas privadas",
                      ].includes(key),
                  ).map((key) => (
                    <TdvField
                      key={key}
                      label={`${key} · presença ${index + 1}`}
                      value={record.fields[key] || ""}
                      onChange={(v) =>
                        update({
                          ...s,
                          opposition: s.opposition.map((x) =>
                            x.id === record.id ? { ...x, fields: { ...x.fields, [key]: v } } : x,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    update({ ...s, opposition: s.opposition.filter((x) => x.id !== record.id) })
                  }
                >
                  Remover presença {index + 1}
                </Button>
              </TdvDisclosure>
            ))}
          </Section>
        </TabsContent>
        <TabsContent value="investigation" data-sheet-content>
          <Section id="tdv-master-investigation" title="Investigação">
            <div className="tdv-grid">
              {(
                [
                  ["question", "Pergunta Central"],
                  ["hypothesis", "Hipótese"],
                  ["contradiction", "Contradição"],
                  ["intervention", "Próxima intervenção"],
                ] as const
              ).map(([key, label]) => (
                <TdvField
                  key={key}
                  label={label}
                  value={s.investigation[key]}
                  onChange={(v) =>
                    update({ ...s, investigation: { ...s.investigation, [key]: v } })
                  }
                />
              ))}
            </div>
            <p className="tdv-note">
              Pistas Fundamentais chegam com acesso coerente. O teste decide contexto, tempo,
              exposição e compreensão, sem bloquear a única informação necessária.
            </p>
            {s.investigation.clues.map((clue, index) => (
              <div key={clue.id} className="tdv-folio">
                <div className="tdv-grid">
                  {(
                    [
                      ["name", "Pista"],
                      ["content", "Conteúdo"],
                      ["relations", "Relações com outras evidências"],
                    ] as const
                  ).map(([key, label]) => (
                    <TdvField
                      key={key}
                      label={`${label} ${index + 1}`}
                      value={clue[key]}
                      onChange={(v) =>
                        update({
                          ...s,
                          investigation: {
                            ...s.investigation,
                            clues: s.investigation.clues.map((x) =>
                              x.id === clue.id ? { ...x, [key]: v } : x,
                            ),
                          },
                        })
                      }
                    />
                  ))}
                </div>
                {(
                  [
                    ["fundamental", "Fundamental"],
                    ["deep", "Profunda"],
                    ["revealed", "Entregue aos personagens"],
                  ] as const
                ).map(([key, label]) => (
                  <TdvCheck
                    key={key}
                    label={`${label} · pista ${index + 1}`}
                    value={clue[key]}
                    onChange={(v) =>
                      update({
                        ...s,
                        investigation: {
                          ...s.investigation,
                          clues: s.investigation.clues.map((x) =>
                            x.id === clue.id ? { ...x, [key]: v } : x,
                          ),
                        },
                      })
                    }
                  />
                ))}
                <Button
                  variant="ghost"
                  onClick={() =>
                    update({
                      ...s,
                      investigation: {
                        ...s.investigation,
                        clues: s.investigation.clues.filter((x) => x.id !== clue.id),
                      },
                    })
                  }
                >
                  Remover pista {index + 1}
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                update({
                  ...s,
                  investigation: {
                    ...s.investigation,
                    clues: [
                      ...s.investigation.clues,
                      {
                        id: uid(),
                        name: "",
                        content: "",
                        fundamental: false,
                        deep: false,
                        revealed: false,
                        relations: "",
                      },
                    ],
                  },
                })
              }
            >
              Nova pista
            </Button>
          </Section>
          <Section id="tdv-master-sealing" title="Selagem">
            <p className="tdv-note">
              Diagnóstico → Acesso → Tecitura → Fixação → Resto e Permanência. Sem DT automática por
              estágio, +3 por Costura ou tarifa universal de Cargas.
            </p>
            {s.seals.map((seal, index) => (
              <div key={seal.id} className="tdv-folio">
                <TdvField
                  label={`Nome do Selo ${index + 1}`}
                  value={seal.name}
                  short
                  onChange={(v) =>
                    update({
                      ...s,
                      seals: s.seals.map((x) => (x.id === seal.id ? { ...x, name: v } : x)),
                    })
                  }
                />
                <div className="tdv-grid">
                  {RECORD_FIELDS.Selo.map((key) => (
                    <TdvField
                      key={key}
                      label={`${key} · Selo ${index + 1}`}
                      value={seal.fields[key] || ""}
                      onChange={(v) =>
                        update({
                          ...s,
                          seals: s.seals.map((x) =>
                            x.id === seal.id ? { ...x, fields: { ...x.fields, [key]: v } } : x,
                          ),
                        })
                      }
                    />
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => update({ ...s, seals: s.seals.filter((x) => x.id !== seal.id) })}
                >
                  Remover Selo {index + 1}
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={() =>
                update({ ...s, seals: [...s.seals, { id: uid(), name: "", fields: {} }] })
              }
            >
              Preparar Selagem
            </Button>
          </Section>
        </TabsContent>
        <TabsContent value="reference" data-sheet-content>
          <Section id="tdv-master-reference" title="Referência do Motor">
            <p>
              Prumo + Tento = Enlace. Maior Fio é Ascendente; menor é Retorno; Prumo − Tento é
              Desvio. Iguais produzem Consonância; só há crítico se a intenção for alcançada, exceto
              (1,1), que é Falha Crítica.
            </p>
            <dl className="tdv-reference-dts">
              {DIFFICULTIES.map((dt, index) => (
                <div key={dt}>
                  <dt>
                    {dt}
                    {dt === 32 ? "+" : ""}
                  </dt>
                  <dd>
                    {
                      [
                        "Rotineira sob risco",
                        "Desafio treinado",
                        "Importante",
                        "Alto",
                        "Excepcional",
                        "Raro",
                        "Limite humano",
                        "Transcendente baixo",
                        "Transcendente alto",
                        "Transcendente máximo",
                      ][index]
                    }
                  </dd>
                </div>
              ))}
            </dl>
            <p>Magnitudes: 0 Local · 1 Confronto · 2 Frente · 3 Cena · 4 Estrutural.</p>
            <p>
              Margens: 0–3 Êxito · 4–7 Elevado · 8+ Excepcional · −1/−2 Quase · −3/−5 Consequência ·
              −6 ou menos Severa.
            </p>
            <OppositionMotor />
            <TdvField
              label="Memória da condução"
              value={s.notes}
              onChange={(v) => field("notes", v)}
            />
          </Section>
        </TabsContent>
        {assetsEnabled && (
          <TabsContent value="assets">
            <AssetLibraryPanel campaignId={campaignId} />
          </TabsContent>
        )}
      </Tabs>
      <AlertDialog open={blocker.status === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Condução com alterações pendentes</AlertDialogTitle>
            <AlertDialogDescription>
              Salve a condução antes de navegar ou permaneça no painel para continuar a revisão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              Continuar no painel
            </Button>
            <Button
              disabled={draft.saving}
              onClick={() =>
                void draft.save().then((ok) => {
                  if (ok) blocker.proceed?.();
                })
              }
            >
              Salvar e continuar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
function OppositionMotor() {
  const [prumo, setPrumo] = useState(8),
    [tento, setTento] = useState(6),
    [dt, setDt] = useState(10),
    [result, setResult] = useState<ReturnType<typeof readTest> | null>(null);
  return (
    <details className="tdv-disclosure">
      <summary>Resolver intervenção da oposição</summary>
      <div className="tdv-grid">
        <TdvSelect
          label="Dado de Prumo da oposição"
          value={String(prumo)}
          options={DICE.map(String)}
          onChange={(v) => setPrumo(Number(v))}
        />
        <TdvSelect
          label="Dado de Tento da oposição"
          value={String(tento)}
          options={DICE.map(String)}
          onChange={(v) => setTento(Number(v))}
        />
        <TdvNumber
          label="DT ou Defesa enfrentada pela oposição"
          value={dt}
          onChange={setDt}
          min={2}
        />
      </div>
      <p className="tdv-note">
        Escolha os Fios que a capacidade e o método realmente sustentam. d20 precisa de fonte
        extraordinária; Magnitude não altera dados.
      </p>
      <Button
        onClick={() =>
          setResult(
            readTest(
              1 + Math.floor(Math.random() * prumo),
              1 + Math.floor(Math.random() * tento),
              dt,
            ),
          )
        }
      >
        Rolar intervenção
      </Button>
      {result && (
        <p role="status">
          Prumo {result.prumo} + Tento {result.tento} = Enlace {result.enlace} · {result.quality}
          {result.critical ? " · Consonância crítica" : ""} · Desvio {result.desvio}.{" "}
          {result.criticalFailure ? "Matriz da oposição Abalada até o fim da cena." : ""}
        </p>
      )}
    </details>
  );
}
