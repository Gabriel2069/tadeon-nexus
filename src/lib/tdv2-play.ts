import {
  constitution,
  invest,
  readTest,
  resolveTest,
  setResource,
  uid,
  type TestRequest,
  type TdvCharacter,
  type TdvRecord,
  type TdvActiveExpression,
} from "./tdv2";
export const VERTENTES = ["Corpórea", "Cônscia", "Cinética", "Canalizada"] as const;
export const INTEGRITY = ["Apto", "Danificado", "Inutilizado"] as const;
export const REPUTATION_WEIGHT = [
  "Desconhecido",
  "Conhecido",
  "Reconhecido",
  "Referência",
  "Autoridade",
] as const;
const required = (value: string, message: string) => {
  if (!value.trim()) throw new Error(message);
  return value.trim();
};
const whole = (value: number) => {
  if (!Number.isInteger(value) || value < 0)
    throw new Error("O custo precisa ser um inteiro não negativo.");
  return value;
};
export function rest(c: TdvCharacter, name: string, fields: Record<string, string>): TdvCharacter {
  if (c.records.length >= 200)
    throw new Error("Organize ou exporte a memória antes de acrescentar novos registros.");
  return { ...c, records: [...c.records, { id: uid(), kind: "Resto", name, fields }] };
}
export function payDeclared(
  c: TdvCharacter,
  event: { id: string; source: string; pe: number; pi: number },
): TdvCharacter {
  required(event.id, "Identifique o acontecimento de custo.");
  required(event.source, "Declare de onde vem o custo.");
  whole(event.pe);
  whole(event.pi);
  if (c.scene.paidEvents?.some((e) => e.id === event.id))
    throw new Error("Este acontecimento já foi pago; não cobre a mesma consequência novamente.");
  if ((c.scene.paidEvents?.length ?? 0) >= 200)
    throw new Error("Organize a cena antes de novos pagamentos.");
  if (c.resources.pe < event.pe || c.resources.pi < event.pi)
    throw new Error("PE ou PI insuficientes; esta abordagem não começa.");
  return {
    ...c,
    resources: { ...c.resources, pe: c.resources.pe - event.pe, pi: c.resources.pi - event.pi },
    scene: { ...c.scene, paidEvents: [...(c.scene.paidEvents ?? []), event] },
  };
}
export function recordOutcome(
  c: TdvCharacter,
  testId: string,
  outcome: {
    principal: string;
    opening: string;
    trace: string;
    devolution: string;
    permanence: string;
    redobra: string;
    support: string;
  },
): TdvCharacter {
  const test = c.scene.tests?.find((t) => t.id === testId);
  if (!test) throw new Error("O teste precisa pertencer à cena atual.");
  if (c.records.some((r) => r.kind === "Resto" && r.fields.Teste === testId))
    throw new Error("O Resto deste teste já foi registrado.");
  required(outcome.principal, "Registre a consequência principal.");
  if (outcome.redobra.trim())
    required(outcome.support, "Redobra exige outra continuidade capaz de sustentar o Resto.");
  const result = readTest(test.prumo, test.tento, test.dt);
  return rest(c, `Resto: ${test.intention}`, {
    Teste: testId,
    Intenção: test.intention,
    Abordagem: test.approach,
    "Ponto em Jogo": test.point,
    "Dados originais": `${test.prumo} + ${test.tento} = ${result.enlace}; DT ${test.dt}`,
    Consequência: outcome.principal,
    [result.success ? "Abertura" : "Fresta"]: outcome.opening,
    Rastro: outcome.trace,
    Devolução: outcome.devolution,
    Permanência: outcome.permanence,
    Redobra: outcome.redobra,
    "Continuidade da Redobra": outcome.support,
  });
}
export function activateLink(
  c: TdvCharacter,
  id: string,
  mode: "Abrir" | "Sustentar" | "Cobrar",
  effect: string,
  contribution: string,
  newState?: TdvCharacter["face"]["links"][number]["state"],
): TdvCharacter {
  const link = c.face.links.find((l) => l.id === id);
  if (!link) throw new Error("Vínculo não encontrado.");
  required(effect, "Declare a mudança que a relação realmente permite.");
  required(
    contribution,
    mode === "Cobrar"
      ? "Registre a reciprocidade ou cobrança assumida."
      : "Registre a participação concreta da relação.",
  );
  const next = newState
    ? {
        ...c,
        face: {
          ...c.face,
          links: c.face.links.map((l) => (l.id === id ? { ...l, state: newState } : l)),
        },
      }
    : c;
  return rest(next, `${mode}: ${link.node}`, {
    Vínculo: link.node,
    "Estado anterior": link.state,
    "Estado atual": newState ?? link.state,
    Efeito: effect,
    "Participação ou reciprocidade": contribution,
    Limite:
      "Nenhum bônus automático; estados Ferido/Rompido não oferecem o funcionamento anterior sem uma nova continuidade.",
  });
}
export function configureGuard(
  c: TdvCharacter,
  protection: number,
  source: string,
  totalCover: string,
  modifier: number,
  extraordinarySource: string,
  broken: boolean,
): TdvCharacter {
  if (!Number.isInteger(protection) || protection < 0 || protection > 2)
    throw new Error("Proteções ordinárias combinadas limitam-se a +2.");
  if (protection > 0) required(source, "Nomeie a cobertura ou proteção efetivamente interposta.");
  if (protection > 0 && totalCover.trim())
    throw new Error("Cobertura total impede a abordagem incompatível; não acrescenta +2.");
  if (!Number.isInteger(modifier) || Math.abs(modifier) > 100)
    throw new Error("Modificação de Guarda inválida.");
  if (modifier !== 0)
    required(extraordinarySource, "Uma modificação adicional precisa de regra expressa.");
  return {
    ...c,
    guard: {
      protection,
      protectionSource: source,
      totalCover,
      modifier,
      source: extraordinarySource,
      broken,
    },
  };
}
export function opposedRead(
  a: { prumo: number; tento: number; permission: boolean },
  b: { prumo: number; tento: number; permission: boolean },
) {
  for (const side of [a, b])
    for (const n of [side.prumo, side.tento])
      if (!Number.isInteger(n) || n < 1 || n > 20)
        throw new Error("Use os resultados efetivamente rolados, entre 1 e 20.");
  const ar = readTest(a.prumo, a.tento, b.prumo + b.tento),
    br = readTest(b.prumo, b.tento, a.prumo + a.tento);
  const viableA = a.permission && !ar.criticalFailure,
    viableB = b.permission && !br.criticalFailure;
  const winner =
    !viableA && !viableB
      ? "Empate"
      : !viableA
        ? "B"
        : !viableB
          ? "A"
          : ar.enlace === br.enlace
            ? "Empate"
            : ar.enlace > br.enlace
              ? "A"
              : "B";
  return {
    winner,
    margin: winner === "Empate" ? 0 : Math.abs(ar.enlace - br.enlace),
    a: { ...ar, critical: winner === "A" && ar.consonance },
    b: { ...br, critical: winner === "B" && br.consonance },
  };
}
export const PHYSICAL_INTENTS = [
  "Ferir",
  "Deslocar",
  "Conter",
  "Desarmar",
  "Quebrar Guarda",
  "Outra mudança",
] as const;
export interface PhysicalConsequence {
  eventId?: string;
  intention: (typeof PHYSICAL_INTENTS)[number];
  prumo: number;
  tento: number;
  defense: "Guarda" | "Resistência" | "Evasão" | "Lucidez" | "Firmeza";
  damage: number;
  damageSource: string;
  reduction: number;
  reductionSource: string;
  blocked: boolean;
  effect: string;
  extension: string;
  extensionSource:
    "Margem elevada" | "Consonância com alcance" | "Propriedade expressa" | "Costura legítima";
  extensionRule: string;
  brink: boolean;
  window: string;
}
export function applyPhysicalConsequence(c: TdvCharacter, s: PhysicalConsequence) {
  required(s.effect, "Declare a consequência principal e a abordagem.");
  if (s.eventId && c.records.some((r) => r.fields.Acontecimento === s.eventId))
    throw new Error("Esta consequência já foi aplicada.");
  if (s.blocked)
    throw new Error("A abordagem está impedida. Crie acesso; cobertura total não é apenas +2.");
  const stats = constitution(c),
    dt = s.defense === "Guarda" ? stats.guard : stats.defenses[s.defense];
  if (dt === null)
    throw new Error(
      "A Guarda está ausente; escolha o limiar admissível pela abordagem, sem segunda Defesa.",
    );
  for (const n of [s.prumo, s.tento])
    if (!Number.isInteger(n) || n < 1 || n > 20)
      throw new Error("Informe os dois resultados originais do ataque.");
  const result = readTest(s.prumo, s.tento, dt);
  if (!result.success)
    throw new Error(
      "O ataque não alcançou o limiar; não aplique a consequência principal como êxito.",
    );
  if (s.extension.trim()) {
    if (s.extensionSource === "Margem elevada" && result.margin < 4)
      throw new Error("A margem não autoriza esta extensão.");
    if (s.extensionSource === "Consonância com alcance" && !result.critical)
      throw new Error("Não houve Consonância bem-sucedida.");
    if (["Propriedade expressa", "Costura legítima"].includes(s.extensionSource))
      required(s.extensionRule, "Nomeie a propriedade ou relação que autoriza a extensão.");
  }
  whole(s.damage);
  whole(s.reduction);
  if (s.reduction > 0)
    required(
      s.reductionSource,
      "Armadura não concede RD universal; informe a redução expressamente escrita.",
    );
  if (s.intention === "Ferir" && (s.damage < 1 || s.damage > 3))
    required(s.damageSource, "Dano fora de 1–3 PV exige uma fonte singular expressa.");
  if (s.intention !== "Ferir" && s.damage !== 0)
    throw new Error(
      "Uma manobra sem ferir produz 0 PV de dano, salvo outra regra específica registrada separadamente.",
    );
  if (c.critical === "Morta")
    throw new Error("PV e recuperação ordinários não alteram o estado de morte.");
  let next = c;
  if (s.intention === "Ferir") {
    const damage = Math.max(0, s.damage - s.reduction);
    next = setResource(c, "pv", c.resources.pv - damage);
    if (c.resources.pv === 0 && damage > 0 && s.brink) {
      required(s.window, "À Beira exige uma janela de estabilização anunciada.");
      next = { ...next, critical: "À Beira", deathWindow: s.window };
    }
  }
  if (s.intention === "Quebrar Guarda")
    next = {
      ...next,
      guard: { ...next.guard, broken: true, protection: 0, protectionSource: s.effect },
    };
  next = rest(next, `Conflito: ${s.intention}`, {
    Acontecimento: s.eventId ?? "",
    Efeito: s.effect,
    "Limiar único": `${s.defense} ${dt}`,
    "Dados originais": `${s.prumo} + ${s.tento} = ${result.enlace}`,
    Dano: s.intention === "Ferir" ? String(Math.max(0, s.damage - s.reduction)) : "0",
    Extensão: s.extension,
    "Fonte da extensão": s.extension
      ? s.extensionSource + (s.extensionRule ? `: ${s.extensionRule}` : "")
      : "",
    "Proteção expressa": s.reductionSource,
    Regra: "Sem dano dobrado por Consonância e sem segunda Defesa gratuita.",
  });
  return { character: next, result };
}
export function incorporateLavor(c: TdvCharacter, id: string, cost: 4 | 6, reason: string) {
  const record = c.records.find((r) => r.id === id);
  if (!record || record.kind !== "Lavor") throw new Error("Escolha um Lavor.");
  for (const key of ["Vertente", "Gatilho", "Gesto", "Expressão", "Preço/limite"])
    required(record.fields[key] ?? "", `Complete ${key} antes da incorporação.`);
  required(record.name, "Nomeie o Lavor.");
  if (lavorIncorporated(c, record))
    throw new Error("Este Lavor já possui incorporação registrada.");
  const next = invest(c, { kind: "Lavor", target: record.id, cost, reason, transcendent: false }),
    investment = next.investments.at(-1)!;
  return {
    ...next,
    records: next.records.map((r) =>
      r.id === id ? { ...r, fields: { ...r.fields, Investimento: investment.id } } : r,
    ),
  };
}
export function lavorIncorporated(c: TdvCharacter, record: TdvRecord) {
  return c.investments.some(
    (i) =>
      i.kind === "Lavor" &&
      (i.target === record.id || i.target === record.name || i.id === record.fields.Investimento),
  );
}
export interface ExpressionUse {
  eventId: string;
  recordIds: string[];
  intention: string;
  target: string;
  contributions: string[];
  vertentes: string[];
  pe: number;
  pi: number;
  priceSource: string;
  limitsAcknowledged: boolean;
  sustain: boolean;
  sustainPE: number;
  sustainPI: number;
  exit: string;
  pullEventId?: string;
}
export function prepareExpression(c: TdvCharacter, s: ExpressionUse) {
  required(s.intention, "Declare uma intenção única.");
  required(s.priceSource, "Confirme os preços, gatilhos e limites do texto.");
  if (!s.limitsAcknowledged)
    throw new Error("Confira os gatilhos e os preços de todas as expressões envolvidas.");
  if (!s.recordIds.length || new Set(s.recordIds).size !== s.recordIds.length)
    throw new Error("Escolha expressões distintas.");
  const records = s.recordIds.map((id) => {
    const r = c.records.find((record) => record.id === id);
    if (!r || !["Lavor", "Trama", "Fragmento", "Selo"].includes(r.kind))
      throw new Error("Expressão não encontrada.");
    required(r.name, "Nomeie a expressão.");
    if (r.kind === "Lavor" && !lavorIncorporated(c, r))
      throw new Error("O Lavor ainda é rascunho: incorpore a prática mediante PU antes de usá-la.");
    return r;
  });
  if (records.length > 1) {
    if (records.some((r) => r.kind !== "Lavor"))
      throw new Error(
        "Costura de Malha reúne Lavores; outras relações usam seu procedimento próprio.",
      );
    if (
      s.contributions.length !== records.length ||
      s.vertentes.length !== records.length ||
      s.contributions.some((v) => !v.trim())
    )
      throw new Error("Declare o que cada Lavor contribui e sua Vertente nesta Costura.");
    if (new Set(s.vertentes).size < 2)
      throw new Error("Costura de Malha precisa de práticas de Vertentes diferentes.");
    records.forEach((r, index) => {
      if (
        !VERTENTES.includes(s.vertentes[index] as (typeof VERTENTES)[number]) ||
        !r.fields.Vertente?.toLocaleLowerCase("pt-BR").includes(
          s.vertentes[index].toLocaleLowerCase("pt-BR"),
        )
      )
        throw new Error("A Vertente precisa pertencer ao Lavor.");
    });
  }
  whole(s.pe);
  whole(s.pi);
  whole(s.sustainPE);
  whole(s.sustainPI);
  if (c.resources.pe < s.pe || c.resources.pi < s.pi)
    throw new Error("PE ou PI insuficientes para esta abordagem.");
  if (s.sustain) required(s.exit, "Declare o encerramento ou Relaxamento da sustentação.");
  return records;
}
function attachExpression(c: TdvCharacter, s: ExpressionUse, records: TdvRecord[]) {
  const name = records.map((r) => r.name).join(" + ");
  let next = rest(c, records.length > 1 ? `Costura: ${name}` : `Expressão: ${name}`, {
    Intenção: s.intention,
    Alvo: s.target,
    Contribuições: s.contributions.join("\n"),
    "Custos declarados": `${s.pe} PE; ${s.pi} PI`,
    Limites: s.priceSource,
    Motor: "Um único teste, salvo ações efetivamente distintas.",
  });
  if (s.sustain) {
    if ((next.activeExpressions?.length ?? 0) >= 100)
      throw new Error("Organize as expressões em curso.");
    const active: TdvActiveExpression = {
      id: uid(),
      recordIds: s.recordIds,
      name,
      target: s.target,
      state: "Sustentada",
      sustainPE: s.sustainPE,
      sustainPI: s.sustainPI,
      lastWindow: "",
      signature: records
        .map((r) => r.fields.Assinatura ?? "")
        .filter(Boolean)
        .join("; "),
      reflux: records
        .map((r) => r.fields.Refluxo ?? "")
        .filter(Boolean)
        .join("; "),
      exit: s.exit,
      ...(s.pullEventId ? { pullEventId: s.pullEventId } : {}),
      paidConsequences: s.pullEventId ? [s.pullEventId] : [],
    };
    next = { ...next, activeExpressions: [...(next.activeExpressions ?? []), active] };
  }
  return next;
}
export function expressDirectly(c: TdvCharacter, s: ExpressionUse) {
  const records = prepareExpression(c, s);
  return attachExpression(
    payDeclared(c, { id: s.eventId, source: s.priceSource, pe: s.pe, pi: s.pi }),
    s,
    records,
  );
}
export function resolveExpressionTest(
  c: TdvCharacter,
  s: ExpressionUse,
  request: TestRequest,
  random: () => number = Math.random,
) {
  const records = prepareExpression(c, s);
  const rolled = resolveTest(
    c,
    { ...request, costs: { eventId: s.eventId, source: s.priceSource, pe: s.pe, pi: s.pi } },
    random,
  );
  return {
    ...rolled,
    character: rolled.result.success
      ? attachExpression(rolled.character, s, records)
      : rolled.character,
  };
}
export function sustainExpression(c: TdvCharacter, id: string, window: string, source: string) {
  const active = c.activeExpressions?.find((e) => e.id === id);
  if (!active || !["Sustentada", "Em curso"].includes(active.state))
    throw new Error("A expressão não está em curso.");
  required(window, "Identifique uma nova janela real de sustentação.");
  required(source, "Registre o que continua oferecendo sustentação.");
  if (active.lastWindow === window.trim() || active.paidWindows?.includes(window.trim()))
    throw new Error("A sustentação desta janela já foi paga.");
  if ((active.paidWindows?.length ?? 0) >= 200)
    throw new Error("Organize a memória da sustentação antes de novas janelas.");
  const next = payDeclared(c, {
    id: `${id}:${window.trim()}`,
    source,
    pe: active.sustainPE,
    pi: active.sustainPI,
  });
  return {
    ...next,
    activeExpressions: next.activeExpressions?.map((e) =>
      e.id === id
        ? {
            ...e,
            lastWindow: window.trim(),
            paidWindows: [...(e.paidWindows ?? []), window.trim()],
          }
        : e,
    ),
  };
}
export function relaxExpression(c: TdvCharacter, id: string, reason: string, interrupted = false) {
  const active = c.activeExpressions?.find((e) => e.id === id);
  if (!active || !["Sustentada", "Em curso"].includes(active.state))
    throw new Error("A expressão já foi encerrada.");
  required(reason, "Registre o que encerrou a continuidade.");
  return rest(
    {
      ...c,
      activeExpressions: c.activeExpressions?.map((e) =>
        e.id === id ? { ...e, state: interrupted ? "Interrompida" : "Relaxada" } : e,
      ),
    },
    `Encerramento: ${active.name}`,
    {
      Causa: reason,
      Relaxamento: active.exit,
      Assinatura: active.signature,
      Regra: "Sem reembolso automático; Refluxo só se concretamente produzido.",
    },
  );
}
export function applyReflux(
  c: TdvCharacter,
  id: string,
  event: { id: string; source: string; pe: number; pi: number },
  effect: string,
) {
  const active = c.activeExpressions?.find((e) => e.id === id);
  if (!active) throw new Error("Expressão não encontrada.");
  required(effect, "Declare o Refluxo específico desta relação.");
  if (active.paidConsequences.length >= 100)
    throw new Error("Organize a memória de Refluxos antes de novos acontecimentos.");
  if (active.paidConsequences.includes(event.id) || active.pullEventId === event.id)
    throw new Error("Essa consequência já foi aplicada como Puxagem ou Refluxo.");
  const next = payDeclared(c, event);
  return rest(
    {
      ...next,
      activeExpressions: next.activeExpressions?.map((e) =>
        e.id === id ? { ...e, paidConsequences: [...e.paidConsequences, event.id] } : e,
      ),
    },
    `Refluxo: ${active.name}`,
    {
      Origem: event.source,
      Consequência: effect,
      Assinatura: active.signature,
      Regra: "Sem tabela universal e sem cobrar novamente a mesma Puxagem.",
    },
  );
}
export function triggerPreparation(c: TdvCharacter, id: string, effect: string, consumed: boolean) {
  const prep = c.records.find((r) => r.id === id && r.kind === "Preparo");
  if (!prep) throw new Error("Preparo não encontrado.");
  if (["Consumido", "Invalidado"].includes(prep.fields.Estado))
    throw new Error("O Preparo não está disponível.");
  for (const field of ["Gesto", "Gatilho", "Mudança permitida", "Continuidade e consumo"])
    required(prep.fields[field] ?? "", `Declare ${field} do Preparo.`);
  required(effect, "Registre o gatilho ocorrido e a mudança efetiva.");
  return rest(
    {
      ...c,
      records: c.records.map((r) =>
        r.id === id
          ? { ...r, fields: { ...r.fields, Estado: consumed ? "Consumido" : "Alterado" } }
          : r,
      ),
    },
    `Preparo: ${prep.name}`,
    {
      Gatilho: prep.fields.Gatilho,
      Efeito: effect,
      Regra: "Não concede ação gratuita, bônus cumulativo ou retrospectiva ilimitada.",
    },
  );
}
export function repairEquipment(
  c: TdvCharacter,
  id: string,
  material: string,
  restoredFunction: string,
  signature: string,
) {
  const item = c.records.find(
    (r) => r.id === id && ["Arma", "Equipamento", "Fragmento"].includes(r.kind),
  );
  if (!item) throw new Error("Escolha um objeto do repertório.");
  required(material, "Registre o reparo material realizado.");
  return rest(
    {
      ...c,
      records: c.records.map((r) =>
        r.id === id
          ? {
              ...r,
              fields: {
                ...r.fields,
                Integridade: restoredFunction.trim() ? "Apto" : "Danificado",
                "Reparo realizado": material,
                "Função reconstituída": restoredFunction,
                "Assinatura atual":
                  signature || r.fields["Assinatura atual"] || r.fields.Assinatura || "",
              },
            }
          : r,
      ),
    },
    `Reparo: ${item.name}`,
    {
      Matéria: material,
      Função: restoredFunction || "Ainda não reconstituída",
      Assinatura: signature,
      Regra: "Reparar matéria não recompõe automaticamente função ou Assinatura.",
    },
  );
}
export function updateReputation(c: TdvCharacter, id: string, weight: number, event: string) {
  const record = c.records.find((r) => r.id === id && r.kind === "Reputação");
  if (!record) throw new Error("Reputação não encontrada.");
  if (!Number.isInteger(weight) || weight < 0 || weight > 4)
    throw new Error("Peso da rede varia de 0 a 4.");
  required(record.fields.Rede ?? "", "Identifique a rede que reconhece a personagem.");
  required(event, "Registre o acontecimento que mudou o reconhecimento.");
  return rest(
    {
      ...c,
      records: c.records.map((r) =>
        r.id === id ? { ...r, fields: { ...r.fields, Peso: String(weight) } } : r,
      ),
    },
    `Reconhecimento: ${record.name}`,
    {
      Rede: record.fields.Rede,
      Peso: `${weight}: ${REPUTATION_WEIGHT[weight]}`,
      Acontecimento: event,
      Regra: "Peso não concede bônus automático nem segundo Rank.",
    },
  );
}
