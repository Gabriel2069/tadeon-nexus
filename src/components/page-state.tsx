import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark, ThreadField } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

interface PageStateProps {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PageState({
  icon: Icon,
  eyebrow = "Arquivo de continuidade",
  title,
  description,
  action,
  className,
}: PageStateProps) {
  return (
    <div
      className={cn(
        "tadeon-page flex min-h-[65vh] items-center justify-center",
        className,
      )}
    >
      <section className="tadeon-state-panel tadeon-surface relative w-full max-w-xl rounded-2xl px-6 py-9 text-center sm:px-9 sm:py-11">
        <ThreadField className="text-primary" />
        <div className="relative z-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-primary/20 bg-primary/7 text-primary shadow-[0_18px_45px_-28px_var(--primary)]">
            <Icon className="h-6 w-6" />
          </div>
          <p className="tadeon-eyebrow mt-5">{eyebrow}</p>
          <h1 className="mt-2 font-cinzel text-2xl font-semibold leading-tight sm:text-3xl">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
            {description}
          </p>
          {action && (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {action}
            </div>
          )}
        </div>
        <BrandMark className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 text-primary/[0.035]" />
      </section>
    </div>
  );
}
