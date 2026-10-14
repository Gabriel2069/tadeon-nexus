/** Original vector strands shared by Fio-Mestre surfaces; decorative and inert. */
export function FabricFilaments({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 300 100" aria-hidden="true" focusable="false">
      {Array.from({ length: 9 }, (_, index) => (
        <path
          key={index}
          d={`M -20 ${20 + index * 7} C 60 ${-22 + index * 8}, 146 ${106 - index * 5}, 320 ${12 + index * 6}`}
          fill="none"
          stroke="currentColor"
          strokeWidth=".7"
          opacity={0.12 + index * 0.018}
        />
      ))}
    </svg>
  );
}
