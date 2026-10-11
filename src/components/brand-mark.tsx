import { useId, type SVGProps } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  ...props
}: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={cn("overflow-visible", className)}
      {...props}
    >
      <path
        d="M75 20.5A34 34 0 1 1 38.5 14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity=".9"
      />
      <path
        d="M18 63C31 51 38 50 49 49c12-1 18-8 28-22"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity=".72"
      />
      <path
        d="M15 45c15 9 25 10 35 5 12-6 20-7 33-5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity=".55"
      />
      <path
        d="M26 19c8 17 13 24 24 31 10 7 16 14 19 29"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity=".38"
      />
      <circle cx="50" cy="50" r="4.75" fill="currentColor" />
      <circle cx="50" cy="50" r="9.5" stroke="currentColor" strokeWidth="1" opacity=".45" />
    </svg>
  );
}

export function ThreadField({
  className = "",
  variant = "ribbon",
}: {
  className?: string;
  variant?: "ribbon" | "backdrop";
}) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={cn(
        "tadeon-thread-field pointer-events-none absolute inset-0 h-full w-full",
        className,
      )}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1200" y2="800" gradientUnits="userSpaceOnUse">
          <stop stopColor="#716b7b" />
          <stop offset=".35" stopColor="#e9e3d5" />
          <stop offset=".62" stopColor="#b7814d" />
          <stop offset="1" stopColor="#4f6e5d" />
        </linearGradient>
      </defs>
      <g fill="none" stroke={`url(#${id})`} strokeWidth={variant === "backdrop" ? ".65" : ".9"}>
        {Array.from({ length: 32 }, (_, i) => (
          <path
            key={i}
            opacity={0.12 + (i % 7) * 0.026}
            d={`M-100 ${110 + i * 5}C240 ${-180 + i * 9} 380 ${540 - i * 5} 610 ${260 + i * 4}S940 ${90 + i * 5} 1300 ${350 + i * 7}`}
          />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <path
            key={`weft-${i}`}
            opacity=".12"
            d={`M${60 + i * 18} -90C${560 + i * 9} 110 ${190 + i * 14} 460 ${880 + i * 11} 890`}
          />
        ))}
      </g>
    </svg>
  );
}
