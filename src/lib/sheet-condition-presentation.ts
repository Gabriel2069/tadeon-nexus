import type { CSSProperties } from "react";

/** Display metadata only; the sheet remains the owner of condition values. */
export function conditionChipPresentation(text: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  const fraction = normalized.match(/(\d+)\s*\/\s*(\d+)/);
  const stage = normalized.match(/(?:nivel|estagio|grau|fase)?\s*(\d+)/i);
  let progress =
    fraction && Number(fraction[2]) > 0
      ? Math.max(0, Math.min(1, Number(fraction[1]) / Number(fraction[2])))
      : stage
        ? Math.max(0.25, Math.min(1, Number(stage[1]) / 4))
        : 0.42;
  let severity: "critical" | "danger" | undefined;
  if (/morrendo|dying/.test(normalized)) {
    severity = "critical";
    progress = Math.max(progress, 0.86);
  } else if (/colapsando|colapso|collaps/.test(normalized)) {
    severity = "critical";
    progress = 1;
  } else if (/critico|grave|agoniz|incapacit|inconsciente/.test(normalized)) {
    severity = "danger";
    progress = Math.max(progress, 0.68);
  }
  return {
    severity,
    style: {
      "--condition-progress": progress.toFixed(2),
      "--condition-glow-opacity": (0.38 + progress * 0.5).toFixed(2),
      "--condition-glow-blur": `${Math.round(7 + progress * 10)}px`,
    } as CSSProperties,
  };
}
