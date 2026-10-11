import { useId, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";

/** The cloth is a bounded decorative layer, never a writer of product state. */
export function ContinuityHero({
  greeting,
  description,
  action,
  facts,
}: {
  greeting: string;
  description: string;
  action: ReactNode;
  facts: { label: string; value: string; detail: string }[];
}) {
  const gradient = useId();
  return (
    <section className="tadeon-continuity-hero" aria-labelledby="continuity-title">
      <div className="tadeon-continuity-hero__art" aria-hidden="true">
        <svg className="tadeon-continuity-hero__weave" viewBox="0 0 760 460" fill="none">
          <defs>
            <linearGradient
              id={gradient}
              x1="20"
              y1="90"
              x2="740"
              y2="400"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#716b7b" />
              <stop offset=".48" stopColor="#e9e3d5" />
              <stop offset=".72" stopColor="#b7814d" />
              <stop offset="1" stopColor="#4f6e5d" />
            </linearGradient>
          </defs>
          <g stroke={`url(#${gradient})`} strokeWidth=".8">
            {Array.from({ length: 56 }, (_, i) => (
              <path
                key={i}
                opacity={0.18 + (i % 9) * 0.045}
                d={`M-30 ${40 + i * 5.8}C130 ${-70 + i * 5.8} 220 ${420 - i * 1.9} 390 ${260 + i * 0.7}S570 ${60 + i * 2.9} 790 ${125 + i * 3.5}`}
              />
            ))}
          </g>
          <path
            d="M-30 236C135 48 272 440 390 283S560 135 790 285"
            stroke="var(--primary)"
            strokeWidth="1.4"
            opacity=".8"
          />
        </svg>
        <span className="tadeon-continuity-hero__seal">
          <BrandMark />
        </span>
        <span className="tadeon-continuity-hero__caption">Memória · vínculo · continuidade</span>
      </div>
      <div className="tadeon-continuity-hero__copy">
        <p className="tadeon-continuity-hero__greeting">{greeting}</p>
        <h1 id="continuity-title" className="font-cinzel">
          Os fios da sua
          <br />
          <em>jornada.</em>
        </h1>
        <p className="tadeon-continuity-hero__description">{description}</p>
        <div className="tadeon-continuity-hero__actions">{action}</div>
      </div>
      <dl className="tadeon-continuity-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
            <dd className="tadeon-continuity-facts__detail">{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
