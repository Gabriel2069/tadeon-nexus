import type { SVGProps } from "react";
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

export function ThreadField({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 360"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    >
      <path
        d="M-40 265C156 71 292 330 502 150S865 36 1240 198"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".28"
      />
      <path
        d="M-20 304C183 130 357 312 557 172S912 75 1230 260"
        fill="none"
        stroke="currentColor"
        strokeWidth=".8"
        opacity=".18"
      />
      <path
        d="M86-18C266 102 364 82 502 150c166 82 241 114 471 58"
        fill="none"
        stroke="currentColor"
        strokeWidth=".7"
        opacity=".13"
      />
    </svg>
  );
}
