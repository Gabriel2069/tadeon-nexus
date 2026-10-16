import { useId, type ReactNode } from "react";
import { MaterialSurface } from "@/components/material-surface";
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
  const fade = useId();
  return (
    <MaterialSurface
      as="section"
      className="tadeon-continuity-hero"
      aria-labelledby="continuity-title"
    >
      <div className="tadeon-continuity-hero__art" aria-hidden="true">
        <svg className="tadeon-continuity-hero__weave" viewBox="0 0 760 460" fill="none">
          <defs>
            <linearGradient id={fade}>
              <stop stopColor="white" stopOpacity="0" />
              <stop offset=".18" stopColor="white" />
              <stop offset=".8" stopColor="white" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask
              id={`${fade}-mask`}
              maskUnits="userSpaceOnUse"
              x="0"
              y="0"
              width="760"
              height="460"
            >
              <rect width="760" height="460" fill={`url(#${fade})`} />
            </mask>
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
          <path
            d="M-30 40C130-70 220 420 390 260S570 60 790 125L790 318C570 220 560 430 390 298S130 255-30 359Z"
            fill={`url(#${gradient})`}
            opacity=".065"
            mask={`url(#${fade}-mask)`}
          />
          <g mask={`url(#${fade}-mask)`} stroke={`url(#${gradient})`} strokeWidth=".8">
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
            mask={`url(#${fade}-mask)`}
            stroke="var(--primary)"
            strokeWidth="1.4"
            opacity=".8"
          />
        </svg>
        <span className="tadeon-continuity-hero__seal">
          <svg className="tadeon-continuity-hero__armature" viewBox="0 0 260 260" fill="none">
            <ellipse
              cx="130"
              cy="130"
              rx="119"
              ry="80"
              transform="rotate(-32 130 130)"
              stroke="currentColor"
              opacity=".3"
              strokeWidth=".65"
            />
            <ellipse
              cx="130"
              cy="130"
              rx="109"
              ry="119"
              transform="rotate(-32 130 130)"
              stroke="currentColor"
              opacity=".15"
              strokeWidth=".65"
              strokeDasharray="2 7"
            />
            <circle cx="29" cy="166" r="2.5" fill="currentColor" opacity=".7" />
            <circle cx="224" cy="88" r="1.5" fill="currentColor" opacity=".8" />
          </svg>
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
        {facts.map((fact, index) => (
          <div key={fact.label} className="tadeon-continuity-fact">
            <svg
              className="tadeon-continuity-fact__thread"
              width="44"
              height="44"
              viewBox="0 0 44 44"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={`M4 ${14 + index * 3}C16 2 20 42 40 ${26 - index * 3}M4 ${19 + index * 3}C16 7 20 37 40 ${21 - index * 3}M4 ${24 + index * 3}C16 12 20 32 40 ${16 - index * 3}`}
                stroke="currentColor"
                strokeWidth=".8"
              />
              <circle cx="22" cy="22" r="16" stroke="currentColor" opacity=".35" />
            </svg>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
            <dd className="tadeon-continuity-facts__detail">{fact.detail}</dd>
          </div>
        ))}
      </dl>
    </MaterialSurface>
  );
}
