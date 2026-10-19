import { useId, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { FabricFilaments } from "@/components/fabric-filaments";
import { SectionSymbol, type AppSectionSymbol } from "@/components/section-symbols";
import { useMaterialLight } from "@/lib/use-material-light";
import { cn } from "@/lib/utils";

/** One anatomy for route identity. Routes own data, actions and optional context. */
export function PageHeader({
  section,
  eyebrow,
  title,
  description,
  actions,
  children,
  mark,
  headingLevel = 1,
  className,
}: {
  section: AppSectionSymbol | "sheet";
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  mark?: ReactNode;
  headingLevel?: 1 | 2;
  className?: string;
}) {
  const titleId = useId();
  const light = useMaterialLight<HTMLElement>();
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <header
      className={cn("tadeon-page-header", className)}
      data-page-header={section}
      data-material-surface="page-header"
      aria-labelledby={titleId}
      onPointerMove={light.onPointerMove}
      onPointerLeave={light.onPointerLeave}
    >
      <FabricFilaments className="tadeon-page-header__fabric" />
      <div className="tadeon-page-header__main">
        <span className="tadeon-page-header__mark" aria-hidden="true">
          {mark ?? (section === "sheet" ? <BrandMark /> : <SectionSymbol section={section} />)}
        </span>
        <div className="tadeon-page-header__identity">
          <p className="tadeon-page-header__eyebrow">{eyebrow}</p>
          <Heading id={titleId} className="tadeon-page-header__title">
            {title}
          </Heading>
          {description && <div className="tadeon-page-header__description">{description}</div>}
        </div>
        {actions && <div className="tadeon-page-header__actions">{actions}</div>}
      </div>
      {children && <div className="tadeon-page-header__context">{children}</div>}
    </header>
  );
}
