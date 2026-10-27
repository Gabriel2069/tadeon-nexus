import { operationSchema } from "./tdv2-operations";
import { z } from "zod";
import { POSITIONS, uid } from "./tdv2";
const text = z.string().max(12000);
export const tdvMasterSchema = z.object({
  version: z.literal(2),
  title: text,
  objective: text,
  oppositionGoal: text,
  endCondition: text,
  position: text,
  urgency: text,
  rest: text,
  round: z.number().int().min(1),
  pressures: z
    .array(
      z.object({
        id: z.string(),
        name: text,
        value: z.number().int().min(0).max(4),
        cause: text,
        rupture: text,
        history: z.array(text).max(200),
      }),
    )
    .max(100),
  participants: z
    .array(
      z.object({
        id: z.string(),
        sheetId: z.string(),
        name: text,
        cadence: z.number().int().min(0).max(5),
        score: z.number().int().nullable(),
        impulses: z.number().int().min(0).max(2),
        response: z.boolean(),
        position: z.enum(POSITIONS),
      }),
    )
    .max(100),
  opposition: z
    .array(
      z.object({
        id: z.string(),
        kind: z.enum(["Figurante", "Adversário", "Ameaça"]),
        name: text,
        magnitude: z.number().int().min(0).max(4),
        fields: z.record(z.string(), text),
      }),
    )
    .max(200),
  investigation: z.object({
    question: text,
    hypothesis: text,
    contradiction: text,
    intervention: text,
    clues: z
      .array(
        z.object({
          id: z.string(),
          name: text,
          content: text,
          fundamental: z.boolean(),
          deep: z.boolean(),
          revealed: z.boolean(),
          relations: text,
        }),
      )
      .max(200),
  }),
  seals: z
    .array(z.object({ id: z.string(), name: text, fields: z.record(z.string(), text) }))
    .max(100),
  notes: text,
  operations: z.array(operationSchema).max(50).optional(),
  tabletopSceneId: z.string().uuid().or(z.literal("")).optional(),
});
export type TdvMasterState = z.infer<typeof tdvMasterSchema>;
export function newTdvMaster(): TdvMasterState {
  return {
    version: 2,
    title: "",
    objective: "",
    oppositionGoal: "",
    endCondition: "",
    position: "",
    urgency: "",
    rest: "",
    round: 1,
    pressures: [],
    participants: [],
    opposition: [],
    investigation: { question: "", hypothesis: "", contradiction: "", intervention: "", clues: [] },
    seals: [],
    notes: "",
  };
}
export function pressureChange(
  state: TdvMasterState,
  id: string,
  delta: number,
  cause: string,
): TdvMasterState {
  if (!cause.trim())
    throw new Error(
      "Toda alteração de Pressão precisa de um acontecimento ou intervenção registrados.",
    );
  return {
    ...state,
    pressures: state.pressures.map((p) =>
      p.id === id
        ? {
            ...p,
            value: Math.max(0, Math.min(4, p.value + Math.trunc(delta))),
            cause,
            history: [
              ...p.history,
              `${p.value} → ${Math.max(0, Math.min(4, p.value + Math.trunc(delta)))}: ${cause}`,
            ].slice(-200),
          }
        : p,
    ),
  };
}
export function spendImpulse(state: TdvMasterState, id: string, cost: 1 | 2): TdvMasterState {
  return {
    ...state,
    participants: state.participants.map((p) => {
      if (p.id !== id) return p;
      if (p.impulses < cost) throw new Error("Impulsos insuficientes nesta rodada.");
      return { ...p, impulses: p.impulses - cost };
    }),
  };
}
export function spendResponse(state: TdvMasterState, id: string): TdvMasterState {
  return {
    ...state,
    participants: state.participants.map((p) => {
      if (p.id !== id) return p;
      if (!p.response) throw new Error("A Resposta da rodada já foi utilizada.");
      return { ...p, response: false };
    }),
  };
}
export function nextRound(state: TdvMasterState): TdvMasterState {
  return {
    ...state,
    round: state.round + 1,
    participants: state.participants.map((p) => ({ ...p, impulses: 2, response: true })),
  };
}
export function orderInitiative(state: TdvMasterState): TdvMasterState {
  return {
    ...state,
    participants: state.participants
      .map((p, index) => ({ p, index }))
      .sort(
        (a, b) =>
          (b.p.score ?? -1) - (a.p.score ?? -1) || b.p.cadence - a.p.cadence || a.index - b.index,
      )
      .map((x) => x.p),
  };
}
export const OPPOSITION_FIELDS = [
  "Intenção",
  "Capacidade relevante",
  "Ação característica",
  "Fios da intervenção",
  "Defesa pertinente",
  "Guarda",
  "Vitalidade se relevante",
  "Inteireza se relevante",
  "Esforço se relevante",
  "Posição",
  "Consequência típica",
  "Dependência/vulnerabilidade",
  "Costura de capacidades",
  "Condição de término",
  "Notas privadas",
];
export function newOpposition(
  kind: "Figurante" | "Adversário" | "Ameaça",
): TdvMasterState["opposition"][number] {
  return {
    id: uid(),
    kind,
    name: "",
    magnitude: 0,
    fields: Object.fromEntries(OPPOSITION_FIELDS.map((k) => [k, ""])),
  };
}
