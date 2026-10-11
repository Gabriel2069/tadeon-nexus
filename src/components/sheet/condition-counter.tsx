import type { CSSProperties } from "react";
import { Label } from "@/components/ui/label";

export function ConditionCounter({
  label,
  max,
  value,
  color,
  disabled,
  onChange,
}: {
  label: "Morrendo" | "Colapsando";
  max: number;
  value: number;
  color: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const active = Number.isFinite(value) ? Math.max(0, Math.min(max, Math.ceil(value))) : 0;
  const progress = max > 0 ? active / max : 0;
  return (
    <div
      className="tadeon-condition-counter-host"
      data-tadeon-condition-kind={label.toLowerCase()}
      style={
        {
          "--condition-progress": String(progress),
          "--condition-fill": `${progress * 100}%`,
          "--condition-intensity": String(0.35 + progress * 0.55),
        } as CSSProperties
      }
    >
      <Label className="tadeon-condition-counter-label text-xs">{label}</Label>
      <div className="tadeon-condition-counter-dots flex gap-2 mt-1">
        {Array.from({ length: max }).map((_, i) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onChange(i + 1 === value ? 0 : i + 1)}
            aria-label={`${label}: ${i + 1} de ${max}`}
            aria-pressed={i < value}
            className={`h-7 w-7 rounded-full border-2 border-border transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[.94] ${i < value ? color : "bg-transparent"} disabled:cursor-not-allowed disabled:transform-none`}
          />
        ))}
      </div>
    </div>
  );
}
