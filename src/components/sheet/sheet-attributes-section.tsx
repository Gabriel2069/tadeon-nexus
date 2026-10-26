import { Button } from "@/components/ui/button";

import { type Attributes } from "@/lib/sheet-types";
import { Minus, Plus } from "lucide-react";

import { type SheetUpdate } from "./sheet-model";
import { Section } from "./sheet-ui";

import AttributeRadar from "./attribute-radar";
export function SheetAttributesSection({
  attrs,
  canEdit,
  update,
  attributeRemaining,
  attributesOverCap,
  attributeUsed,
  attributeBudget,
  attributeCap,
  zeroAttributes,
  radarData,
}: {
  attrs: Attributes;
  canEdit: boolean;
  update: SheetUpdate;
  attributeRemaining: number;
  attributesOverCap: (keyof Attributes)[];
  attributeUsed: number;
  attributeBudget: number;
  attributeCap: number;
  zeroAttributes: number;
  radarData: { attr: string; value: number }[];
}) {
  return (
    <Section
      id="sec-attr"
      title="Atributos"
      className="tadeon-core-panel tadeon-attributes-panel"
      extra={
        <span
          className={`tadeon-attribute-budget rounded-full border px-2 py-0.5 text-[10px] ${
            attributeRemaining < 0 || attributesOverCap.length > 0
              ? "border-destructive/60 text-destructive"
              : "border-border text-muted-foreground"
          }`}
        >
          {attributeUsed}/{attributeBudget} pontos · máx. {attributeCap}
        </span>
      }
    >
      {(attributeRemaining < 0 || attributesOverCap.length > 0) && (
        <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {attributeRemaining < 0
            ? `A ficha excede o orçamento deste Rank em ${Math.abs(attributeRemaining)} ponto(s). `
            : ""}
          {attributesOverCap.length > 0
            ? `${attributesOverCap.join(", ")} excede(m) o máximo ${attributeCap}. `
            : ""}
          Reduza Atributos para voltar à faixa válida.
        </p>
      )}
      <div className="tadeon-attributes-composition">
        <div
          className="tadeon-attribute-grid"
          role="group"
          aria-label="Distribuição dos atributos"
        >
          {(Object.keys(attrs) as (keyof Attributes)[]).map((k) => {
            const wouldCreateSecondZero = attrs[k] === 1 && zeroAttributes >= 1;
            return (
              <div
                key={k}
                data-attribute={k}
                className="tadeon-attribute-tile min-h-14 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2"
              >
                <span className="tadeon-attribute-tile__label font-cinzel text-sm">{k}</span>
                <div className="tadeon-attribute-tile__controls">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="tadeon-stepper-button h-9 w-9 p-0"
                    disabled={!canEdit || attrs[k] <= 0 || wouldCreateSecondZero}
                    aria-label={`Diminuir ${k}`}
                    title={
                      wouldCreateSecondZero ? "Apenas um Atributo pode ser reduzido a 0" : undefined
                    }
                    onClick={() =>
                      update("attributes", {
                        ...attrs,
                        [k]: Math.max(0, attrs[k] - 1),
                      })
                    }
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <output className="tadeon-attribute-tile__value" aria-label={`${k}: ${attrs[k]}`}>
                    {attrs[k]}
                  </output>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="tadeon-stepper-button h-9 w-9 p-0"
                    disabled={!canEdit || attrs[k] >= attributeCap || attributeRemaining <= 0}
                    aria-label={`Aumentar ${k}`}
                    title={
                      attrs[k] >= attributeCap
                        ? `Máximo ${attributeCap} neste Rank`
                        : attributeRemaining <= 0
                          ? "Orçamento de Atributos esgotado"
                          : undefined
                    }
                    onClick={() =>
                      update("attributes", {
                        ...attrs,
                        [k]: Math.min(attributeCap, attrs[k] + 1),
                      })
                    }
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          <p className="tadeon-attribute-remaining">
            {attributeRemaining > 0
              ? `${attributeRemaining} ponto(s) ainda disponível(is).`
              : "Orçamento do Rank totalmente distribuído."}
          </p>
        </div>
        <div className="tadeon-attribute-radar">
          <AttributeRadar data={radarData} color="#a855f7" tickColor="#c084fc" />
        </div>
      </div>
    </Section>
  );
}
