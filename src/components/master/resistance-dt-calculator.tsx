import { useMemo, useState } from "react";
import { Calculator, ChevronDown, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHANNELING_GRADES,
  CHANNELING_INTENSITIES,
  RESISTANCE_GUIDANCE,
  calculateResistanceDt,
  type ChannelingGrade,
  type ChannelingIntensity,
} from "@/lib/resistance-dt";

export function ResistanceDtCalculator({
  initialAttribute = 0,
  compact = false,
}: {
  initialAttribute?: number;
  compact?: boolean;
}) {
  const [attribute, setAttribute] = useState(initialAttribute);
  const [grade, setGrade] = useState<ChannelingGrade>("destreinado");
  const [intensity, setIntensity] = useState<ChannelingIntensity>("repuxo");
  const [modifier, setModifier] = useState(0);
  const [resistance, setResistance] = useState("Fortitude");
  const [open, setOpen] = useState(!compact);
  const dt = useMemo(
    () => calculateResistanceDt({ attribute, grade, intensity, modifier }),
    [attribute, grade, intensity, modifier],
  );
  const guidance = RESISTANCE_GUIDANCE.find((item) => item.value === resistance);

  return (
    <Card className="tadeon-surface overflow-hidden rounded-2xl border-primary/35">
      <button
        type="button"
        className="flex w-full flex-col gap-4 bg-gradient-to-r from-primary/15 via-primary/5 to-transparent p-4 text-left sm:flex-row sm:items-center"
        aria-expanded={open}
        aria-controls="resistance-dt-fields"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-primary">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <p className="tadeon-eyebrow">Auxiliar de regra</p>
            <h3 className="font-cinzel text-lg font-semibold">DT de Resistência</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <div className="flex-1 rounded-xl border border-primary/35 bg-background/65 px-5 py-2 text-center">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Resultado</p>
            <p className="font-cinzel text-3xl font-bold text-primary">{dt}</p>
          </div>
          <ChevronDown
            className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </div>
      </button>
      {open && (
        <div id="resistance-dt-fields">
      <div className={`grid gap-3 p-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}>
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Atributo usado</span>
          <Input
            type="number"
            min={0}
            max={10}
            value={attribute}
            onChange={(event) => setAttribute(Number(event.target.value) || 0)}
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Grau</span>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value as ChannelingGrade)}
            className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm"
          >
            {Object.entries(CHANNELING_GRADES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label} (+{value.power})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Intensidade</span>
          <select
            value={intensity}
            onChange={(event) => setIntensity(event.target.value as ChannelingIntensity)}
            className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm"
          >
            {Object.entries(CHANNELING_INTENSITIES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label} (+{value.modifier})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Modificador situacional</span>
          <Input
            type="number"
            min={-10}
            max={10}
            value={modifier}
            onChange={(event) => setModifier(Number(event.target.value) || 0)}
          />
        </label>
      </div>
      <div className="border-t border-border/60 p-4">
        <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-end">
          <label className="space-y-1.5">
            <Label className="text-xs">Resistência adequada</Label>
            <select
              value={resistance}
              onChange={(event) => setResistance(event.target.value)}
              className="h-9 w-full rounded-md border border-border bg-input px-2 text-sm"
            >
              {RESISTANCE_GUIDANCE.map((item) => (
                <option key={item.value}>{item.value}</option>
              ))}
            </select>
          </label>
          <p className="flex min-h-9 items-center gap-2 rounded-lg bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
            {guidance?.detail}
          </p>
        </div>
        <p className="mt-3 text-[10px] text-muted-foreground">
          Fórmula: 10 + Atributo + Potência do Grau + Intensidade + modificador.
        </p>
      </div>
        </div>
      )}
    </Card>
  );
}
