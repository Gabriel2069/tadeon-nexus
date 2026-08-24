import type { SVGProps } from "react";
import {
  CloudOff,
  Home,
  LibraryBig,
  Users,
} from "lucide-react";

export type AppSectionSymbol =
  | "dashboard"
  | "nexus"
  | "tabletop"
  | "master"
  | "users"
  | "tools"
  | "offline";

export function MasterSigil({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="8.25" strokeDasharray="9 3.4 2.2 4.3" opacity="0.46" />
      <path d="M12 2.8v4.1M12 17.1v4.1M2.8 12h4.1M17.1 12h4.1" opacity="0.62" />
      <path d="m8.55 12 3.45-3.45L15.45 12 12 15.45 8.55 12Z" />
      <path d="M6.05 6.35 9.6 9.6M17.95 6.35 14.4 9.6M6.05 17.65l3.55-3.25M17.95 17.65l-3.55-3.25" opacity="0.72" />
      <circle cx="6.05" cy="6.35" r="0.85" />
      <circle cx="17.95" cy="6.35" r="0.85" />
      <circle cx="6.05" cy="17.65" r="0.85" />
      <circle cx="17.95" cy="17.65" r="0.85" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BackupSigil({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M21 8a2 2 0 0 0-2-2h-2V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2H5a2 2 0 0 0-2 2v11a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3Z" />
      <path d="M9 6h6M8 12h8M8 16h5" />
    </svg>
  );
}

/** Exact vector identity used by /favicons/tabletop.svg. */
export function TabletopSigil({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M18 28 38 20l20 8 20-8v48l-20 8-20-8-20 8Z" opacity="0.7" />
      <path d="M38 20v48M58 28v48" opacity="0.5" />
      <path d="M48 18c-11 0-19 8-19 19 0 13 13 25 17 28a3 3 0 0 0 4 0c4-3 17-15 17-28 0-11-8-19-19-19Z" />
      <circle cx="48" cy="37" r="6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SectionSymbol({
  section,
  className,
  ...props
}: SVGProps<SVGSVGElement> & { section: AppSectionSymbol }) {
  if (section === "master") return <MasterSigil className={className} {...props} />;
  if (section === "nexus") return <LibraryBig className={className} {...props} />;
  if (section === "tabletop") return <TabletopSigil className={className} {...props} />;
  if (section === "users") return <Users className={className} {...props} />;
  if (section === "tools") return <BackupSigil className={className} {...props} />;
  if (section === "offline") return <CloudOff className={className} {...props} />;
  return <Home className={className} {...props} />;
}

export function SectionHeroMark({ section }: { section: AppSectionSymbol }) {
  return (
    <span className="tadeon-section-hero-mark" data-section-symbol={section} aria-hidden="true">
      <SectionSymbol section={section} className="tadeon-section-hero-mark__icon" />
      <span className="tadeon-section-hero-mark__orbit tadeon-section-hero-mark__orbit--outer" />
      <span className="tadeon-section-hero-mark__orbit tadeon-section-hero-mark__orbit--inner" />
    </span>
  );
}
