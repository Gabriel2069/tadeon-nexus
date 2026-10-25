import { useId, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EquilibriumEffect } from "@/lib/sheet-types";
import { Section } from "./sheet-ui";

export function SheetEquilibriumSection({
  value,
  drift,
  effect,
  canEdit,
  minimum,
  maximum,
  onValueChange,
  onTension,
}: {
  value: number;
  drift: number;
  effect: EquilibriumEffect;
  canEdit: boolean;
  minimum: number;
  maximum: number;
  onValueChange: (value: number) => void;
  onTension: (direction: -1 | 1) => void;
}) {
  const tensionId = useId();
  const outsideEditableRange = value < minimum || value > maximum;
  const pole = effect.value < 0 ? "fear" : effect.value > 0 ? "knowledge" : "integrity";
  const position = ((effect.value + 10) / 20) * 100;
  return (
    <Section
      id="equilibrio"
      title="Equilíbrio"
      className="tadeon-state-panel tadeon-equilibrium-panel"
    >
      <div className="tadeon-equilibrium-instrument" data-equilibrium-pole={pole}>
        <div className="tadeon-equilibrium-reading">
          <div>
            <span className="tadeon-state-label">Relação atual</span>
            <h3>{effect.state}</h3>
            {Math.abs(effect.value) > 5 && (
              <span className="tadeon-equilibrium-exception">Fonte excepcional</span>
            )}
          </div>
          <strong className="tadeon-equilibrium-value">
            {effect.value > 0 ? `+${effect.value}` : effect.value}
          </strong>
        </div>
        <div className="tadeon-equilibrium-axis" aria-hidden="true">
          <div className="tadeon-equilibrium-poles">
            <span>
              Medo <small>−10</small>
            </span>
            <span>
              <small>+10</small> Conhecimento
            </span>
          </div>
          <div className="tadeon-equilibrium-gauge">
            {Array.from({ length: 21 }, (_, i) => i - 10).map((step) => (
              <span
                key={step}
                className="tadeon-equilibrium-tick"
                data-major={step % 5 === 0 ? "true" : undefined}
                data-center={step === 0 ? "true" : undefined}
              />
            ))}
            <span
              className="tadeon-equilibrium-marker"
              style={
                {
                  left: `calc(${position}% - ${position / 100}rem)`,
                } as CSSProperties
              }
            />
          </div>
          <div className="tadeon-equilibrium-center">
            <span>−5</span>
            <span>0 · Inteireza</span>
            <span>+5</span>
          </div>
        </div>
        <div className="tadeon-state-controls">
          <Input
            type="number"
            min={minimum}
            max={maximum}
            step={1}
            disabled={!canEdit}
            value={value}
            aria-label="Equilíbrio atual"
            onChange={(event) => onValueChange(Number(event.target.value))}
          />
          <input
            type="range"
            min={outsideEditableRange ? -10 : minimum}
            max={outsideEditableRange ? 10 : maximum}
            step={1}
            disabled={!canEdit || outsideEditableRange}
            value={value}
            aria-label="Ajustar equilíbrio"
            onChange={(event) => onValueChange(Number(event.target.value))}
          />
        </div>
        <p className="tadeon-equilibrium-range-note">
          Faixa comum: −5 a +5. Além dela, é necessária uma fonte excepcional confirmada pelo
          mestre.
        </p>
        <div className="tadeon-equilibrium-tension" role="group" aria-labelledby={tensionId}>
          <div className="tadeon-equilibrium-tension__heading">
            <span id={tensionId}>Tensão</span>
            <small>
              {drift < 0
                ? "Em direção ao Medo"
                : drift > 0
                  ? "Em direção ao Conhecimento"
                  : "Sem tensão acumulada"}
            </small>
          </div>
          <div className="tadeon-tension-control">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              aria-label="Diminuir tensão"
              onClick={() => onTension(-1)}
            >
              <Minus aria-hidden="true" />
            </Button>
            <div className="tadeon-equilibrium-tension__reading">
              <output aria-label="Tensão atual">{drift > 0 ? `+${drift}` : drift}</output>
              <div className="tadeon-tension-stitches" aria-hidden="true">
                {[-3, -2, -1, 0, 1, 2, 3].map((step) => (
                  <span
                    key={step}
                    data-tension-step={step}
                    data-active={
                      step === 0 ||
                      (drift < 0 && step < 0 && step >= drift) ||
                      (drift > 0 && step > 0 && step <= drift)
                        ? "true"
                        : undefined
                    }
                  />
                ))}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!canEdit}
              aria-label="Aumentar tensão"
              onClick={() => onTension(1)}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>
          <p>
            Ao atingir −4 ou +4, desloca o Equilíbrio em 1 ponto na mesma direção e retorna a zero.
          </p>
        </div>
        <div className="tadeon-equilibrium-effects">
          {effect.value === 0 ? (
            <div className="tadeon-equilibrium-integrity">
              <span>Efeito atual</span>
              <p>{effect.benefit}</p>
              <p>{effect.penalty}</p>
            </div>
          ) : (
            <>
              <div>
                <span>Benefício</span>
                <p>{effect.benefit}</p>
              </div>
              <div>
                <span>Penalidade</span>
                <p>{effect.penalty === "~" ? "Sem penalidade adicional." : effect.penalty}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </Section>
  );
}
