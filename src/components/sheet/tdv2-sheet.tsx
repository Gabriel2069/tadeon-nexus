import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Section } from "./sheet-ui";
import {
  ALINHAVOS,
  DICE,
  LINK_STATES,
  MATRICES,
  PILLARS,
  RECORD_FIELDS,
  anchor,
  resettle,
  stabilize,
  addMilestone,
  addTension,
  constitution,
  creationErrors,
  equilibriumBand,
  finishCreation,
  invest,
  prepareTest,
  recover,
  resolveTest,
  setResource,
  uid,
  type Matrix,
  type TdvCharacter,
  type TdvRecord,
  type TestRequest,
} from "@/lib/tdv2";
import { toast } from "sonner";

export function TdvDisclosure({
  initiallyOpen,
  children,
}: {
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details className="tdv-disclosure" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      {children}
    </details>
  );
}

export function TdvField({
  label,
  value,
  onChange,
  disabled = false,
  short = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  short?: boolean;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      {short ? (
        <Input
          className="tadeon-dossier-field"
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Textarea
          className="tadeon-dossier-field"
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
export function TdvSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
export function TdvNumber({
  label,
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      <Input
        className="tadeon-dossier-field"
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0))))
        }
      />
    </div>
  );
}
export function TdvCheck({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="tdv-check">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
export function TdvTestPanel({
  character,
  onChange,
  canEdit,
}: {
  character: TdvCharacter;
  onChange: (value: TdvCharacter) => void;
  canEdit: boolean;
}) {
  const [request, setRequest] = useState<TestRequest>({
    matrix: "Nexo",
    alinhavo: "Investigação",
    dt: 10,
    prumoPro: 0,
    prumoDes: 0,
    tentoPro: 0,
    tentoDes: 0,
    force: "",
    extraordinary: false,
    counterpart: "",
  });
  const [last, setLast] = useState<ReturnType<typeof resolveTest> | null>(null);
  const upd = <K extends keyof TestRequest>(key: K, value: TestRequest[K]) =>
    setRequest((p) => ({ ...p, [key]: value }));
  let prepared: ReturnType<typeof prepareTest> | null = null,
    error = "";
  try {
    prepared = prepareTest(character, request);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="tdv-test-panel">
      <p className="tdv-note">
        Declare intenção, abordagem e limiar antes de rolar. Sem risco relevante, resolva
        diretamente pela ficção.
      </p>
      <div className="tdv-grid tdv-grid--three">
        <TdvSelect
          label="Matriz de Prumo"
          value={request.matrix}
          options={MATRICES}
          onChange={(v) => upd("matrix", v as Matrix)}
          disabled={!canEdit}
        />
        <TdvSelect
          label="Alinhavo de Tento"
          value={request.alinhavo}
          options={ALINHAVOS}
          onChange={(v) => upd("alinhavo", v)}
          disabled={!canEdit}
        />
        <TdvNumber
          label="DT ou Defesa"
          value={request.dt}
          min={2}
          max={100}
          onChange={(v) => upd("dt", v)}
          disabled={!canEdit}
        />
      </div>
      <details className="tdv-disclosure">
        <summary>Proveito, Desproveito e Forçar</summary>
        <div className="tdv-grid">
          {(["Prumo", "Tento"] as const).map((thread) => (
            <div key={thread} className="tdv-grid">
              <TdvNumber
                label={`Fontes de Proveito em ${thread}`}
                value={request[thread === "Prumo" ? "prumoPro" : "tentoPro"]}
                max={20}
                onChange={(v) => upd(thread === "Prumo" ? "prumoPro" : "tentoPro", v)}
                disabled={!canEdit}
              />
              <TdvNumber
                label={`Fontes de Desproveito em ${thread}`}
                value={request[thread === "Prumo" ? "prumoDes" : "tentoDes"]}
                max={20}
                onChange={(v) => upd(thread === "Prumo" ? "prumoDes" : "tentoDes", v)}
                disabled={!canEdit}
              />
            </div>
          ))}
        </div>
        <p className="tdv-note">
          Fontes opostas se cancelam por Fio; aplique no máximo um deslocamento líquido. Matriz
          Abalada é incluída no Prumo.
        </p>
        <TdvSelect
          label="Forçar um Fio"
          options={["Não forçar", "Prumo", "Tento"]}
          value={request.force || "Não forçar"}
          onChange={(v) => upd("force", v === "Não forçar" ? "" : (v as "Prumo" | "Tento"))}
          disabled={!canEdit}
        />
        <TdvCheck
          label="Existe autorização extraordinária expressa para d20"
          value={request.extraordinary}
          onChange={(v) => upd("extraordinary", v)}
          disabled={!canEdit}
        />
        {request.force && character.resources.pe === 0 && (
          <TdvField
            label="Contrapartida acordada para Forçar a 0 PE"
            value={request.counterpart}
            onChange={(v) => upd("counterpart", v)}
            disabled={!canEdit}
          />
        )}
      </details>
      <div className="tdv-test-dice">
        <div>
          <small>Fio de Prumo</small>
          <strong>{prepared ? `d${prepared.prumo}` : "~"}</strong>
        </div>
        <span aria-hidden="true">+</span>
        <div>
          <small>Fio de Tento</small>
          <strong>{prepared ? `d${prepared.tento}` : "~"}</strong>
        </div>
        <Button
          disabled={!canEdit || !prepared}
          onClick={() => {
            try {
              const rolled = resolveTest(character, request);
              onChange(rolled.character);
              setLast(rolled);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Rolar os dois Fios{prepared?.cost ? ` · ${prepared.cost} PE` : ""}
        </Button>
      </div>
      {error && (
        <p className="tdv-note" role="status">
          {error}
        </p>
      )}
      {last && (
        <div className="tdv-result" aria-live="polite">
          <p>
            {last.result.quality}
            {last.result.critical ? " · Consonância crítica" : ""}
          </p>
          <div className="tdv-grid tdv-grid--three">
            {Object.entries({
              Prumo: last.result.prumo,
              Tento: last.result.tento,
              Enlace: last.result.enlace,
              Ascendente: last.result.ascendente,
              Retorno: last.result.retorno,
              Desvio: last.result.desvio,
            }).map(([name, value]) => (
              <div className="tdv-reading" key={name}>
                <small>{name}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p>
            Enlace {last.result.enlace} / DT {last.result.dt} · margem{" "}
            {last.result.margin >= 0 ? "+" : ""}
            {last.result.margin}
          </p>
          {last.result.criticalFailure ? (
            <p>
              Matriz {request.matrix} Abalada até o fim da cena. A dupla unidade prevalece sobre o
              limiar e sobre Consonância.
            </p>
          ) : (
            <p>
              {last.result.success
                ? "Intenção alcançada."
                : "Intenção não alcançada como pretendida."}{" "}
              {last.result.consonance && !last.result.success
                ? "Consonância sem alcance não é crítico."
                : "A consequência depende da ação e da situação; Retorno baixo não cobra preço automático."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function Tdv2Sheet({
  character: c,
  onChange,
  canEdit,
  isMaster,
}: {
  character: TdvCharacter;
  onChange: (value: TdvCharacter) => void;
  canEdit: boolean;
  isMaster: boolean;
}) {
  const [tab, setTab] = useState("pessoa"),
    [event, setEvent] = useState(""),
    [incorporation, setIncorporation] = useState(""),
    [reason, setReason] = useState(""),
    [kind, setKind] = useState("Matriz"),
    [target, setTarget] = useState<string>(MATRICES[0]),
    [cost, setCost] = useState(4),
    [transcendent, setTranscendent] = useState(false),
    [recordKind, setRecordKind] = useState<TdvRecord["kind"]>("Lavor");
  const [recovery, setRecovery] = useState("Pausa breve"),
    [care, setCare] = useState(false),
    [rebuilt, setRebuilt] = useState(false),
    [window, setWindow] = useState("");
  const [anchorMode, setAnchorMode] = useState<"Sustentar" | "Redirecionar">("Sustentar");
  const [consequence, setConsequence] = useState(""),
    [outcome, setOutcome] = useState(""),
    [careAction, setCareAction] = useState("");
  const stats = constitution(c),
    errors = creationErrors(c),
    disabled = !canEdit;
  const upd = <K extends keyof TdvCharacter>(key: K, value: TdvCharacter[K]) =>
    onChange({ ...c, [key]: value });
  const run = (action: () => TdvCharacter) => {
    try {
      onChange(action());
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const face = (key: "origin" | "occupation" | "conviction" | "limit", value: string) =>
    upd("face", { ...c.face, [key]: value });
  return (
    <div className="tadeon-tdv2-sheet">
      <div className="tdv-overview">
        {Object.entries({
          Desenvolvimento: `${stats.development}%`,
          "PU disponíveis": stats.pu,
          Equilíbrio: `${c.equilibrium > 0 ? "+" : ""}${c.equilibrium}`,
          Âncora: c.face.anchor.shaken ? "Abalada" : "Assentada",
        }).map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {!c.ready && (
        <div className="tdv-creation" role="status">
          <h2>Preparar a personagem</h2>
          <p>
            A distribuição inicial abaixo é um exemplo editável. Revise Feição, Matrizes e Alinhavos
            antes de concluir.
          </p>
          {errors.length > 0 && (
            <ul>
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
          <Button
            disabled={disabled || errors.length > 0}
            onClick={() => run(() => finishCreation(c))}
          >
            Concluir criação TdV II
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="tdv-tabs">
          <TabsTrigger value="pessoa">Pessoa</TabsTrigger>
          <TabsTrigger value="acao">Ação</TabsTrigger>
          <TabsTrigger value="expressao">Expressão e memória</TabsTrigger>
        </TabsList>
        <TabsContent value="pessoa" data-sheet-content>
          <Section id="tdv-feicao" title="Feição">
            <div className="tdv-grid">
              {(
                [
                  ["origin", "Origem"],
                  ["occupation", "Ofício"],
                  ["conviction", "Convicção"],
                  ["limit", "Limite"],
                ] as const
              ).map(([key, label]) => (
                <TdvField
                  key={key}
                  label={label}
                  value={c.face[key]}
                  onChange={(v) => face(key, v)}
                  disabled={disabled}
                />
              ))}
            </div>
            <details className="tdv-disclosure">
              <summary>
                Marca · {c.face.mark.trigger ? "transformação registrada" : "não manifestada"}
              </summary>
              <div className="tdv-grid">
                {(
                  [
                    ["trigger", "Gatilho"],
                    ["manifestation", "Manifestação"],
                    ["residue", "Resíduo"],
                  ] as const
                ).map(([key, label]) => (
                  <TdvField
                    key={key}
                    label={label}
                    value={c.face.mark[key]}
                    onChange={(v) => upd("face", { ...c.face, mark: { ...c.face.mark, [key]: v } })}
                    disabled={disabled}
                  />
                ))}
              </div>
            </details>
            <div className="tdv-anchor">
              <div className="tdv-grid">
                <TdvSelect
                  label="Pilar escolhido como Âncora"
                  value={c.face.anchor.pillar}
                  options={PILLARS}
                  onChange={(v) =>
                    upd("face", {
                      ...c.face,
                      anchor: {
                        ...c.face.anchor,
                        pillar: v as TdvCharacter["face"]["anchor"]["pillar"],
                      },
                    })
                  }
                  disabled={disabled}
                />
                <TdvField
                  label="A que parte de mim consigo retornar?"
                  value={c.face.anchor.detail}
                  onChange={(v) =>
                    upd("face", { ...c.face, anchor: { ...c.face.anchor, detail: v } })
                  }
                  disabled={disabled}
                />
              </div>
              <p className="tdv-note">
                Ancorar sustenta ou redireciona uma consequência plausível; não a apaga. Depois, a
                Âncora fica Abalada até uma ação significativa de Reassentar.
              </p>
              {!c.face.anchor.shaken && (
                <>
                  <TdvSelect
                    label="Forma de Ancorar"
                    value={anchorMode}
                    options={["Sustentar", "Redirecionar"]}
                    onChange={(v) => setAnchorMode(v as typeof anchorMode)}
                    disabled={disabled}
                  />
                  <TdvField
                    label="Consequência concreta"
                    value={consequence}
                    onChange={setConsequence}
                    disabled={disabled}
                  />
                </>
              )}
              <TdvField
                label={
                  c.face.anchor.shaken
                    ? "Ação significativa de Reassentar"
                    : "Como a consequência permanece na ficção"
                }
                value={outcome}
                onChange={setOutcome}
                disabled={disabled}
              />
              <Button
                variant="outline"
                disabled={disabled || !c.ready}
                onClick={() =>
                  run(() =>
                    c.face.anchor.shaken
                      ? resettle(c, outcome)
                      : anchor(c, anchorMode, consequence, outcome),
                  )
                }
              >
                {c.face.anchor.shaken ? "Registrar Reassentamento" : "Ancorar e abalar Âncora"}
              </Button>
            </div>
          </Section>
          <Section id="tdv-vinculos" title="Vínculos">
            <div className="tdv-folios">
              {c.face.links.map((link, index) => (
                <div key={link.id} className="tdv-folio">
                  <div className="tdv-grid">
                    {(
                      [
                        ["node", "Nó"],
                        ["nature", "Natureza"],
                        ["offer", "Oferta"],
                        ["demand", "Cobrança"],
                        ["tension", "Condição de tensão"],
                      ] as const
                    ).map(([key, label]) => (
                      <TdvField
                        key={key}
                        label={`${label} do vínculo ${index + 1}`}
                        value={link[key]}
                        onChange={(v) =>
                          upd("face", {
                            ...c.face,
                            links: c.face.links.map((l) =>
                              l.id === link.id ? { ...l, [key]: v } : l,
                            ),
                          })
                        }
                        disabled={disabled}
                        short={key === "node"}
                      />
                    ))}
                    <TdvSelect
                      label={`Estado do vínculo ${index + 1}`}
                      value={link.state}
                      options={LINK_STATES}
                      onChange={(v) =>
                        upd("face", {
                          ...c.face,
                          links: c.face.links.map((l) =>
                            l.id === link.id ? { ...l, state: v as typeof link.state } : l,
                          ),
                        })
                      }
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                      upd("face", {
                        ...c.face,
                        links: c.face.links.filter((l) => l.id !== link.id),
                      })
                    }
                  >
                    Remover vínculo {index + 1}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={disabled || c.face.links.length >= 50}
              onClick={() =>
                upd("face", {
                  ...c.face,
                  links: [
                    ...c.face.links,
                    {
                      id: uid(),
                      node: "",
                      nature: "",
                      state: "Presente",
                      offer: "",
                      demand: "",
                      tension: "",
                    },
                  ],
                })
              }
            >
              Novo vínculo
            </Button>
          </Section>
          <Section id="tdv-constituicao" title="Matrizes e Alinhavos">
            <div className="tdv-matrices">
              {MATRICES.map((matrix) => (
                <div className="tdv-matrix" key={matrix}>
                  <span>{matrix}</span>
                  <strong>d{DICE[stats.matrices[matrix]]}</strong>
                  {!c.ready ? (
                    <TdvNumber
                      label={`Valor de ${matrix}`}
                      value={c.matrices[matrix]}
                      min={2}
                      max={3}
                      onChange={(v) =>
                        onChange(
                          (() => {
                            const next = { ...c, matrices: { ...c.matrices, [matrix]: v } };
                            return { ...next, resources: constitution(next).maximums };
                          })(),
                        )
                      }
                      disabled={disabled}
                    />
                  ) : (
                    <small>
                      Categoria {stats.matrices[matrix]}
                      {c.scene.shaken.includes(matrix) ? " · Abalada" : ""}
                    </small>
                  )}
                </div>
              ))}
            </div>
            <div className="tdv-alinhavos">
              {ALINHAVOS.map((name) => (
                <div key={name}>
                  <span>{name}</span>
                  {!c.ready ? (
                    <TdvSelect
                      label={`Grau inicial de ${name}`}
                      value={String(c.alinhavos[name] ?? 0)}
                      options={["0", "1", "2"]}
                      onChange={(v) => upd("alinhavos", { ...c.alinhavos, [name]: Number(v) })}
                      disabled={disabled}
                    />
                  ) : (
                    <strong>d{DICE[stats.alinhavos[name] ?? 0]}</strong>
                  )}
                </div>
              ))}
            </div>
          </Section>
          <div className="tdv-grid">
            <Section id="tdv-recursos" title="Recursos e proteção">
              <div className="tdv-resources">
                {(["pv", "pi", "pe"] as const).map((key) => (
                  <div key={key} className="tdv-resource" data-resource={key}>
                    <small>
                      {{ pv: "Vitalidade · PV", pi: "Inteireza · PI", pe: "Esforço · PE" }[key]}
                    </small>
                    <div>
                      <strong>{c.resources[key]}</strong>
                      <span>/ {stats.maximums[key]}</span>
                    </div>
                    <TdvNumber
                      label={`${key.toUpperCase()} atual`}
                      value={c.resources[key]}
                      max={stats.maximums[key]}
                      onChange={(v) => run(() => setResource(c, key, v))}
                      disabled={disabled || !c.ready}
                    />
                  </div>
                ))}
              </div>
              <dl className="tdv-defense">
                {Object.entries(stats.defenses).map(([name, value]) => (
                  <div key={name}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="tdv-grid">
                <TdvNumber
                  label="Modificação situacional de Guarda"
                  value={c.guard.modifier}
                  min={-100}
                  max={100}
                  onChange={(v) => upd("guard", { ...c.guard, modifier: v })}
                  disabled={disabled}
                />
                <TdvField
                  label="Fonte da proteção"
                  value={c.guard.source}
                  onChange={(v) => upd("guard", { ...c.guard, source: v })}
                  disabled={disabled}
                  short
                />
              </div>
              <TdvCheck
                label="Guarda quebrada ou ausente"
                value={c.guard.broken}
                onChange={(v) => upd("guard", { ...c.guard, broken: v })}
                disabled={disabled}
              />
              <p>
                Guarda atual: <strong>{stats.guard ?? "sem proteção imediata"}</strong>
              </p>
              {c.resources.pi === 0 && (
                <p role="alert">
                  Colapso: registre Condição Crítica e transformação duradoura na Feição. Nenhum
                  diagnóstico ou perda arbitrária de autonomia é presumido.
                </p>
              )}
              {c.resources.pe === 0 && (
                <p className="tdv-note">
                  A 0 PE, ações ordinárias continuam possíveis; custos em PE precisam ser pagos.
                  Forçar a 0 PE é uma exceção por cena.
                </p>
              )}
              {(c.resources.pv === 0 || c.critical !== "Ativa") && (
                <div>
                  <p role="alert">
                    {c.critical}: 0 PV incapacita; uma nova consequência física relevante pode levar
                    a À Beira.
                  </p>
                  <TdvSelect
                    label="Estado crítico físico"
                    value={c.critical}
                    options={
                      c.resources.pv > 0
                        ? [c.critical, "À Beira", "Morta"]
                        : ["Incapacitada", "À Beira", "Morta"]
                    }
                    onChange={(v) => upd("critical", v as TdvCharacter["critical"])}
                    disabled={disabled}
                  />
                  <TdvField
                    label="Janela de estabilização e risco anunciado"
                    value={c.deathWindow}
                    onChange={(v) => upd("deathWindow", v)}
                    disabled={disabled}
                  />
                  <TdvField
                    label="Cuidado ou intervenção de estabilização"
                    value={careAction}
                    onChange={setCareAction}
                    disabled={disabled}
                  />
                  <Button
                    variant="outline"
                    disabled={disabled || c.critical === "Morta"}
                    onClick={() => run(() => stabilize(c, careAction))}
                  >
                    Registrar estabilização
                  </Button>
                  <p className="tdv-note">
                    A 0 PV, estabilizar conserva a incapacidade. Condições e marcas permanecem até
                    suas saídas próprias.
                  </p>
                </div>
              )}
            </Section>
            <Section id="tdv-equilibrio" title="Equilíbrio e Tensão">
              <div className="tdv-equilibrium">
                <span>Medo</span>
                <strong>{c.equilibrium}</strong>
                <span>Conhecimento</span>
              </div>
              <input
                className="tdv-range"
                type="range"
                aria-label="Equilíbrio TdV II"
                min={-10}
                max={10}
                value={c.equilibrium}
                disabled={disabled}
                onChange={(e) => upd("equilibrium", Number(e.target.value))}
              />
              <p>{equilibriumBand(c.equilibrium)}</p>
              <p className="tdv-note">
                Nenhum bônus universal. A faixa contextualiza Feição, Lavores e Tramas.
              </p>
              <div className="tdv-actions">
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => run(() => addTension(c, -1))}
                >
                  Tensão −1
                </Button>
                <output aria-label="Tensão TdV II">
                  {c.tension > 0 ? "+" : ""}
                  {c.tension}
                </output>
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => run(() => addTension(c, 1))}
                >
                  Tensão +1
                </Button>
              </div>
              <p className="tdv-note">
                Ao atingir ±4: desloca Equilíbrio em 1 e zera Tensão, sem carregar excedente.
              </p>
            </Section>
          </div>
          <Section id="tdv-desenvolvimento" title="Desenvolvimento e Ponto de Urdume">
            <div
              className="tdv-development"
              role="meter"
              aria-label="Desenvolvimento"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.development}
            >
              <span style={{ width: `${stats.development}%` }} />
            </div>
            <p>
              {stats.development}% · {c.milestones.length} de 20 Marcos · {stats.pu} PU disponíveis
              · {stats.spent} investidos
            </p>
            {isMaster && (
              <details className="tdv-disclosure">
                <summary>Reconhecer um Marco</summary>
                <div className="tdv-grid">
                  <TdvField label="Acontecimento do Marco" value={event} onChange={setEvent} />
                  <TdvField
                    label="Mudança incorporada"
                    value={incorporation}
                    onChange={setIncorporation}
                  />
                </div>
                <Button
                  disabled={disabled || !c.ready || c.milestones.length >= 20}
                  onClick={() => run(() => addMilestone(c, event, incorporation))}
                >
                  Conceder Marco · +5% e 2 PU
                </Button>
              </details>
            )}
            <details className="tdv-disclosure">
              <summary>Investir PU com incorporação</summary>
              <div className="tdv-grid">
                <TdvSelect
                  label="Tipo de investimento"
                  value={kind}
                  options={["Matriz", "Alinhavo", "Lavor", "Ampliação"]}
                  onChange={(v) => {
                    setKind(v);
                    setTarget(v === "Matriz" ? MATRICES[0] : v === "Alinhavo" ? ALINHAVOS[0] : "");
                  }}
                  disabled={disabled}
                />
                {kind === "Matriz" || kind === "Alinhavo" ? (
                  <TdvSelect
                    label="Capacidade a desenvolver"
                    value={target}
                    options={kind === "Matriz" ? MATRICES : ALINHAVOS}
                    onChange={setTarget}
                    disabled={disabled}
                  />
                ) : (
                  <TdvField
                    label="Estrutura que recebe a mudança"
                    value={target}
                    onChange={setTarget}
                    disabled={disabled}
                    short
                  />
                )}
                {(kind === "Lavor" || kind === "Ampliação") && (
                  <TdvSelect
                    label="Custo em PU"
                    value={String(cost)}
                    options={kind === "Lavor" ? ["4", "6"] : ["3", "4", "5", "6", "7"]}
                    onChange={(v) => setCost(Number(v))}
                    disabled={disabled}
                  />
                )}
                <TdvField
                  label="Onde isto passou a existir na história?"
                  value={reason}
                  onChange={setReason}
                  disabled={disabled}
                />
              </div>
              <TdvCheck
                label="Marco transcendente e incorporação irreversível expressamente reconhecidos"
                value={transcendent}
                onChange={setTranscendent}
                disabled={disabled}
              />
              <Button
                disabled={disabled || !c.ready}
                onClick={() =>
                  run(() =>
                    invest(c, {
                      kind: kind as TdvCharacter["investments"][number]["kind"],
                      target,
                      reason,
                      transcendent,
                      cost:
                        kind === "Matriz"
                          ? stats.matrices[target as Matrix] + 3
                          : kind === "Alinhavo"
                            ? 2
                            : cost,
                    }),
                  )
                }
              >
                Registrar investimento
              </Button>
            </details>
            <details className="tdv-disclosure">
              <summary>Trajetória incorporada</summary>
              {c.milestones.map((m, i) => (
                <p key={m.id}>
                  {(i + 1) * 5}% · {m.event} · {m.incorporation}
                </p>
              ))}
              {c.investments.map((i) => (
                <p key={i.id}>
                  {i.target} · {i.cost} PU · {i.reason}
                </p>
              ))}
            </details>
          </Section>
        </TabsContent>
        <TabsContent value="acao" data-sheet-content>
          <Section id="tdv-motor" title="Motor de dois Fios">
            <TdvTestPanel character={c} onChange={onChange} canEdit={canEdit} />
          </Section>
          <Section id="tdv-cena" title="Continuidade da cena">
            <p>
              Matrizes Abaladas: {c.scene.shaken.join(", ") || "nenhuma"}. Forçar a 0 PE:{" "}
              {c.scene.forcedAtZero ? "já utilizado" : "disponível, mediante contrapartida"}.
            </p>
            <Button
              disabled={disabled}
              variant="outline"
              onClick={() => upd("scene", { ...c.scene, shaken: [], forcedAtZero: false })}
            >
              Encerrar cena e liberar efeitos de cena
            </Button>
            <p className="tdv-note">
              Encerrar cena não recupera recursos, não remove Condições e não Reassenta a Âncora.
            </p>
          </Section>
          <Section id="tdv-recuperacao" title="Recuperação">
            <TdvSelect
              label="Profundidade da recuperação"
              value={recovery}
              options={["Pausa breve", "Repouso profundo", "Recuperação plena"]}
              onChange={setRecovery}
              disabled={disabled}
            />
            <TdvField
              label="Nova janela real de recuperação"
              value={window}
              onChange={setWindow}
              disabled={disabled}
            />
            <TdvCheck
              label="Houve cuidado corporal adequado"
              value={care}
              onChange={setCare}
              disabled={disabled}
            />
            <TdvCheck
              label="Houve reconstrução real da continuidade para PI pleno"
              value={rebuilt}
              onChange={setRebuilt}
              disabled={disabled}
            />
            <Button
              disabled={disabled || !c.ready}
              onClick={() =>
                run(() =>
                  recover(
                    c,
                    recovery as "Pausa breve" | "Repouso profundo" | "Recuperação plena",
                    care,
                    rebuilt,
                    window,
                  ),
                )
              }
            >
              Aplicar recuperação
            </Button>
            <p className="tdv-note">
              Repetir o mesmo intervalo não multiplica recuperação. Pausa: PE +2, PI +1, PV +2 só
              com cuidado. Repouso: PE máximo, PI +3, PV +5 com cuidado ou +2 sem.
            </p>
          </Section>
        </TabsContent>
        <TabsContent value="expressao" data-sheet-content>
          <Section id="tdv-condicoes" title="Condições">
            <div className="tdv-folios">
              {c.conditions.map((condition, index) => (
                <div key={condition.id} className="tdv-folio">
                  <div className="tdv-grid">
                    {(["name", "origin", "effect", "exit"] as const).map((key, i) => (
                      <TdvField
                        key={key}
                        label={`${["Nome", "Origem", "Efeito", "Saída"][i]} da condição ${index + 1}`}
                        value={condition[key]}
                        disabled={disabled}
                        onChange={(v) =>
                          upd(
                            "conditions",
                            c.conditions.map((x) =>
                              x.id === condition.id ? { ...x, [key]: v } : x,
                            ),
                          )
                        }
                      />
                    ))}
                    <TdvSelect
                      label={`Intensidade da condição ${index + 1}`}
                      value={condition.intensity}
                      options={["Leve", "Grave", "Crítica"]}
                      disabled={disabled}
                      onChange={(v) =>
                        upd(
                          "conditions",
                          c.conditions.map((x) =>
                            x.id === condition.id
                              ? { ...x, intensity: v as typeof condition.intensity }
                              : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    disabled={disabled}
                    onClick={() =>
                      upd(
                        "conditions",
                        c.conditions.filter((x) => x.id !== condition.id),
                      )
                    }
                  >
                    Registrar saída da condição {index + 1}
                  </Button>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() =>
                upd("conditions", [
                  ...c.conditions,
                  { id: uid(), name: "", origin: "", effect: "", exit: "", intensity: "Leve" },
                ])
              }
            >
              Nova condição
            </Button>
          </Section>
          <Section id="tdv-expressao" title="Expressão e Permanência">
            <div className="tdv-actions">
              <TdvSelect
                label="Tipo de registro"
                value={recordKind}
                options={Object.keys(RECORD_FIELDS)}
                disabled={disabled}
                onChange={(v) => setRecordKind(v as TdvRecord["kind"])}
              />
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  upd("records", [
                    ...c.records,
                    {
                      id: uid(),
                      kind: recordKind,
                      name: "",
                      fields: Object.fromEntries(RECORD_FIELDS[recordKind].map((k) => [k, ""])),
                    },
                  ])
                }
              >
                Adicionar registro
              </Button>
            </div>
            {c.records.map((record, index) => (
              <TdvDisclosure key={record.id} initiallyOpen={!record.name}>
                <summary>
                  {record.kind} · {record.name || `Registro ${index + 1}`}
                </summary>
                <TdvField
                  label={`Nome do registro ${index + 1}`}
                  value={record.name}
                  short
                  disabled={disabled}
                  onChange={(v) =>
                    upd(
                      "records",
                      c.records.map((x) => (x.id === record.id ? { ...x, name: v } : x)),
                    )
                  }
                />
                <div className="tdv-grid">
                  {[...new Set([...RECORD_FIELDS[record.kind], ...Object.keys(record.fields)])].map(
                    (field) => (
                      <TdvField
                        key={field}
                        label={`${field} · registro ${index + 1}`}
                        value={record.fields[field] || ""}
                        disabled={disabled}
                        onChange={(v) =>
                          upd(
                            "records",
                            c.records.map((x) =>
                              x.id === record.id
                                ? { ...x, fields: { ...x.fields, [field]: v } }
                                : x,
                            ),
                          )
                        }
                      />
                    ),
                  )}
                </div>
                <Button
                  variant="ghost"
                  disabled={disabled}
                  onClick={() =>
                    upd(
                      "records",
                      c.records.filter((x) => x.id !== record.id),
                    )
                  }
                >
                  Remover registro {index + 1}
                </Button>
              </TdvDisclosure>
            ))}
            <p className="tdv-note">
              Registrar conteúdo não compra Lavor nem autoriza efeito extraordinário: aquisição fica
              no histórico de PU; custos em PE e condições são os escritos no próprio conteúdo.
            </p>
          </Section>
          <Section id="tdv-historia" title="História e memória">
            <TdvField
              label="História da personagem"
              value={c.history}
              onChange={(v) => upd("history", v)}
              disabled={disabled}
            />
            <TdvField
              label="Anotações e Restos"
              value={c.notes}
              onChange={(v) => upd("notes", v)}
              disabled={disabled}
            />
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
