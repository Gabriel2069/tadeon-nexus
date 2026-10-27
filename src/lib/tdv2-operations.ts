import { z } from "zod";
import { readTest, testSignature, uid } from "./tdv2";
const text = z.string().max(12000);
export const OPERATION_KINDS = [
  "Prolongada",
  "Selagem",
  "Canalização",
  "Coordenação",
  "Perseguição",
] as const;
export const operationSchema = z.object({
  id: z.string(),
  kind: z.enum(OPERATION_KINDS),
  name: text,
  objective: text,
  dt: z.number().int().min(2).max(1000),
  pressureId: z.string(),
  stages: z
    .array(z.object({ id: z.string(), name: text, done: z.boolean(), evidence: text }))
    .min(1)
    .max(20),
  history: z
    .array(
      z.object({
        id: z.string(),
        signature: text,
        intention: text,
        approach: text,
        change: text,
        resolution: z.enum(["Ficção direta", "Teste"]),
        prumo: z.number().int().min(1).max(20).optional(),
        tento: z.number().int().min(1).max(20).optional(),
        dt: z.number(),
        success: z.boolean(),
        stages: z.array(z.string()).max(20),
        rest: text,
        participants: text,
      }),
    )
    .max(200),
});
export type TdvOperation = z.infer<typeof operationSchema>;
export function newOperation(kind: TdvOperation["kind"]): TdvOperation {
  const names =
    kind === "Selagem"
      ? ["Diagnóstico", "Acesso", "Tecitura", "Fixação", "Resto e Permanência"]
      : kind === "Canalização"
        ? ["Aproximação", "Tração e Puxagem", "Tecitura", "Expressão", "Relaxamento"]
        : kind === "Coordenação"
          ? ["Primeira contribuição", "Segunda contribuição"]
          : kind === "Perseguição"
            ? ["Criar ou preservar acesso", "Alterar a distância ou rota", "Resolver o objetivo"]
            : ["Acesso", "Intervenção", "Estabilização"];
  return {
    id: uid(),
    kind,
    name: "",
    objective: "",
    dt: 12,
    pressureId: "",
    stages: names.map((name) => ({ id: uid(), name, done: false, evidence: "" })),
    history: [],
  };
}
export interface OperationStep {
  stageIds: string[];
  intention: string;
  approach: string;
  change: string;
  evidence: string;
  rest: string;
  participants: string;
  resolution: "Ficção direta" | "Teste";
  prumo: number;
  tento: number;
  broadens: boolean;
}
export function registerOperationStep(operation: TdvOperation, step: OperationStep): TdvOperation {
  if (
    !operation.objective.trim() ||
    !step.intention.trim() ||
    !step.approach.trim() ||
    !step.evidence.trim()
  )
    throw new Error("Declare objetivo, intervenção, abordagem e a mudança verificável.");
  if (operation.history.length >= 200)
    throw new Error("Organize a memória da operação antes de novos registros.");
  const signature = testSignature({
    intention: step.intention,
    approach: step.approach,
    change: step.change,
    point: "",
    risk: step.resolution === "Teste",
  });
  if (operation.history.some((h) => h.signature === signature))
    throw new Error("Não repita a mesma intervenção sem mudança real da situação.");
  const result =
    step.resolution === "Teste" ? readTest(step.prumo, step.tento, operation.dt) : null;
  if (result && [step.prumo, step.tento].some((n) => !Number.isInteger(n) || n < 1 || n > 20))
    throw new Error("Use os resultados originais dos dois Fios.");
  const success = result?.success ?? true;
  const stageIds = [...new Set(step.stageIds)];
  if (
    !stageIds.length ||
    stageIds.some((id) => !operation.stages.some((s) => s.id === id && !s.done))
  )
    throw new Error("Escolha etapas ainda abertas desta operação.");
  if (
    success &&
    operation.kind === "Prolongada" &&
    step.resolution === "Teste" &&
    stageIds.length > 1 &&
    (!(result!.margin >= 4 && step.broadens) || stageIds.length > 2)
  )
    throw new Error("Etapa adicional exige êxito elevado e uma ação que realmente abranja ambas.");
  return {
    ...operation,
    stages: operation.stages.map((stage) =>
      success && stageIds.includes(stage.id)
        ? { ...stage, done: true, evidence: step.evidence }
        : stage,
    ),
    history: [
      ...operation.history,
      {
        id: uid(),
        signature,
        intention: step.intention,
        approach: step.approach,
        change: step.change,
        resolution: step.resolution,
        ...(result ? { prumo: step.prumo, tento: step.tento } : {}),
        dt: operation.dt,
        success,
        stages: success ? stageIds : [],
        rest: step.rest,
        participants: step.participants,
      },
    ],
  };
}
