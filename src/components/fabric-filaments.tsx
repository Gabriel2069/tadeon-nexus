import { useId } from "react";

/** Original vector strands shared by Fio-Mestre surfaces; decorative and inert. */
export function FabricFilaments({ className }: { className: string }) {
  const id = useId();
  return (
    <svg className={className} viewBox="0 0 300 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={id}>
          <stop stopColor="currentColor" stopOpacity="0" />
          <stop offset=".28" stopColor="currentColor" stopOpacity=".18" />
          <stop offset=".55" stopColor="currentColor" stopOpacity=".6" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-20 20C60-22 146 106 320 12L320 60C146 66 60 38-20 68Z"
        fill={`url(#${id})`}
        opacity=".12"
      />
      {Array.from({ length: 9 }, (_, index) => (
        <path
          key={index}
          d={`M -20 ${20 + index * 7} C 60 ${-22 + index * 8}, 146 ${106 - index * 5}, 320 ${12 + index * 6}`}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth=".7"
          opacity={0.12 + index * 0.018}
        />
      ))}
    </svg>
  );
}
