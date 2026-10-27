import { describe, it, expect } from "vitest";
import {
  newTdvCharacter,
  finishCreation,
  addMilestone,
  prepareTest,
  resolveTest,
  probabilityProfile,
  constitution,
  type TestRequest,
} from "./tdv2";
import {
  applyPhysicalConsequence,
  configureGuard,
  opposedRead,
  payDeclared,
  recordOutcome,
  activateLink,
  incorporateLavor,
  expressDirectly,
  resolveExpressionTest,
  sustainExpression,
  relaxExpression,
  applyReflux,
  repairEquipment,
  updateReputation,
  type ExpressionUse,
  type PhysicalConsequence,
} from "./tdv2-play";
import { newOperation, registerOperationStep, type OperationStep } from "./tdv2-operations";
function ready() {
  let c = newTdvCharacter();
  Object.assign(c.face, {
    origin: "Cais",
    occupation: "Registradora",
    conviction: "Preservar",
    limit: "Não abandonar",
  });
  c.face.anchor.detail = "A promessa";
  Object.assign(c.face.links[0], { node: "Elen", nature: "Confiança" });
  c = finishCreation(c);
  return c;
}
const request: TestRequest = {
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
};
const context = {
  intention: "Abrir o arquivo",
  approach: "Ler a relação entre as travas",
  change: "Primeira abordagem",
  point: "O testemunho",
  risk: true,
};
const use: ExpressionUse = {
  eventId: "use-a",
  recordIds: ["l1", "l2"],
  intention: "Sustentar a passagem",
  target: "O portão",
  contributions: ["Sustentar o corpo", "Redistribuir a trajetória"],
  vertentes: ["Corpórea", "Cinética"],
  pe: 2,
  pi: 1,
  priceSource: "Preços expressos dos dois Lavores",
  limitsAcknowledged: true,
  sustain: true,
  sustainPE: 1,
  sustainPI: 0,
  exit: "Liberar o apoio quando todos passarem",
  pullEventId: "pull-a",
};
function repertoire() {
  let c = ready();
  for (let i = 0; i < 4; i++) c = addMilestone(c, `Acontecimento ${i}`, `Incorporação ${i}`);
  c.records = [
    {
      id: "l1",
      kind: "Lavor",
      name: "Sustentar",
      fields: {
        Vertente: "Corpórea",
        Gatilho: "Passagem ameaçada",
        Gesto: "Firmar o corpo",
        Expressão: "Preservar acesso",
        "Preço/limite": "1 PE",
      },
    },
    {
      id: "l2",
      kind: "Lavor",
      name: "Redistribuir",
      fields: {
        Vertente: "Cinética",
        Gatilho: "Objeto em movimento",
        Gesto: "Redirecionar",
        Expressão: "Mudar trajetória",
        "Preço/limite": "1 PE e 1 PI",
      },
    },
  ];
  c = incorporateLavor(c, "l1", 4, "Aprendi a sustentar");
  return incorporateLavor(c, "l2", 4, "Aprendi a redistribuir");
}
const physical: PhysicalConsequence = {
  intention: "Ferir",
  prumo: 6,
  tento: 6,
  defense: "Guarda",
  damage: 2,
  damageSource: "Lâmina comum",
  reduction: 0,
  reductionSource: "",
  blocked: false,
  effect: "Ferir com acesso à cobertura",
  extension: "",
  extensionSource: "Margem elevada",
  extensionRule: "",
  brink: false,
  window: "",
};
describe("TdV II operational procedures", () => {
  it("uses only protagonist Prumo and helper Tento, without an extra die or automatic bonus", () => {
    const c = ready(),
      r = { ...request, helper: { name: "Elen", grade: 3, contribution: "Orientar o mecanismo" } };
    expect(prepareTest(c, r)).toMatchObject({ prumo: 10, tento: 10, cost: 0 });
    let calls = 0;
    resolveTest(c, r, () => {
      calls++;
      return 0.5;
    });
    expect(calls).toBe(2);
  });
  it("prevents repetition until a relevant fictional change and preserves the original roll", () => {
    const rolled = resolveTest(ready(), { ...request, context }, () => 0.5);
    expect(() => prepareTest(rolled.character, { ...request, context })).toThrow(
      "mesma intervenção",
    );
    expect(() =>
      prepareTest(rolled.character, {
        ...request,
        context: { ...context, change: "Elen revelou outro acesso" },
      }),
    ).not.toThrow();
    expect(() =>
      prepareTest(ready(), { ...request, context: { ...context, risk: false } }),
    ).toThrow("ficção");
    expect(() =>
      recordOutcome(rolled.character, rolled.character.scene.tests![0].id, {
        principal: "A trava muda",
        opening: "Acesso",
        trace: "",
        devolution: "",
        permanence: "",
        redobra: "Preservar outro testemunho",
        support: "",
      }),
    ).toThrow("continuidade");
  });
  it("adds declared costs once to Forçar and never grants a mana waiver at zero PE", () => {
    const c = ready(),
      r = {
        ...request,
        force: "Prumo" as const,
        costs: { eventId: "x", source: "Trama escrita", pe: 2, pi: 1 },
      };
    const rolled = resolveTest(c, r, () => 0.5);
    expect(rolled.character.resources).toEqual({ pv: 10, pi: 10, pe: 7 });
    expect(() => prepareTest(rolled.character, r)).toThrow("pago");
    expect(() =>
      prepareTest(
        { ...c, resources: { ...c.resources, pe: 0 } },
        { ...r, counterpart: "Condição Grave" },
      ),
    ).toThrow("Não há");
  });
  it("keeps static defense singular, caps ordinary cover and treats total cover as access", () => {
    const c = ready();
    expect(() => configureGuard(c, 3, "Parede", "", 0, "", false)).toThrow("+2");
    expect(() => configureGuard(c, 2, "Parede", "Sem linha de ataque", 0, "", false)).toThrow(
      "total",
    );
    expect(constitution(configureGuard(c, 1, "Escudo", "", 0, "", false)).guard).toBe(13);
    expect(() => applyPhysicalConsequence(c, { ...physical, blocked: true })).toThrow("impedida");
    expect(() =>
      applyPhysicalConsequence({ ...c, guard: { ...c.guard, broken: true } }, physical),
    ).toThrow("ausente");
  });
  it("does not double consonant damage, apply universal armor RD or stack maneuver damage", () => {
    const c = ready(),
      out = applyPhysicalConsequence(c, physical);
    expect(out.result.critical).toBe(true);
    expect(out.character.resources.pv).toBe(8);
    expect(() => applyPhysicalConsequence(c, { ...physical, reduction: 1 })).toThrow(
      "RD universal",
    );
    expect(() => applyPhysicalConsequence(c, { ...physical, intention: "Desarmar" })).toThrow(
      "0 PV",
    );
    const broken = applyPhysicalConsequence(c, {
      ...physical,
      intention: "Quebrar Guarda",
      damage: 0,
    }).character;
    expect(constitution(broken).guard).toBe(null);
    expect(constitution(broken).matrices.Cadência).toBe(3);
  });
  it("uses explicit brink windows without negative PV or automatic death", () => {
    const c = {
      ...ready(),
      resources: { pv: 0, pi: 11, pe: 10 },
      critical: "Incapacitada" as const,
    };
    expect(() => applyPhysicalConsequence(c, { ...physical, brink: true })).toThrow("janela");
    const next = applyPhysicalConsequence(c, {
      ...physical,
      brink: true,
      window: "Até a próxima intervenção de Elen",
    }).character;
    expect(next.resources.pv).toBe(0);
    expect(next.critical).toBe("À Beira");
  });
  it("resolves contested ties and critical precedence without a second tiebreaker", () => {
    expect(
      opposedRead(
        { prumo: 5, tento: 5, permission: true },
        { prumo: 6, tento: 4, permission: true },
      ).winner,
    ).toBe("Empate");
    const critical = opposedRead(
      { prumo: 1, tento: 1, permission: true },
      { prumo: 2, tento: 1, permission: true },
    );
    expect(critical.winner).toBe("B");
    expect(
      opposedRead(
        { prumo: 8, tento: 8, permission: false },
        { prumo: 3, tento: 2, permission: true },
      ).winner,
    ).toBe("B");
  });
  it("does not turn link use or reputation into a numerical bonus", () => {
    const c = ready(),
      linked = activateLink(
        c,
        c.face.links[0].id,
        "Cobrar",
        "Acesso ao cais",
        "Assumo a reciprocidade",
        "Tensionado",
      );
    expect(linked.resources).toEqual(c.resources);
    expect(linked.face.links[0].state).toBe("Tensionado");
    linked.records.push({
      id: "rep",
      kind: "Reputação",
      name: "Cais",
      fields: { Rede: "Trabalhadores", Imagem: "Testemunha", Peso: "1", Cobrança: "Comparecer" },
    });
    const next = updateReputation(linked, "rep", 3, "Preservei o arquivo");
    expect(next.records.find((r) => r.id === "rep")?.fields.Peso).toBe("3");
    expect(constitution(next).matrices).toEqual(constitution(c).matrices);
  });
  it("incorporates Lavores through actual PU before enabling their use", () => {
    const c = repertoire();
    expect(constitution(c).pu).toBe(0);
    expect(c.investments).toHaveLength(2);
    const unincorporated = { ...c, investments: [] };
    expect(() => expressDirectly(unincorporated, use)).toThrow("rascunho");
  });
  it("costura pays both prices and uses a single test, never a sum of extra dice", () => {
    const c = repertoire();
    let calls = 0;
    const rolled = resolveExpressionTest(c, use, { ...request, dt: 2, force: "Prumo" }, () => {
      calls++;
      return 0.6;
    });
    expect(calls).toBe(2);
    expect(rolled.character.resources).toEqual({ pv: 10, pi: 10, pe: 7 });
    expect(rolled.character.activeExpressions).toHaveLength(1);
    expect(() => expressDirectly(c, { ...use, vertentes: ["Corpórea", "Corpórea"] })).toThrow(
      "Vertentes diferentes",
    );
  });
  it("sustains by declared windows without periodic rerolls and ends without refunds", () => {
    const c = expressDirectly(repertoire(), use),
      id = c.activeExpressions![0].id;
    const next = sustainExpression(c, id, "Após o primeiro avanço", "Continuo apoiando o portão");
    expect(next.resources.pe).toBe(7);
    expect(() => sustainExpression(next, id, "Após o primeiro avanço", "Continuo")).toThrow(
      "já foi paga",
    );
    const relaxed = relaxExpression(next, id, "Todos atravessaram");
    expect(relaxed.resources).toEqual(next.resources);
    expect(relaxed.activeExpressions![0].state).toBe("Relaxada");
  });
  it("does not repay an older sustaining window after another window or scene reset", () => {
    const c = expressDirectly(repertoire(), use),
      id = c.activeExpressions![0].id;
    const a = sustainExpression(c, id, "First window", "Still supported");
    const b = sustainExpression(a, id, "Second window", "Still supported");
    expect(() =>
      sustainExpression(
        { ...b, scene: { ...b.scene, paidEvents: [] } },
        id,
        "First window",
        "Again",
      ),
    ).toThrow("já foi paga");
  });
  it("rejects the same physical event after the persisted sheet is reloaded", () => {
    const c = ready(),
      event = { ...physical, prumo: 10, tento: 10, eventId: "original-attack" };
    const next = applyPhysicalConsequence(c, event).character;
    expect(() => applyPhysicalConsequence(JSON.parse(JSON.stringify(next)), event)).toThrow(
      "já foi aplicada",
    );
  });
  it("never charges the same consequence as both Puxagem and Refluxo", () => {
    const c = expressDirectly(repertoire(), use),
      id = c.activeExpressions![0].id;
    expect(() =>
      applyReflux(
        c,
        id,
        { id: "pull-a", source: "Mesmo deslocamento", pe: 0, pi: 1 },
        "Outra etiqueta",
      ),
    ).toThrow("Puxagem");
    const next = applyReflux(
      c,
      id,
      { id: "reflux-b", source: "Uma ruptura independente", pe: 0, pi: 1 },
      "A Assinatura fica exposta",
    );
    expect(next.resources.pi).toBe(c.resources.pi - 1);
  });
  it("repairs matter without silently restoring function or Signature", () => {
    const c = ready();
    c.records.push({
      id: "gear",
      kind: "Equipamento",
      name: "Lente",
      fields: { Integridade: "Inutilizado", Assinatura: "Eco do cais" },
    });
    const repaired = repairEquipment(c, "gear", "Recoloquei o vidro", "", "");
    expect(repaired.records.find((r) => r.id === "gear")?.fields.Integridade).toBe("Danificado");
  });
  it("keeps progress and pressure distinct, preserves earned progress after a failed step", () => {
    let op = newOperation("Prolongada");
    op.objective = "Abrir a passagem";
    const step: OperationStep = {
      stageIds: [op.stages[0].id],
      intention: "Criar acesso",
      approach: "Soltar a trava",
      change: "Primeira frente",
      evidence: "A trava abriu",
      rest: "O acesso permanece",
      participants: "Iria",
      resolution: "Teste",
      prumo: 8,
      tento: 6,
      broadens: false,
    };
    op = registerOperationStep(op, step);
    expect(op.stages[0].done).toBe(true);
    op = registerOperationStep(op, {
      ...step,
      stageIds: [op.stages[1].id],
      change: "Outra frente",
      prumo: 1,
      tento: 1,
    });
    expect(op.stages[0].done).toBe(true);
    expect(op.stages[1].done).toBe(false);
    expect(op.pressureId).toBe("");
    expect(() => registerOperationStep(op, { ...step, stageIds: [op.stages[2].id] })).toThrow(
      "repita",
    );
  });
  it("only advances a second prolonged stage if elevated reach really covers both", () => {
    const op = { ...newOperation("Prolongada"), objective: "Abrir passagem" };
    const step: OperationStep = {
      stageIds: op.stages.slice(0, 2).map((s) => s.id),
      intention: "Duas frentes",
      approach: "Reorganizar ambas",
      change: "Agora",
      evidence: "Ambas mudaram",
      rest: "",
      participants: "Iria",
      resolution: "Teste",
      prumo: 8,
      tento: 8,
      broadens: false,
    };
    expect(() => registerOperationStep(op, step)).toThrow("adicional");
    expect(
      registerOperationStep(op, { ...step, broadens: true }).stages.filter((s) => s.done),
    ).toHaveLength(2);
  });
  it("can resolve conceptual channeling movements in one gesture without five mandatory rolls", () => {
    const op = { ...newOperation("Canalização"), objective: "Escutar a janela" };
    const next = registerOperationStep(op, {
      stageIds: op.stages.map((s) => s.id),
      intention: "Escutar",
      approach: "Tecer a relação acessível",
      change: "A janela foi preparada",
      evidence: "Acesso seguro e expressão coerente",
      rest: "A Assinatura persiste",
      participants: "Iria",
      resolution: "Ficção direta",
      prumo: 1,
      tento: 1,
      broadens: false,
    });
    expect(next.stages.every((s) => s.done)).toBe(true);
    expect(next.history).toHaveLength(1);
  });
  it("computes exact two-die probabilities including the double-one exception", () => {
    expect(probabilityProfile(4, 4, 2)).toMatchObject({
      success: 15 / 16,
      criticalFailure: 1 / 16,
      total: 16,
    });
    expect(probabilityProfile(4, 4, 8).critical).toBe(1 / 16);
  });
  it("rejects double payment without mutating the available resources", () => {
    const c = payDeclared(ready(), { id: "one", source: "Preço escrito", pe: 2, pi: 0 });
    expect(() => payDeclared(c, { id: "one", source: "Mesmo preço", pe: 2, pi: 0 })).toThrow(
      "já foi pago",
    );
    expect(c.resources.pe).toBe(8);
  });
});
