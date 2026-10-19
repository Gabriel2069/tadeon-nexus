import { FabricFilaments } from "@/components/fabric-filaments";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CSSProperties } from "react";
import { useEffect, useId, useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Minus, Plus, Trash } from "lucide-react";

import { MaterialSurface } from "@/components/material-surface";
import { clamp } from "./sheet-model";
const SECTION_HELP: Record<string, string> = {
  "sec-info": "Identidade, origem, ocupação e marcas que situam a personagem no mundo.",
  "sec-attr": "Atributos medem potenciais fundamentais e sustentam testes e derivados.",
  "sec-pontos": "Recursos atuais e máximos da personagem, além da proteção em jogo.",
  equilibrio: "Equilíbrio acompanha o estado interno e suas pressões atuais.",
  exposicao: "Exposição registra o contato acumulado com forças e fenômenos relevantes.",
  condicoes: "Condições registram estados ativos que alteram a situação da personagem.",
  "sec-pericias": "Perícias expressam competências treinadas e seus graus atuais.",
  "sec-armas": "Armas e proficiências disponíveis no momento.",
  "sec-inv": "Inventário reúne objetos carregados, recipientes e recursos materiais.",
  "sec-hab": "Habilidades já adquiridas e disponíveis para consulta.",
  "tramas-fragmentos": "Fragmentos e manifestações vinculados à personagem.",
  "sec-notas": "Notas de campo e registros livres da personagem.",
};
const SECTION_PRESENTATION: Record<string, { index: string; kicker: string }> = {
  "sec-info": { index: "01", kicker: "Identidade e continuidade" },
  "sec-attr": { index: "02", kicker: "Matriz de potencial" },
  "sec-pontos": { index: "03", kicker: "Recursos e proteção" },
  equilibrio: { index: "04", kicker: "Estado de tensão" },
  exposicao: { index: "05", kicker: "Progressão de contato" },
  condicoes: { index: "06", kicker: "Pressões em curso" },
  "sec-pericias": { index: "07", kicker: "Competências treinadas" },
  "sec-armas": { index: "08", kicker: "Arsenal operacional" },
  "sec-inv": { index: "09", kicker: "Carga e recursos" },
  "sec-hab": { index: "10", kicker: "Repertório adquirido" },
  "tramas-fragmentos": { index: "11", kicker: "Fenômenos e manifestações" },
  "sec-notas": { index: "12", kicker: "Registro de campo" },
};

export function OverviewMetric({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "blue" | "amber" | "red";
}) {
  return (
    <div className={`tadeon-overview-metric tadeon-overview-metric--${tone}`}>
      <div className="tadeon-overview-metric__icon">{icon}</div>
      <div className="min-w-0">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}
export function Section({
  title,
  children,
  extra,
  id,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
  id?: string;
  className?: string;
}) {
  const presentationKey = id ?? title.toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, "-");
  const presentation = SECTION_PRESENTATION[presentationKey] ?? {
    index: "•",
    kicker: "Arquivo da personagem",
  };
  const storageKey = `tadeon.sheet.section:${presentationKey}`;
  const fieldId = useId();
  const bodyId = `sheet-section-body-${fieldId}`;
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(storageKey) === "collapsed";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? "collapsed" : "expanded");
    } catch {
      // A ficha continua utilizável quando o armazenamento local está indisponível.
    }
  }, [collapsed, storageKey]);

  return (
    <MaterialSurface
      as="section"
      style={{ "--material-rgb": "var(--section-rgb)" } as CSSProperties}
      id={id}
      data-section={presentationKey}
      data-tadeon-context-help={SECTION_HELP[presentationKey]}
      title={SECTION_HELP[presentationKey]}
      data-collapsed={collapsed ? "true" : "false"}
      className={`tadeon-sheet-section scroll-mt-44 ${className}`}
    >
      <FabricFilaments className="tadeon-sheet-fabric" />
      <Collapsible open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
        <div className="tadeon-sheet-section__heading">
          <div className="tadeon-sheet-section__title-group">
            <span className="tadeon-sheet-section__index" aria-hidden="true">
              {presentation.index}
            </span>
            <span className="min-w-0">
              <small>{presentation.kicker}</small>
              <h2 tabIndex={-1} onFocus={() => setCollapsed(false)}>
                {title}
              </h2>
            </span>
          </div>
          <div className="tadeon-sheet-section__actions">
            {extra}
            <CollapsibleTrigger asChild>
              <button
                type="button"
                data-sheet-fold-trigger=""
                data-material-surface="control"
                className="tadeon-sheet-section__toggle"
                aria-controls={bodyId}
                aria-label={`${collapsed ? "Expandir" : "Recolher"} seção ${title}`}
                title={`${collapsed ? "Expandir" : "Recolher"} ${title}`}
              >
                <span className="tadeon-sheet-fold-chevron">
                  <ChevronDown aria-hidden="true" />
                </span>
              </button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent id={bodyId} className="tadeon-sheet-section__body">
          <div className="tadeon-sheet-section__body-inner">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </MaterialSurface>
  );
}
export function Field({
  label,
  value,
  onChange,
  disabled,
  className = "",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  multiline?: boolean;
}) {
  const fieldId = useId();
  return (
    <div className={`tadeon-sheet-field ${className}`}>
      <Label htmlFor={fieldId} className="tadeon-dossier-label text-xs">
        {label}
      </Label>
      {multiline ? (
        <Textarea
          className="tadeon-dossier-field"
          id={fieldId}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={2}
        />
      ) : (
        <Input
          id={fieldId}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="tadeon-dossier-field h-9"
        />
      )}
    </div>
  );
}
export function StatBlock({
  label,
  full,
  color,
  glowRgb,
  current,
  mod,
  max,
  disabled,
  onCurrent,
  onMod,
}: {
  label: string;
  full: string;
  color: string;
  glowRgb: string;
  current: number;
  mod: number;
  max: number;
  disabled?: boolean;
  onCurrent: (v: number) => void;
  onMod: (v: number) => void;
}) {
  const borderStyle: CSSProperties = {
    "--resource-rgb": glowRgb.split(",").join(" "),
    "--material-rgb": "var(--resource-rgb)",
    "--resource-used": clamp(current / Math.max(1, max), 0, 1),
  } as CSSProperties;
  return (
    <Card className="tadeon-stat-block" style={borderStyle}>
      <div className="tadeon-stat-block__head">
        <div>
          <span className="tadeon-stat-block__symbol">{label}</span>
          <h3>{full}</h3>
          <span className="tadeon-stat-block__caption">Atual / máximo</span>
        </div>
        <div className="tadeon-stat-block__dial">
          <svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">
            <circle className="tadeon-stat-block__track" cx="40" cy="40" r="35" />
            <circle className="tadeon-stat-block__fill" cx="40" cy="40" r="35" pathLength="1" />
            <circle className="tadeon-stat-block__rim" cx="40" cy="40" r="29" />
          </svg>
          <strong className={`tadeon-stat-block__value ${color}`}>
            {current}
            <small>/ {max}</small>
          </strong>
        </div>
      </div>
      <div className="tadeon-stat-block__controls">
        <div className="tadeon-stat-block__stepper">
          <Button
            size="sm"
            variant="ghost"
            className="tadeon-stepper-button h-9 w-9 p-0"
            disabled={disabled || current <= 0}
            aria-label={`Diminuir ${full}`}
            onClick={() => onCurrent(current - 1)}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Input
            type="number"
            min={0}
            max={Math.max(0, max)}
            disabled={disabled}
            value={current}
            aria-label={`${full} atual`}
            onChange={(e) => onCurrent(Number(e.target.value))}
            className="tadeon-resource-field h-9 min-w-0 text-center text-sm font-semibold"
          />
          <Button
            size="sm"
            variant="ghost"
            className="tadeon-stepper-button h-9 w-9 p-0"
            disabled={disabled || current >= max}
            aria-label={`Aumentar ${full}`}
            onClick={() => onCurrent(current + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <label className="tadeon-stat-block__mod">
          <span>Mod.</span>
          <Input
            type="number"
            disabled={disabled}
            value={mod}
            aria-label={`Modificador de ${full}`}
            onChange={(e) => onMod(Number(e.target.value))}
            className="tadeon-resource-field h-8 text-center text-xs"
          />
        </label>
      </div>
    </Card>
  );
}
interface HasId {
  id: string;
}
interface ColDef {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  flex?: number;
  width?: number;
}
export function RowTable<T extends HasId>({
  rows,
  canEdit,
  columns,
  onChange,
}: {
  rows: T[];
  canEdit: boolean;
  columns: ColDef[];
  onChange: (v: T[]) => void;
}) {
  const update = (idx: number, key: string, value: string) => {
    const next = [...rows];
    const isNum = columns.find((c) => c.key === key)?.type === "number";
    next[idx] = { ...next[idx], [key]: isNum ? Number(value) : value };
    onChange(next);
  };
  const remove = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic text-center py-3">Nenhum item ainda.</p>
    );
  }

  const gridCols = columns
    .map((c) => (c.width ? `${c.width}px` : `minmax(0, ${c.flex ?? 1}fr)`))
    .concat(["auto"])
    .join(" ");

  return (
    <div className="space-y-1">
      <div
        className="hidden sm:grid gap-1.5 px-2 text-[10px] uppercase text-muted-foreground font-semibold"
        style={{ gridTemplateColumns: gridCols }}
      >
        {columns.map((c) => (
          <div key={c.key}>{c.label}</div>
        ))}
        <div />
      </div>
      {rows.map((it, idx) => (
        <div
          key={it.id}
          className="tadeon-sheet-row flex flex-col items-center gap-2 rounded-xl bg-secondary/30 p-2.5 transition-[background-color,border-color,box-shadow] duration-150 hover:bg-secondary/50 sm:grid sm:gap-1.5"
          style={{ gridTemplateColumns: gridCols }}
        >
          {columns.map((c) => {
            const value = (it as Record<string, unknown>)[c.key];
            if (c.type === "select") {
              return (
                <label key={c.key} className="tadeon-sheet-row__field">
                  <span>{c.label}</span>
                  <select
                    disabled={!canEdit}
                    value={String(value ?? "")}
                    onChange={(e) => update(idx, c.key, e.target.value)}
                    className="h-8 w-full rounded-md border border-border/40 bg-background/40 px-2 text-xs"
                  >
                    {c.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }
            return (
              <label key={c.key} className="tadeon-sheet-row__field">
                <span>{c.label}</span>
                <Input
                  type={c.type === "number" ? "number" : "text"}
                  placeholder={c.label}
                  disabled={!canEdit}
                  value={c.type === "number" ? Number(value ?? 0) : String(value ?? "")}
                  onChange={(e) => update(idx, c.key, e.target.value)}
                  className="h-8 w-full border-border/40 bg-background/40 text-xs"
                />
              </label>
            );
          })}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 self-end sm:self-auto"
              onClick={() => remove(idx)}
              aria-label={`Remover item ${idx + 1}`}
              title="Remover item"
            >
              <Trash className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
