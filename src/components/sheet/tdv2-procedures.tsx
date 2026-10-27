import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uid, type TdvCharacter, type TdvRecord } from "@/lib/tdv2";
import {
  configureGuard,
  activateLink,
  recordOutcome,
  incorporateLavor,
  lavorIncorporated,
  expressDirectly,
  resolveExpressionTest,
  sustainExpression,
  relaxExpression,
  applyReflux,
  triggerPreparation,
  repairEquipment,
  updateReputation,
  VERTENTES,
  REPUTATION_WEIGHT,
  type ExpressionUse,
} from "@/lib/tdv2-play";
import { TdvDisclosure, TdvField, TdvSelect, TdvNumber, TdvCheck } from "./tdv2-fields";
import { TdvTestPanel } from "./tdv2-test-panel";
type Props = { character: TdvCharacter; onChange: (c: TdvCharacter) => void; canEdit: boolean };
function commit(onChange: Props["onChange"], action: () => TdvCharacter) {
  try {
    onChange(action());
    toast.success("Registrado na continuidade da personagem.");
  } catch (e) {
    toast.error((e as Error).message);
  }
}
export function TdvGuard({ character: c, onChange, canEdit }: Props) {
  const [g, setG] = useState({
    ...c.guard,
    protection: c.guard.protection ?? 0,
    protectionSource: c.guard.protectionSource ?? "",
    totalCover: c.guard.totalCover ?? "",
  });
  return (
    <TdvDisclosure initiallyOpen={false}>
      <summary>Proteção, cobertura e ausência de Guarda</summary>
      <div className="tdv-grid">
        <TdvSelect
          label="Proteção ordinária combinada"
          value={String(g.protection)}
          options={["0", "1", "2"]}
          onChange={(v) => setG({ ...g, protection: Number(v) })}
          disabled={!canEdit}
        />
        <TdvField
          label="Escudo ou cobertura efetivamente interposta"
          value={g.protectionSource}
          onChange={(protectionSource) => setG({ ...g, protectionSource })}
          disabled={!canEdit}
        />
        <TdvField
          label="Cobertura total e abordagens que impede"
          value={g.totalCover}
          onChange={(totalCover) => setG({ ...g, totalCover })}
          disabled={!canEdit}
        />
        <TdvNumber
          label="Modificação extraordinária expressa"
          value={g.modifier}
          min={-100}
          max={100}
          onChange={(modifier) => setG({ ...g, modifier })}
          disabled={!canEdit}
        />
        <TdvField
          label="Regra da modificação extraordinária"
          value={g.source}
          onChange={(source) => setG({ ...g, source })}
          disabled={!canEdit}
        />
      </div>
      <TdvCheck
        label="Guarda quebrada ou ausente"
        value={g.broken}
        onChange={(broken) => setG({ ...g, broken })}
        disabled={!canEdit}
      />
      <p className="tdv-note">
        Proteção parcial ou escudo: +1. Cobertura dominante estável: +2. A soma ordinária para em
        +2; cobertura total impede a abordagem incompatível. Perder proteção não apaga a base de
        Cadência.
      </p>
      <Button
        disabled={!canEdit}
        onClick={() =>
          commit(onChange, () =>
            configureGuard(
              c,
              g.protection,
              g.protectionSource,
              g.totalCover,
              g.modifier,
              g.source,
              g.broken,
            ),
          )
        }
      >
        Aplicar proteção declarada
      </Button>
    </TdvDisclosure>
  );
}
export function TdvLinkUse({
  character: c,
  linkId,
  onChange,
  canEdit,
}: Props & { linkId: string }) {
  const [mode, setMode] = useState("Abrir"),
    [effect, setEffect] = useState(""),
    [contribution, setContribution] = useState("");
  return (
    <TdvDisclosure initiallyOpen={false}>
      <summary>Mobilizar este Vínculo</summary>
      <TdvSelect
        label="Modo do Vínculo"
        value={mode}
        options={["Abrir", "Sustentar", "Cobrar"]}
        onChange={setMode}
        disabled={!canEdit}
      />
      <TdvField
        label="Mudança concreta permitida pela relação"
        value={effect}
        onChange={setEffect}
        disabled={!canEdit}
      />
      <TdvField
        label="Participação, risco e reciprocidade"
        value={contribution}
        onChange={setContribution}
        disabled={!canEdit}
      />
      <Button
        disabled={!canEdit || !c.ready}
        onClick={() =>
          commit(onChange, () =>
            activateLink(c, linkId, mode as "Abrir" | "Sustentar" | "Cobrar", effect, contribution),
          )
        }
      >
        Registrar uso do Vínculo
      </Button>
    </TdvDisclosure>
  );
}
export function TdvOutcome({ character: c, onChange, canEdit }: Props) {
  const [id, setId] = useState(""),
    [o, setO] = useState({
      principal: "",
      opening: "",
      trace: "",
      devolution: "",
      permanence: "",
      redobra: "",
      support: "",
    });
  const tests = c.scene.tests ?? [],
    test = tests.find((t) => t.id === id) ?? tests.at(-1);
  if (!test) return null;
  return (
    <TdvDisclosure initiallyOpen={false}>
      <summary>Da resolução ao Resto</summary>
      <div className="tdv-field">
        <label className="tadeon-dossier-label" htmlFor="tdv-outcome-test">
          Teste da cena
        </label>
        <select
          className="tadeon-dossier-field"
          id="tdv-outcome-test"
          value={test.id}
          onChange={(e) => setId(e.target.value)}
          disabled={!canEdit}
        >
          {tests.map((t) => (
            <option key={t.id} value={t.id}>
              {t.intention} · {t.prumo}+{t.tento}/{t.dt}
            </option>
          ))}
        </select>
      </div>
      <div className="tdv-grid">
        {(
          [
            ["principal", "Consequência principal"],
            ["opening", "Abertura no êxito ou Fresta na falha"],
            ["trace", "Rastro"],
            ["devolution", "Devolução"],
            ["permanence", "Permanência ou incorporação"],
            ["redobra", "Redobra do Resto"],
            ["support", "Outra continuidade que sustenta a Redobra"],
          ] as const
        ).map(([key, label]) => (
          <TdvField
            key={key}
            label={label}
            value={o[key]}
            onChange={(v) => setO({ ...o, [key]: v })}
            disabled={!canEdit}
          />
        ))}
      </div>
      <p className="tdv-note">
        Redobra reorienta o que permanece. Não repete os dados, não devolve custos nem transforma a
        falha em êxito.
      </p>
      <Button
        disabled={!canEdit}
        onClick={() => commit(onChange, () => recordOutcome(c, test.id, o))}
      >
        Incorporar Resto do teste
      </Button>
    </TdvDisclosure>
  );
}
export function TdvRecordActions({
  character: c,
  record: r,
  onChange,
  canEdit,
}: Props & { record: TdvRecord }) {
  const [reason, setReason] = useState(""),
    [cost, setCost] = useState(4),
    [functionRestored, setFunction] = useState(""),
    [signature, setSignature] = useState(""),
    [weight, setWeight] = useState(0),
    [consumed, setConsumed] = useState(true);
  if (!["Lavor", "Preparo", "Arma", "Equipamento", "Fragmento", "Reputação"].includes(r.kind))
    return null;
  return (
    <TdvDisclosure initiallyOpen={false}>
      <summary>
        {r.kind === "Lavor"
          ? "Incorporar prática com PU"
          : r.kind === "Reputação"
            ? "Reconhecimento nesta rede"
            : r.kind === "Preparo"
              ? "Acionar o Preparo"
              : "Integridade e reparo"}
      </summary>
      {r.kind === "Lavor" ? (
        <>
          <p>
            {lavorIncorporated(c, r)
              ? "Prática incorporada no percurso."
              : "Rascunho: a aquisição precisa de incorporação e PU disponíveis."}
          </p>
          <TdvSelect
            label="Custo autorizado do Lavor em PU"
            value={String(cost)}
            options={["4", "6"]}
            onChange={(v) => setCost(Number(v))}
            disabled={!canEdit}
          />
        </>
      ) : null}
      <TdvField
        label={
          r.kind === "Lavor"
            ? "Incorporação ficcional da prática"
            : r.kind === "Preparo"
              ? "Gatilho ocorrido e mudança efetiva"
              : r.kind === "Reputação"
                ? "Acontecimento reconhecido pela rede"
                : "Reparo material realizado"
        }
        value={reason}
        onChange={setReason}
        disabled={!canEdit}
      />
      {r.kind === "Reputação" && (
        <TdvSelect
          label="Peso do reconhecimento"
          value={REPUTATION_WEIGHT[weight]}
          options={REPUTATION_WEIGHT}
          onChange={(v) =>
            setWeight(REPUTATION_WEIGHT.indexOf(v as (typeof REPUTATION_WEIGHT)[number]))
          }
          disabled={!canEdit}
        />
      )}
      {r.kind === "Preparo" && (
        <TdvCheck
          label="O uso consome este Preparo"
          value={consumed}
          onChange={setConsumed}
          disabled={!canEdit}
        />
      )}
      {["Arma", "Equipamento", "Fragmento"].includes(r.kind) && (
        <>
          <TdvField
            label="Função efetivamente reconstituída"
            value={functionRestored}
            onChange={setFunction}
            disabled={!canEdit}
          />
          <TdvField
            label="Assinatura após o reparo"
            value={signature}
            onChange={setSignature}
            disabled={!canEdit}
          />
          <p className="tdv-note">
            Recompor matéria não reconstitui automaticamente função ou Assinatura. Integridade é
            Apto, Danificado ou Inutilizado.
          </p>
        </>
      )}
      <Button
        disabled={!canEdit || !c.ready || (r.kind === "Lavor" && lavorIncorporated(c, r))}
        onClick={() =>
          commit(onChange, () =>
            r.kind === "Lavor"
              ? incorporateLavor(c, r.id, cost as 4 | 6, reason)
              : r.kind === "Preparo"
                ? triggerPreparation(c, r.id, reason, consumed)
                : r.kind === "Reputação"
                  ? updateReputation(c, r.id, weight, reason)
                  : repairEquipment(c, r.id, reason, functionRestored, signature),
          )
        }
      >
        Confirmar{" "}
        {r.kind === "Lavor"
          ? "incorporação"
          : r.kind === "Preparo"
            ? "acionamento"
            : r.kind === "Reputação"
              ? "reconhecimento"
              : "reparo"}
      </Button>
    </TdvDisclosure>
  );
}
export function TdvExpressionUse({ character: c, onChange, canEdit }: Props) {
  const [s, setS] = useState<ExpressionUse>({
    eventId: uid(),
    recordIds: [],
    intention: "",
    target: "",
    contributions: [],
    vertentes: [],
    pe: 0,
    pi: 0,
    priceSource: "",
    limitsAcknowledged: false,
    sustain: false,
    sustainPE: 0,
    sustainPI: 0,
    exit: "",
  });
  const [risky, setRisky] = useState(false);
  const choices = c.records.filter((r) => ["Lavor", "Trama", "Fragmento", "Selo"].includes(r.kind));
  const next = (value: TdvCharacter) => {
    onChange(value);
    setS({ ...s, eventId: uid() });
  };
  return (
    <>
      {choices.length ? (
        <TdvDisclosure initiallyOpen={false}>
          <summary>Preparar uma expressão ou Costura</summary>
          <p className="tdv-note">
            Escolha uma expressão ou costure Lavores de Vertentes diferentes. Os custos e limites
            vêm das práticas escolhidas. Uma Costura tem uma intenção e um único teste, salvo ações
            realmente distintas.
          </p>
          <div className="tdv-folios">
            {choices.map((r) => (
              <div className="tdv-folio" key={r.id}>
                <TdvCheck
                  label={`${r.kind}: ${r.name || "Sem nome"}`}
                  value={s.recordIds.includes(r.id)}
                  disabled={!canEdit}
                  onChange={(checked) => {
                    const ids = checked
                      ? [...s.recordIds, r.id]
                      : s.recordIds.filter((id) => id !== r.id);
                    setS({
                      ...s,
                      recordIds: ids,
                      contributions: ids.map(
                        (id) => s.contributions[s.recordIds.indexOf(id)] ?? "",
                      ),
                      vertentes: ids.map(
                        (id) =>
                          s.vertentes[s.recordIds.indexOf(id)] ??
                          c.records.find((x) => x.id === id)?.fields.Vertente ??
                          "",
                      ),
                    });
                  }}
                />
                <p className="tdv-note">
                  {r.fields["Preço/limite"] || r.fields["Custo PE"] || r.fields["Custo de uso"]}{" "}
                  {r.fields.Gatilho}
                </p>
              </div>
            ))}
          </div>
          <div className="tdv-grid">
            <TdvField
              label="Intenção única da expressão"
              value={s.intention}
              onChange={(intention) => setS({ ...s, intention })}
              disabled={!canEdit}
            />
            <TdvField
              label="Alvo e acesso concreto"
              value={s.target}
              onChange={(target) => setS({ ...s, target })}
              disabled={!canEdit}
            />
            <TdvField
              label="Preços, gatilhos, Puxagem e limites declarados"
              value={s.priceSource}
              onChange={(priceSource) => setS({ ...s, priceSource })}
              disabled={!canEdit}
            />
            <TdvNumber
              label="Custo declarado em PE"
              value={s.pe}
              onChange={(pe) => setS({ ...s, pe })}
              disabled={!canEdit}
            />
            <TdvNumber
              label="Custo declarado em PI"
              value={s.pi}
              onChange={(pi) => setS({ ...s, pi })}
              disabled={!canEdit}
            />
          </div>
          {s.recordIds.length > 1 &&
            s.recordIds.map((id, index) => (
              <div className="tdv-grid" key={id}>
                <TdvField
                  label={`Contribuição de ${choices.find((r) => r.id === id)?.name}`}
                  value={s.contributions[index] ?? ""}
                  onChange={(v) =>
                    setS({
                      ...s,
                      contributions: s.recordIds.map((_, i) =>
                        i === index ? v : (s.contributions[i] ?? ""),
                      ),
                    })
                  }
                  disabled={!canEdit}
                />
                <TdvSelect
                  label={`Vertente da contribuição ${index + 1}`}
                  value={s.vertentes[index] ?? ""}
                  options={["", ...VERTENTES]}
                  onChange={(v) =>
                    setS({
                      ...s,
                      vertentes: s.recordIds.map((_, i) =>
                        i === index ? v : (s.vertentes[i] ?? ""),
                      ),
                    })
                  }
                  disabled={!canEdit}
                />
              </div>
            ))}
          <TdvField
            label="Identificador da Puxagem original, se houver"
            value={s.pullEventId ?? ""}
            onChange={(pullEventId) => setS({ ...s, pullEventId: pullEventId.trim() || undefined })}
            disabled={!canEdit}
            short
          />
          <TdvCheck
            label="Gatilhos válidos e preços de todas as práticas conferidos"
            value={s.limitsAcknowledged}
            onChange={(limitsAcknowledged) => setS({ ...s, limitsAcknowledged })}
            disabled={!canEdit}
          />
          <TdvCheck
            label="A expressão permanece sustentada"
            value={s.sustain}
            onChange={(sustain) => setS({ ...s, sustain })}
            disabled={!canEdit}
          />
          {s.sustain && (
            <div className="tdv-grid">
              <TdvNumber
                label="PE por janela de sustentação"
                value={s.sustainPE}
                onChange={(sustainPE) => setS({ ...s, sustainPE })}
                disabled={!canEdit}
              />
              <TdvNumber
                label="PI por janela de sustentação"
                value={s.sustainPI}
                onChange={(sustainPI) => setS({ ...s, sustainPI })}
                disabled={!canEdit}
              />
              <TdvField
                label="Condição de término, Fixação ou Relaxamento"
                value={s.exit}
                onChange={(exit) => setS({ ...s, exit })}
                disabled={!canEdit}
              />
            </div>
          )}
          <TdvCheck
            label="Há risco ou oposição: usar o Motor de dois Fios"
            value={risky}
            onChange={setRisky}
            disabled={!canEdit}
          />
          {risky ? (
            <TdvTestPanel
              character={c}
              onChange={next}
              canEdit={canEdit && c.ready}
              intention={s.intention}
              declaredCosts={{ eventId: s.eventId, source: s.priceSource, pe: s.pe, pi: s.pi }}
              resolver={(request) =>
                resolveExpressionTest(c, s, {
                  ...request,
                  context: { ...request.context!, intention: s.intention },
                })
              }
            />
          ) : (
            <Button
              disabled={!canEdit || !c.ready}
              onClick={() => commit(next, () => expressDirectly(c, s))}
            >
              Expressar pela ficção e pagar custos
            </Button>
          )}
          <p className="tdv-note">
            Aproximação, Tração, Tecitura, Expressão e Relaxamento são movimentos conceituais. Não
            exigem cinco ações ou cinco rolagens. Puxagem e Tecitura permanecem distintas; a mesma
            consequência não deve ser cobrada novamente como Refluxo.
          </p>
        </TdvDisclosure>
      ) : (
        <p className="tdv-note">
          Adicione Lavores, Tramas, Fragmentos ou Selos ao repertório para usar expressões. Lavores
          precisam de incorporação em PU antes do uso.
        </p>
      )}
      {(c.activeExpressions ?? []).map((active) => (
        <TdvActiveUse
          key={active.id}
          character={c}
          id={active.id}
          onChange={onChange}
          canEdit={canEdit}
        />
      ))}
    </>
  );
}
function TdvActiveUse({ character: c, id, onChange, canEdit }: Props & { id: string }) {
  const a = c.activeExpressions!.find((e) => e.id === id)!,
    [window, setWindow] = useState(""),
    [reason, setReason] = useState(""),
    [pe, setPe] = useState(0),
    [pi, setPi] = useState(0),
    [effect, setEffect] = useState(""),
    [event, setEvent] = useState("");
  const active = ["Sustentada", "Em curso"].includes(a.state);
  return (
    <TdvDisclosure initiallyOpen={active}>
      <summary>
        {a.name} · {a.state}
      </summary>
      <p>
        {a.target} · sustentação {a.sustainPE} PE / {a.sustainPI} PI · {a.exit}
      </p>
      <TdvField
        label="Nova janela de sustentação"
        value={window}
        onChange={setWindow}
        disabled={!canEdit}
      />
      <TdvField
        label="Continuidade que sustenta ou encerra a expressão"
        value={reason}
        onChange={setReason}
        disabled={!canEdit}
      />
      <div className="tdv-actions">
        <Button
          disabled={!canEdit || !active}
          onClick={() => commit(onChange, () => sustainExpression(c, id, window, reason))}
        >
          Sustentar nesta janela
        </Button>
        <Button
          variant="outline"
          disabled={!canEdit || !active}
          onClick={() => commit(onChange, () => relaxExpression(c, id, reason))}
        >
          Relaxar
        </Button>
        <Button
          variant="outline"
          disabled={!canEdit || !active}
          onClick={() => commit(onChange, () => relaxExpression(c, id, reason, true))}
        >
          Interromper
        </Button>
      </div>
      <TdvDisclosure initiallyOpen={false}>
        <summary>Refluxo concreto</summary>
        <TdvField
          label="Identificador do acontecimento de Refluxo"
          value={event}
          onChange={setEvent}
          disabled={!canEdit}
        />
        <TdvField
          label="Consequência específica do Refluxo"
          value={effect}
          onChange={setEffect}
          disabled={!canEdit}
        />
        <div className="tdv-grid">
          <TdvNumber
            label="PE do Refluxo expresso"
            value={pe}
            onChange={setPe}
            disabled={!canEdit}
          />
          <TdvNumber
            label="PI do Refluxo expresso"
            value={pi}
            onChange={setPi}
            disabled={!canEdit}
          />
        </div>
        <Button
          disabled={!canEdit}
          onClick={() =>
            commit(onChange, () =>
              applyReflux(c, id, { id: event, source: reason, pe, pi }, effect),
            )
          }
        >
          Registrar Refluxo sem cobrança repetida
        </Button>
      </TdvDisclosure>
    </TdvDisclosure>
  );
}
