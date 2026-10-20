import { useId } from "react";

/** Original vector strands shared by Fio-Mestre surfaces; decorative and inert. */
export function FabricFilaments({ className }: { className: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 300 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id}>
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset=".28" stopColor="currentColor" stopOpacity=".3" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".9" />
          <stop offset=".72" stopColor="currentColor" stopOpacity=".35" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-20 15C68-28 148 108 320 7L320 55C148 65 68 37-20 63Z"
        fill={`url(#${id})`}
        opacity=".2"
      />
      <path
        d="M-20 48C70 0 150 94 320 38L320 51C150 107 70 13-20 61Z"
        fill={`url(#${id})`}
        opacity=".12"
      />
      <path
        d="M-20 61C70 13 150 107 320 51"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="1.2"
        opacity=".65"
      />
      {Array.from({ length: 9 }, (_, index) => (
        <path
          key={index}
          d={`M -20 ${20 + index * 7} C 60 ${-22 + index * 8}, 146 ${106 - index * 5}, 320 ${12 + index * 6}`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth=".7"
          opacity={0.2 + index * 0.025}
        />
      ))}
      {Array.from({ length: 5 }, (_, index) => (
        <path
          key={`weft-${index}`}
          d={`M ${50 + index * 30} -20 C ${130 + index * 20} 25, ${40 + index * 30} 65, ${200 + index * 16} 120`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth=".5"
          opacity=".22"
        />
      ))}
    </svg>
  );
}
