import { useId, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
export function TdvDisclosure({
  initiallyOpen,
  children,
}: {
  initiallyOpen: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details className="tdv-disclosure" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      {children}
    </details>
  );
}

export function TdvField({
  label,
  value,
  onChange,
  disabled = false,
  short = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  short?: boolean;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      {short ? (
        <Input
          className="tadeon-dossier-field"
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Textarea
          className="tadeon-dossier-field"
          id={id}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
export function TdvSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      <select
        className="tadeon-dossier-field"
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
export function TdvNumber({
  label,
  value,
  onChange,
  disabled = false,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
}) {
  const id = useId();
  return (
    <div className="tdv-field">
      <label className="tadeon-dossier-label" htmlFor={id}>
        {label}
      </label>
      <Input
        className="tadeon-dossier-field"
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) =>
          onChange(Math.max(min, Math.min(max, Math.round(Number(e.target.value) || 0))))
        }
      />
    </div>
  );
}
export function TdvCheck({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="tdv-check tadeon-dossier-label">
      <input
        type="checkbox"
        checked={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
