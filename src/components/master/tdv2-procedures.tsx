import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Section } from "@/components/sheet/sheet-ui";
import {
  TdvDisclosure,
  TdvField,
  TdvNumber,
  TdvSelect,
  TdvCheck,
} from "@/components/sheet/tdv2-fields";
import {
  OPERATION_KINDS,
  newOperation,
  registerOperationStep,
  type OperationStep,
  type TdvOperation,
} from "@/lib/tdv2-operations";
import {
  PHYSICAL_INTENTS,
  applyPhysicalConsequence,
  opposedRead,
  type PhysicalConsequence,
} from "@/lib/tdv2-play";
import { constitution, uid, type TdvCharacter } from "@/lib/tdv2";
import type { TdvMasterState } from "@/lib/tdv2-master";
export function TdvOperations({
  state: s,
  onChange,
}: {
  state: TdvMasterState;
  onChange: (s: TdvMasterState) => void;
}) {
  const [kind, setKind] = useState<TdvOperation["kind"]>("Prolongada");
  return (
    <Section id="tdv-master-operations" title="Operações e intervenções encadeadas">
      <p className="tdv-note">
        Etapas mostram mudanças reais, não uma sequência obrigatória de rolagens. A falha conserva o
        progresso já obtido. Pressão, Tensão pessoal e urgência têm registros próprios.
      </p>
      <div className="tdv-actions">
        <TdvSelect
          label="Procedimento da operação"
          value={kind}
          options={OPERATION_KINDS}
          onChange={(v) => setKind(v as typeof kind)}
        />
        <Button
          disabled={(s.operations?.length ?? 0) >= 50}
          onClick={() =>
            onChange({ ...s, operations: [...(s.operations ?? []), newOperation(kind)] })
          }
        >
          Abrir operação
        </Button>
      </div>
      {(s.operations ?? []).map((o) => (
        <OperationEditor
          key={o.id}
          operation={o}
          pressures={s.pressures}
          onChange={(next) =>
            onChange({ ...s, operations: s.operations!.map((x) => (x.id === o.id ? next : x)) })
          }
        />
      ))}
    </Section>
  );
}
function OperationEditor({
  operation: o,
  pressures,
  onChange,
}: {
  operation: TdvOperation;
  pressures: TdvMasterState["pressures"];
  onChange: (o: TdvOperation) => void;
}) {
  const [step, setStep] = useState<OperationStep>({
    stageIds: [],
    intention: "",
    approach: "",
    change: "",
    evidence: "",
    rest: "",
    participants: "",
    resolution: "Ficção direta",
    prumo: 1,
    tento: 1,
    broadens: false,
  });
  const set = <K extends keyof OperationStep>(key: K, value: OperationStep[K]) =>
    setStep({ ...step, [key]: value });
  return (
    <TdvDisclosure initiallyOpen={!o.name}>
      <summary>
        {o.kind} · {o.name || "Nova operação"} · {o.stages.filter((s) => s.done).length}/
        {o.stages.length}
      </summary>
      <div className="tdv-grid">
        <TdvField
          label="Nome da operação"
          value={o.name}
          onChange={(name) => onChange({ ...o, name })}
          short
        />
        <TdvField
          label="Objetivo e condição de conclusão"
          value={o.objective}
          onChange={(objective) => onChange({ ...o, objective })}
        />
        <TdvNumber
          label="Limiar anunciado da operação"
          value={o.dt}
          min={2}
          max={1000}
          onChange={(dt) => onChange({ ...o, dt })}
        />
        <div className="tdv-field">
          <label htmlFor={`pressure-${o.id}`}>Frente de Pressão associada</label>
          <select
            id={`pressure-${o.id}`}
            value={o.pressureId}
            onChange={(e) => onChange({ ...o, pressureId: e.target.value })}
          >
            <option value="">Sem frente associada</option>
            {pressures.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.value}/4
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="tdv-folios">
        {o.stages.map((stage) => (
          <div className="tdv-folio" key={stage.id}>
            <TdvField
              label="Etapa ou movimento conceitual"
              value={stage.name}
              onChange={(name) =>
                onChange({
                  ...o,
                  stages: o.stages.map((x) => (x.id === stage.id ? { ...x, name } : x)),
                })
              }
              short
            />
            <p>{stage.done ? `Concluída: ${stage.evidence}` : "Aberta"}</p>
            {!stage.done && (
              <TdvCheck
                label={`Esta intervenção abrange ${stage.name}`}
                value={step.stageIds.includes(stage.id)}
                onChange={(checked) =>
                  set(
                    "stageIds",
                    checked
                      ? [...step.stageIds, stage.id]
                      : step.stageIds.filter((id) => id !== stage.id),
                  )
                }
              />
            )}
          </div>
        ))}
      </div>
      <TdvDisclosure initiallyOpen={false}>
        <summary>Registrar uma intervenção</summary>
        <div className="tdv-grid">
          {(
            [
              ["intention", "Intenção desta intervenção"],
              ["approach", "Abordagem e acesso"],
              ["change", "Mudança relevante desde a tentativa anterior"],
              ["evidence", "Mudança verificável produzida ou consequência da falha"],
              ["participants", "Contribuições distintas e seus responsáveis"],
              ["rest", "Resto, permanência e próxima intervenção"],
            ] as const
          ).map(([key, label]) => (
            <TdvField key={key} label={label} value={step[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
        <TdvSelect
          label="Como a intervenção foi resolvida"
          value={step.resolution}
          options={["Ficção direta", "Teste"]}
          onChange={(v) => set("resolution", v as typeof step.resolution)}
        />
        {step.resolution === "Teste" && (
          <div className="tdv-grid">
            <TdvNumber
              label="Prumo original da intervenção"
              value={step.prumo}
              min={1}
              max={20}
              onChange={(v) => set("prumo", v)}
            />
            <TdvNumber
              label="Tento original da intervenção"
              value={step.tento}
              min={1}
              max={20}
              onChange={(v) => set("tento", v)}
            />
          </div>
        )}
        <TdvCheck
          label="A ação realmente abrange as duas etapas de uma operação prolongada"
          value={step.broadens}
          onChange={(v) => set("broadens", v)}
        />
        <Button
          onClick={() => {
            try {
              onChange(registerOperationStep(o, step));
              setStep({ ...step, stageIds: [] });
              toast.success(
                "Intervenção registrada. A Pressão só muda por um acontecimento declarado.",
              );
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Registrar intervenção e preservar progresso
        </Button>
      </TdvDisclosure>
      <ol>
        {o.history.map((h) => (
          <li key={h.id}>
            {h.intention} · {h.success ? "alcançada" : "não alcançada"} · {h.resolution}
            {h.prumo ? ` ${h.prumo}+${h.tento}/${h.dt}` : ""} · {h.rest}
          </li>
        ))}
      </ol>
    </TdvDisclosure>
  );
}
export type TdvRosterRow = {
  id: string;
  name: string;
  tdv2_data: TdvCharacter;
  updated_at: string;
};
export function TdvPhysicalResolution({
  roster,
  onApply,
  busy,
}: {
  roster: TdvRosterRow[];
  onApply: (row: TdvRosterRow, c: TdvCharacter) => Promise<boolean>;
  busy: boolean;
}) {
  const [target, setTarget] = useState(""),
    [v, setV] = useState<PhysicalConsequence>({
      eventId: uid(),
      intention: "Ferir",
      prumo: 1,
      tento: 1,
      defense: "Guarda",
      damage: 1,
      damageSource: "",
      reduction: 0,
      reductionSource: "",
      blocked: false,
      effect: "",
      extension: "",
      extensionSource: "Margem elevada",
      extensionRule: "",
      brink: false,
      window: "",
    });
  const row = roster.find((r) => r.id === target);
  const alreadyApplied = !!row?.tdv2_data.records.some((r) => r.fields.Acontecimento === v.eventId);
  const set = <K extends keyof PhysicalConsequence>(key: K, value: PhysicalConsequence[K]) =>
    setV({ ...v, [key]: value });
  let preview = "Escolha a ficha afetada e declare a consequência.";
  if (row) {
    try {
      const r = applyPhysicalConsequence(row.tdv2_data, v);
      preview = `${r.result.quality} · Enlace ${r.result.enlace} / ${v.defense} ${r.result.dt} · margem ${r.result.margin}`;
    } catch (e) {
      preview = (e as Error).message;
    }
  }
  return (
    <Section id="tdv-master-consequence" title="Aplicar a consequência física">
      <p className="tdv-note">
        Use os dados já rolados. Uma Resposta muda a situação antes da consequência; releia os
        mesmos Fios contra o único limiar admissível. Uma manobra não recebe dano gratuito.
        Consonância não dobra dano.
      </p>
      <div className="tdv-field">
        <label htmlFor="tdv-physical-target">Personagem afetada</label>
        <select
          id="tdv-physical-target"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          disabled={busy}
        >
          <option value="">Escolher ficha TdV II</option>
          {roster.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      {row && (
        <p>
          PV {row.tdv2_data.resources.pv}/{constitution(row.tdv2_data).maximums.pv} · Guarda{" "}
          {constitution(row.tdv2_data).guard ?? "ausente"}
        </p>
      )}
      <div className="tdv-grid">
        <TdvSelect
          label="Intenção principal"
          value={v.intention}
          options={PHYSICAL_INTENTS}
          onChange={(n) =>
            setV({ ...v, intention: n as typeof v.intention, damage: n === "Ferir" ? 1 : 0 })
          }
          disabled={busy}
        />
        <TdvSelect
          label="Único limiar admissível pela abordagem"
          value={v.defense}
          options={["Guarda", "Resistência", "Evasão", "Lucidez", "Firmeza"]}
          onChange={(n) => set("defense", n as typeof v.defense)}
          disabled={busy}
        />
        <TdvNumber
          label="Prumo original do ataque"
          value={v.prumo}
          min={1}
          max={20}
          onChange={(n) => set("prumo", n)}
          disabled={busy}
        />
        <TdvNumber
          label="Tento original do ataque"
          value={v.tento}
          min={1}
          max={20}
          onChange={(n) => set("tento", n)}
          disabled={busy}
        />
        <TdvField
          label="Abordagem e consequência principal acordada"
          value={v.effect}
          onChange={(n) => set("effect", n)}
          disabled={busy}
        />
        <TdvNumber
          label="Dano base em PV"
          value={v.damage}
          max={100}
          onChange={(n) => set("damage", n)}
          disabled={busy || v.intention !== "Ferir"}
        />
        <TdvField
          label="Fonte singular para dano fora de 1 a 3 PV"
          value={v.damageSource}
          onChange={(n) => set("damageSource", n)}
          disabled={busy}
        />
        <TdvNumber
          label="Redução expressa de dano"
          value={v.reduction}
          onChange={(n) => set("reduction", n)}
          disabled={busy}
        />
        <TdvField
          label="Regra que concede esta redução"
          value={v.reductionSource}
          onChange={(n) => set("reductionSource", n)}
          disabled={busy}
        />
      </div>
      <TdvCheck
        label="A abordagem está impedida, inclusive por cobertura total"
        value={v.blocked}
        onChange={(n) => set("blocked", n)}
        disabled={busy}
      />
      <TdvDisclosure initiallyOpen={false}>
        <summary>Extensão e estado À Beira</summary>
        <TdvField
          label="Extensão concreta da consequência"
          value={v.extension}
          onChange={(n) => set("extension", n)}
          disabled={busy}
        />
        <TdvSelect
          label="O que autoriza a extensão"
          value={v.extensionSource}
          options={[
            "Margem elevada",
            "Consonância com alcance",
            "Propriedade expressa",
            "Costura legítima",
          ]}
          onChange={(n) => set("extensionSource", n as typeof v.extensionSource)}
          disabled={busy}
        />
        <TdvField
          label="Propriedade ou relação da Costura"
          value={v.extensionRule}
          onChange={(n) => set("extensionRule", n)}
          disabled={busy}
        />
        <TdvCheck
          label="Uma nova consequência física a 0 PV leva a À Beira"
          value={v.brink}
          onChange={(n) => set("brink", n)}
          disabled={busy}
        />
        <TdvField
          label="Janela anunciada de estabilização"
          value={v.window}
          onChange={(n) => set("window", n)}
          disabled={busy}
        />
      </TdvDisclosure>
      <p role="status">{preview}</p>
      <Button
        disabled={!row || busy || !row.tdv2_data.ready || alreadyApplied}
        onClick={() => {
          try {
            const consequence = applyPhysicalConsequence(row!.tdv2_data, v);
            void onApply(row!, consequence.character);
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      >
        Aplicar uma vez na ficha afetada
      </Button>
      {alreadyApplied && (
        <Button
          variant="outline"
          onClick={() => setV({ ...v, eventId: uid(), prumo: 1, tento: 1, effect: "" })}
        >
          Preparar outra consequência
        </Button>
      )}
    </Section>
  );
}
export function TdvOppositionRead() {
  const [a, setA] = useState({ prumo: 1, tento: 1, permission: true }),
    [b, setB] = useState({ prumo: 1, tento: 1, permission: true });
  const r = opposedRead(a, b);
  return (
    <Section id="tdv-master-opposed" title="Ler uma oposição entre duas ações">
      <div className="tdv-grid">
        {(
          [
            ["A", a, setA],
            ["B", b, setB],
          ] as const
        ).map(([name, s, set]) => (
          <div key={name}>
            <h3>Intervenção {name}</h3>
            <TdvNumber
              label={`Prumo original ${name}`}
              value={s.prumo}
              min={1}
              max={20}
              onChange={(prumo) => set({ ...s, prumo })}
            />
            <TdvNumber
              label={`Tento original ${name}`}
              value={s.tento}
              min={1}
              max={20}
              onChange={(tento) => set({ ...s, tento })}
            />
            <TdvCheck
              label={`A intervenção ${name} tem permissão ficcional`}
              value={s.permission}
              onChange={(permission) => set({ ...s, permission })}
            />
          </div>
        ))}
      </div>
      <p role="status">
        {r.winner === "Empate"
          ? "Empate: conserve a situação ou decida pela ficção."
          : `Prevalece ${r.winner} · margem ${r.margin}`}
      </p>
      <p className="tdv-note">
        Os números vêm das rolagens originais. Uma ação sem acesso não se torna possível por somar
        mais. A dupla unidade falha criticamente; a Matriz usada fica Abalada no teste da ficha.
      </p>
    </Section>
  );
}
