import { Input } from "@/components/ui/input";
import type { RankRow } from "@/lib/sheet-types";
import { Section } from "./sheet-ui";

/** Presents the route's actual rank bases; no independent progression rules. */
export function SheetExposureSection({
  value,
  base,
  attributeBudget,
  attributeCap,
  canEdit,
  onValueChange,
}: {
  value: number;
  base: RankRow;
  attributeBudget: number;
  attributeCap: number;
  canEdit: boolean;
  onValueChange: (value: number) => void;
}) {
  return (
    <Section id="exposicao" title="Exposição" className="tadeon-state-panel tadeon-exposure-panel">
      <div className="tadeon-exposure-instrument">
        <div className="tadeon-exposure-reading">
          <div>
            <span className="tadeon-state-label">Contato acumulado</span>
            <h3>Patamar {base.rank}</h3>
          </div>
          <strong>
            {value}
            <small>%</small>
          </strong>
        </div>
        <div className="tadeon-exposure-scale" aria-hidden="true">
          <div className="tadeon-exposure-scale__ticks">
            {Array.from({ length: 21 }, (_, i) => i * 5).map((step) => (
              <span
                key={step}
                data-reached={step <= value ? "true" : undefined}
                data-major={step % 25 === 0 ? "true" : undefined}
              />
            ))}
            <span
              className="tadeon-exposure-scale__marker"
              style={{
                left: `calc(${Math.max(0, Math.min(100, value))}% - ${Math.max(0, Math.min(100, value)) / 100}rem)`,
              }}
            />
          </div>
          <div className="tadeon-exposure-scale__labels">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100%</span>
          </div>
        </div>
        <div className="tadeon-state-controls">
          <Input
            type="number"
            min={0}
            max={100}
            step={5}
            disabled={!canEdit}
            value={value}
            aria-label="Exposição atual"
            onChange={(event) => onValueChange(Number(event.target.value))}
          />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            disabled={!canEdit}
            value={value}
            aria-label="Ajustar exposição"
            onChange={(event) => onValueChange(Number(event.target.value))}
          />
        </div>
        <dl className="tadeon-exposure-derived" aria-label="Bases do patamar atual">
          <div>
            <dt>Patamar</dt>
            <dd>{base.rank}</dd>
          </div>
          <div>
            <dt>Pontos de atributos</dt>
            <dd>{attributeBudget}</dd>
          </div>
          <div>
            <dt>Limite por atributo</dt>
            <dd>{attributeCap}</dd>
          </div>
          <div>
            <dt>PM de base</dt>
            <dd>{base.pm}</dd>
          </div>
        </dl>
        <div className="tadeon-exposure-resources">
          <p className="tadeon-state-label">Recursos de base</p>
          <dl aria-label="Recursos de base">
            {(
              [
                ["PV", base.pv],
                ["PS", base.ps],
                ["PE", base.pe],
                ["PA", base.pa],
                ["DEF", base.def],
              ] as const
            ).map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{amount}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="tadeon-state-note">
          Bases do patamar atual, antes dos atributos e modificadores da personagem.
        </p>
      </div>
    </Section>
  );
}
