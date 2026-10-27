import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { TdvDisclosure, TdvField, TdvSelect, TdvNumber, TdvCheck } from "./tdv2-fields";
import {
  ALINHAVOS,
  MATRICES,
  prepareTest,
  resolveTest,
  probabilityProfile,
  type Matrix,
  type TdvCharacter,
  type TestRequest,
} from "@/lib/tdv2";
export function TdvTestPanel({
  character,
  onChange,
  canEdit,
  resolver,
  declaredCosts,
  intention,
}: {
  character: TdvCharacter;
  onChange: (value: TdvCharacter) => void;
  canEdit: boolean;
  resolver?: (request: TestRequest) => ReturnType<typeof resolveTest>;
  declaredCosts?: TestRequest["costs"];
  intention?: string;
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
    context: { intention: "", approach: "", change: "", point: "", risk: false },
  });
  const [last, setLast] = useState<ReturnType<typeof resolveTest> | null>(null);
  const upd = <K extends keyof TestRequest>(key: K, value: TestRequest[K]) =>
    setRequest((p) => ({ ...p, [key]: value }));
  const [auxiliary, setAuxiliary] = useState(false);
  const [helper, setHelper] = useState({ name: "", grade: 0, contribution: "" });
  const effective = {
    ...request,
    context: {
      ...request.context!,
      ...(intention !== undefined ? { intention } : {}),
      ...(resolver ? { risk: true } : {}),
    },
    helper: auxiliary ? helper : undefined,
    costs: declaredCosts,
  };
  let prepared: ReturnType<typeof prepareTest> | null = null,
    error = "";
  try {
    prepared = prepareTest(character, effective);
  } catch (e) {
    error = (e as Error).message;
  }
  return (
    <div className="tdv-test-panel">
      <p className="tdv-note">
        Declare intenção, abordagem e limiar antes de rolar. Sem risco relevante, resolva
        diretamente pela ficção.
      </p>
      <div className="tdv-grid">
        {(
          [
            ["intention", "Intenção"],
            ["approach", "Abordagem"],
            ["point", "Ponto em Jogo"],
            ["change", "Mudança relevante desde a tentativa anterior"],
          ] as const
        ).map(([key, label]) => (
          <TdvField
            key={key}
            label={label}
            value={effective.context[key]}
            disabled={!canEdit || (key === "intention" && intention !== undefined)}
            onChange={(v) => upd("context", { ...request.context!, [key]: v })}
          />
        ))}
      </div>
      <TdvCheck
        label="Existe risco ou oposição relevante"
        value={effective.context.risk}
        disabled={!canEdit}
        onChange={(risk) => upd("context", { ...request.context!, risk })}
      />
      <TdvDisclosure initiallyOpen={false}>
        <summary>Auxílio: um Prumo, um Tento, um teste</summary>
        <TdvCheck
          label="Receber um Tento de outra pessoa"
          value={auxiliary}
          onChange={setAuxiliary}
          disabled={!canEdit}
        />
        {auxiliary && (
          <div className="tdv-grid">
            <TdvField
              label="Pessoa que auxilia"
              value={helper.name}
              onChange={(name) => setHelper({ ...helper, name })}
              disabled={!canEdit}
              short
            />
            <TdvNumber
              label="Grau do Alinhavo compatível de quem auxilia"
              value={helper.grade}
              max={4}
              onChange={(grade) => setHelper({ ...helper, grade })}
              disabled={!canEdit}
            />
            <TdvField
              label="Contribuição e risco compartilhado"
              value={helper.contribution}
              onChange={(contribution) => setHelper({ ...helper, contribution })}
              disabled={!canEdit}
            />
          </div>
        )}
        <p className="tdv-note">
          Auxílio substitui o Tento: ninguém rola um terceiro dado. Cooperação reúne intervenções
          distintas; seus ganhos não desaparecem pela falha de outra pessoa.
        </p>
      </TdvDisclosure>
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
              const rolled = resolver ? resolver(effective) : resolveTest(character, effective);
              onChange(rolled.character);
              setLast(rolled);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Rolar os dois Fios{prepared?.cost ? ` · ${prepared.cost} PE` : ""}
          {prepared?.piCost ? ` · ${prepared.piCost} PI` : ""}
        </Button>
      </div>
      {prepared && (
        <p className="tdv-note">
          Chance exata de alcançar o limiar:{" "}
          {(probabilityProfile(prepared.prumo, prepared.tento, request.dt).success * 100).toFixed(
            1,
          )}
          %. Não presume acesso nem substitui a situação.
        </p>
      )}
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
