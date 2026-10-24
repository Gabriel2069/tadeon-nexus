import { memo, useId } from "react";

interface AttributeRadarProps {
  color: string;
  data: { attr: string; value: number }[];
  fillOpacity?: number;
  tickColor: string;
}

/** A small, static instrument. The surrounding card owns its dimensions and material. */
function AttributeRadar({ color, data, fillOpacity = 0.34, tickColor }: AttributeRadarProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;
  const maximum = Math.max(5, ...data.map(({ value }) => (Number.isFinite(value) ? value : 0)));
  const minimum = Math.min(0, ...data.map(({ value }) => (Number.isFinite(value) ? value : 0)));
  const point = (index: number, radius: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / data.length;
    return { x: 130 + Math.cos(angle) * radius, y: 115 + Math.sin(angle) * radius };
  };
  const points = (radius: number) =>
    data
      .map((_, index) => {
        const p = point(index, radius);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  const values = data.map(({ value }, index) =>
    point(index, (78 * ((Number.isFinite(value) ? value : 0) - minimum)) / (maximum - minimum)),
  );
  return (
    <svg
      className="tadeon-attribute-radar-svg"
      width="100%"
      height="100%"
      viewBox="0 0 260 230"
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <title id={titleId}>Distribuição dos atributos</title>
      <desc id={descriptionId}>
        {data.length
          ? `${data.map(({ attr, value }) => `${attr}: ${value}`).join("; ")}. Escala de ${minimum} a ${maximum}.`
          : "Sem atributos disponíveis."}
      </desc>
      {data.length > 0 ? (
        <>
          <g fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.22" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((level) => (
              <polygon key={level} points={points((78 * level) / 5)} />
            ))}
            {data.map(({ attr }, index) => {
              const p = point(index, 78);
              return <line key={attr} x1="130" y1="115" x2={p.x} y2={p.y} />;
            })}
          </g>
          <polygon
            points={values.map((p) => `${p.x},${p.y}`).join(" ")}
            fill={color}
            fillOpacity={fillOpacity}
            stroke={color}
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          />
          <g aria-hidden="true">
            {data.map(({ attr, value }, index) => {
              const label = point(index, 98),
                p = values[index];
              return (
                <g key={attr}>
                  <circle cx={p.x} cy={p.y} r="2" fill={tickColor} />
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    fill={tickColor}
                    fontFamily="var(--font-cinzel), Georgia, serif"
                    fontSize="16"
                    fontWeight="650"
                  >
                    <tspan x={label.x}>{attr}</tspan>
                    <tspan
                      x={label.x}
                      dy="13"
                      fontFamily="var(--font-inter), sans-serif"
                      fontSize="14"
                    >
                      {value}
                    </tspan>
                  </text>
                </g>
              );
            })}
            <text
              x="130"
              y="224"
              textAnchor="middle"
              fill={tickColor}
              opacity="0.7"
              fontFamily="var(--font-inter), sans-serif"
              fontSize="13"
            >
              {minimum} a {maximum}
            </text>
          </g>
        </>
      ) : (
        <text
          x="130"
          y="115"
          textAnchor="middle"
          fill={tickColor}
          fontFamily="var(--font-inter), sans-serif"
          fontSize="14"
        >
          Sem atributos
        </text>
      )}
    </svg>
  );
}

export default memo(AttributeRadar);
