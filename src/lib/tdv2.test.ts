import { describe, it, expect } from "vitest";
import {
  ALINHAVOS,
  anchor,
  resettle,
  stabilize,
  addMilestone,
  addTension,
  constitution,
  contested,
  creationErrors,
  finishCreation,
  invest,
  newTdvCharacter,
  prepareTest,
  readTest,
  recover,
  resolveTest,
  setResource,
  tdv2CharacterSchema,
} from "./tdv2";
import {
  newTdvMaster,
  nextRound,
  pressureChange,
  spendImpulse,
  spendResponse,
  orderInitiative,
} from "./tdv2-master";
function ready() {
  const c = newTdvCharacter();
  c.face.origin = "Cais";
  c.face.occupation = "Registradora";
  c.face.conviction = "Preservar testemunhos";
  c.face.limit = "Não entregar inocentes";
  c.face.anchor.detail = "A promessa a Elen";
  c.face.links[0].node = "Elen";
  c.face.links[0].nature = "Confiança";
  return finishCreation(c);
}
const request = {
  matrix: "Nexo" as const,
  alinhavo: "Investigação",
  dt: 10,
  prumoPro: 0,
  prumoDes: 0,
  tentoPro: 0,
  tentoDes: 0,
  force: "" as const,
  extraordinary: false,
  counterpart: "",
};
describe("TdV II canonical character and motor", () => {
  it("reproduces the official creation example without legacy rank or resources", () => {
    const c = ready(),
      s = constitution(c);
    expect(s.maximums).toEqual({ pv: 10, pi: 11, pe: 10 });
    expect(s.defenses).toEqual({ Resistência: 10, Evasão: 12, Lucidez: 11, Firmeza: 11 });
    expect(s.guard).toBe(12);
    expect(ALINHAVOS).toHaveLength(21);
    expect(creationErrors(c)).toEqual([]);
    expect(s.pu).toBe(0);
    expect(tdv2CharacterSchema.parse(c)).toEqual(c);
  });
  it("requires real face, an established anchor and the 2/4 training package", () => {
    expect(() => finishCreation(newTdvCharacter())).toThrow();
    const c = ready();
    c.alinhavos.Selagem = 2;
    expect(creationErrors(c).join(" ")).toContain("dois Alinhavos");
    c.face.anchor.pillar = "Marca";
    expect(creationErrors(c).join(" ")).toContain("Marca");
  });
  it.each([
    [7, 3, 10, true, "Êxito", 4],
    [4, 4, 10, false, "Quase", 0],
    [5, 5, 10, true, "Êxito", 0],
    [1, 1, 2, false, "Falha Crítica", 0],
    [10, 8, 10, true, "Êxito excepcional", 2],
  ])("reads two Fios %i/%i at DT %i", (a, b, dt, success, quality, desvio) => {
    const r = readTest(a, b, dt);
    expect(r.success).toBe(success);
    expect(r.quality).toBe(quality);
    expect(r.desvio).toBe(desvio);
    expect(r.ascendente).toBe(Math.max(a, b));
    expect(r.retorno).toBe(Math.min(a, b));
    expect(r.critical).toBe(success && a === b);
  });
  it("keeps opposing modifiers per thread and limits the net displacement", () => {
    const c = ready();
    expect(prepareTest(c, { ...request, prumoPro: 20, prumoDes: 1, tentoDes: 9 })).toMatchObject({
      prumo: 12,
      tento: 6,
    });
    expect(prepareTest(c, { ...request, prumoPro: 2, prumoDes: 2 })).toMatchObject({
      prumo: 10,
      tento: 8,
    });
  });
  it("never grants ordinary d20 and charges Forçar before rolling", () => {
    const c = ready();
    c.matrices.Nexo = 4;
    expect(prepareTest(c, { ...request, prumoPro: 1 }).prumo).toBe(12);
    expect(() => prepareTest(c, { ...request, force: "Prumo" })).toThrow("transcendente");
    expect(prepareTest(c, { ...request, force: "Prumo", extraordinary: true })).toMatchObject({
      prumo: 20,
      cost: 2,
    });
    c.resources.pe = 1;
    expect(() => prepareTest(c, { ...request, force: "Prumo", extraordinary: true })).toThrow(
      "insuficiente",
    );
  });
  it("allows at most one forced test at zero PE per scene and keeps PE nonnegative", () => {
    const c = ready();
    c.resources.pe = 0;
    const r = {
      ...request,
      force: "Prumo" as const,
      counterpart: "Condição Grave de exaustão acordada",
    };
    const rolled = resolveTest(c, r, () => 0);
    expect(rolled.character.resources.pe).toBe(0);
    expect(rolled.character.scene.forcedAtZero).toBe(true);
    expect(rolled.character.scene.shaken).toEqual(["Nexo"]);
    expect(() => prepareTest(rolled.character, r)).toThrow("uma vez por cena");
  });
  it("prioritizes double one and keeps ties as the previous situation", () => {
    expect(contested(readTest(5, 5, 10), readTest(10, 1, 10))).toBe("B");
    expect(contested(readTest(5, 5, 10), readTest(6, 4, 10))).toBe("Empate");
    expect(contested(readTest(1, 1, 2), readTest(1, 2, 2))).toBe("B");
  });
  it("uses 20 milestones and the same scarce 40-PU reserve for every investment", () => {
    let c = ready();
    for (let i = 0; i < 20; i++) c = addMilestone(c, `Marco ${i}`, `Mudança ${i}`);
    expect(constitution(c)).toMatchObject({ development: 100, pu: 40 });
    expect(() => addMilestone(c, "Extra", "Extra")).toThrow();
    c = invest(c, {
      kind: "Matriz",
      target: "Nexo",
      cost: 6,
      reason: "Aprendizado incorporado",
      transcendent: false,
    });
    expect(constitution(c).matrices.Nexo).toBe(4);
    expect(() =>
      invest(c, {
        kind: "Matriz",
        target: "Nexo",
        cost: 7,
        reason: "Somente prática",
        transcendent: false,
      }),
    ).toThrow();
    expect(
      constitution(
        invest(c, {
          kind: "Matriz",
          target: "Nexo",
          cost: 7,
          reason: "Marco transcendente",
          transcendent: true,
        }),
      ).pu,
    ).toBe(27);
  });
  it("rejects overspending, unrecorded incorporation and false Lavor prices", () => {
    const c = ready();
    expect(() =>
      invest(c, {
        kind: "Lavor",
        target: "Segurar a Passagem",
        cost: 4,
        reason: "Treino",
        transcendent: false,
      }),
    ).toThrow("insuficientes");
    const earned = addMilestone(addMilestone(c, "A", "A"), "B", "B");
    expect(() =>
      invest(earned, { kind: "Lavor", target: "X", cost: 3, reason: "X", transcendent: false }),
    ).toThrow("4 ou 6");
  });
  it("moves Equilíbrio by one at the tension threshold and discards excess", () => {
    const c = { ...ready(), equilibrium: 10, tension: 3 };
    expect(addTension(c, 2)).toMatchObject({ equilibrium: 10, tension: 0 });
    expect(addTension({ ...c, equilibrium: -3, tension: -2 }, 1)).toMatchObject({
      equilibrium: -3,
      tension: -1,
    });
    expect(addTension({ ...c, equilibrium: 0, tension: -3 }, -2)).toMatchObject({
      equilibrium: -1,
      tension: 0,
    });
  });
  it("bounds resources and applies canonical recovery without removing causes", () => {
    let c = ready();
    c.resources = { pv: 1, pi: 1, pe: 0 };
    c.face.anchor.shaken = true;
    c = recover(c, "Pausa breve", true, false, "Depois da fuga");
    expect(c.resources).toEqual({ pv: 3, pi: 2, pe: 2 });
    expect(c.face.anchor.shaken).toBe(true);
    expect(() => recover(c, "Pausa breve", true, false, "Depois da fuga")).toThrow();
    c = recover(c, "Recuperação plena", true, false, "Após uma semana protegida");
    expect(c.resources).toEqual({ pv: 10, pi: 2, pe: 10 });
    expect(
      recover(c, "Recuperação plena", true, true, "Reconstrução da continuidade").resources.pi,
    ).toBe(11);
    expect(setResource(c, "pv", -1).critical).toBe("Incapacitada");
    expect(() =>
      recover({ ...c, critical: "Morta" }, "Recuperação plena", true, true, "Outra semana"),
    ).toThrow("morte");
  });
});
describe("TdV II master scene economy", () => {
  it("requires a cause for pressure and saturates at rupture without a second clock", () => {
    const s = newTdvMaster();
    s.pressures = [
      {
        id: "p",
        name: "Arquivo em chamas",
        value: 3,
        cause: "",
        rupture: "Perda do arquivo",
        history: [],
      },
    ];
    expect(() => pressureChange(s, "p", 1, "")).toThrow();
    expect(pressureChange(s, "p", 2, "O teto cede").pressures[0]).toMatchObject({
      value: 4,
      history: ["3 → 4: O teto cede"],
    });
  });
  it("spends 2 impulses or one response once, then resets without accumulating", () => {
    let s = newTdvMaster();
    s.participants = [
      {
        id: "p",
        sheetId: "s",
        name: "Iria",
        cadence: 3,
        score: 8,
        impulses: 2,
        response: true,
        position: "Disputada",
      },
    ];
    s = spendImpulse(s, "p", 2);
    expect(() => spendImpulse(s, "p", 1)).toThrow();
    s = spendResponse(s, "p");
    expect(() => spendResponse(s, "p")).toThrow();
    expect(nextRound(s).participants[0]).toMatchObject({ impulses: 2, response: true });
  });
  it("orders contested initiative by Enlace, then Cadência, then stable fictional order", () => {
    const s = newTdvMaster();
    s.participants = [
      {
        id: "a",
        sheetId: "a",
        name: "A",
        cadence: 2,
        score: 12,
        impulses: 2,
        response: true,
        position: "Disputada",
      },
      {
        id: "b",
        sheetId: "b",
        name: "B",
        cadence: 3,
        score: 12,
        impulses: 2,
        response: true,
        position: "Disputada",
      },
    ];
    expect(orderInitiative(s).participants.map((p) => p.id)).toEqual(["b", "a"]);
  });
});

describe("Fictional care and anchor continuity", () => {
  it("requires a consequence, preserves it and prevents repeated anchoring before real resettlement", () => {
    const c = ready();
    expect(() => anchor(c, "Sustentar", "", "Permanece")).toThrow();
    const used = anchor(
      c,
      "Redirecionar",
      "Perder o testemunho",
      "O testemunho fica retido com Elen",
    );
    expect(used.face.anchor.shaken).toBe(true);
    expect(used.resources).toEqual(c.resources);
    expect(used.records[0].fields.Consequência).toBe("Perder o testemunho");
    expect(() => anchor(used, "Sustentar", "Outra", "Outra")).toThrow();
    expect(() => resettle(used, "")).toThrow();
    expect(resettle(used, "Retornar ao cais e cumprir a promessa").face.anchor.shaken).toBe(false);
  });
  it("does not conflate healing, stabilizing, removing conditions and reversing death", () => {
    const down = setResource(ready(), "pv", 0);
    expect(stabilize(down, "Estancar a hemorragia").critical).toBe("Incapacitada");
    const healed = recover(down, "Pausa breve", true, false, "Após o resgate");
    expect(healed.critical).toBe("Incapacitada");
    expect(
      stabilize(healed, "A ferida foi tratada e a personagem retomou a consciência").critical,
    ).toBe("Ativa");
    expect(() => stabilize({ ...healed, critical: "Morta" }, "Cuidado")).toThrow();
  });
});
