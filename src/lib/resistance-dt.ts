import type { Attributes } from "@/lib/sheet-types";

export const CHANNELING_GRADES = {
  destreinado: { label: "Destreinado", power: 0 },
  iniciado: { label: "Iniciado", power: 2 },
  apurado: { label: "Apurado", power: 4 },
  versado: { label: "Versado", power: 6 },
} as const;

export const CHANNELING_INTENSITIES = {
  repuxo: { label: "Repuxo", modifier: 0 },
  tracao: { label: "Tração", modifier: 2 },
  estiramento: { label: "Estiramento", modifier: 4 },
} as const;

export type ChannelingGrade = keyof typeof CHANNELING_GRADES;
export type ChannelingIntensity = keyof typeof CHANNELING_INTENSITIES;

export interface ResistanceDtInput {
  attribute: number;
  grade: ChannelingGrade;
  intensity: ChannelingIntensity;
  modifier?: number;
}

export function calculateResistanceDt({
  attribute,
  grade,
  intensity,
  modifier = 0,
}: ResistanceDtInput): number {
  const safeAttribute = Math.max(0, Math.min(10, Math.round(attribute || 0)));
  const safeModifier = Math.max(-10, Math.min(10, Math.round(modifier || 0)));
  return (
    10 +
    safeAttribute +
    CHANNELING_GRADES[grade].power +
    CHANNELING_INTENSITIES[intensity].modifier +
    safeModifier
  );
}

export const RESISTANCE_GUIDANCE = [
  { value: "Fortitude", detail: "Alteração direta do corpo ou da matéria física." },
  { value: "Temperança", detail: "Intrusão, distorção da percepção ou pressão psíquica." },
  { value: "Convicção", detail: "Intrusão que desafia identidade, decisão ou vínculo." },
  { value: "Reflexo", detail: "Efeito espacial ou físico que pode ser evitado." },
  { value: "Canalização", detail: "Costura direta contra outra Costura." },
] as const;

export function channelingAttributeValue(
  attributes: Attributes,
  attribute: keyof Attributes,
): number {
  return Math.max(0, Number(attributes[attribute]) || 0);
}
