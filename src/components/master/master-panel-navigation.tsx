import { useEffect, useRef } from "react";
import {
  Activity,
  BedDouble,
  BookOpenCheck,
  BrainCircuit,
  CircleDot,
  Database,
  Gauge,
  Images,
  ListChecks,
  Map,
  Pin,
  Radio,
  ShieldAlert,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MasterSigil } from "@/components/section-symbols";
import "@/styles/workspace.css";
import "@/styles/master-panel-navigation.css";
export const MASTER_TAB_VALUES = [
  "dashboard",
  "session",
  "scenes",
  "initiative",
  "rules",
  "npcs-v2",
  "threats",
  "investigation",
  "interludes",
  "folds",
  "balance",
  "catalog",
  "assets",
  "pinned",
  "notes",
  "data",
] as const;

export type MasterTab = (typeof MASTER_TAB_VALUES)[number];

export interface MasterTabMeta {
  value: MasterTab;
  label: string;
  icon: LucideIcon;
  feature?: "assets";
}

export const MASTER_TAB_META: MasterTabMeta[] = [
  { value: "dashboard", label: "Visão Geral", icon: Activity },
  { value: "session", label: "Sessão Ativa", icon: Radio },
  { value: "scenes", label: "Cenas", icon: Map },
  { value: "initiative", label: "Iniciativa", icon: ListChecks },
  { value: "rules", label: "Regras TdV II", icon: BookOpenCheck },
  { value: "npcs-v2", label: "NPCs", icon: Users },
  { value: "threats", label: "Ameaças", icon: ShieldAlert },
  { value: "investigation", label: "Investigação", icon: BrainCircuit },
  { value: "interludes", label: "Interlúdios", icon: BedDouble },
  { value: "folds", label: "Dobras", icon: CircleDot },
  { value: "balance", label: "Balanço", icon: Gauge },
  { value: "catalog", label: "Acervo", icon: BookOpenCheck },
  { value: "assets", label: "Arquivos", icon: Images, feature: "assets" },
  { value: "pinned", label: "Fichas", icon: Pin },
  { value: "notes", label: "Notas", icon: StickyNote },
  { value: "data", label: "Dados & Fórmulas", icon: Database },
];

const groups: Array<{ label: string; values: MasterTab[] }> = [
  { label: "Condução", values: ["dashboard", "session", "scenes", "initiative", "rules"] },
  { label: "Elenco", values: ["npcs-v2", "threats", "investigation"] },
  { label: "Ritmo", values: ["interludes", "folds", "balance"] },
  { label: "Arquivo", values: ["catalog", "assets", "pinned", "notes", "data"] },
];

/** Active identity comes from the same controlled value as the panel. */
export function MasterPanelIdentity({ activeTab }: { activeTab: MasterTab }) {
  const Icon = MASTER_TAB_META.find((tab) => tab.value === activeTab)?.icon ?? Activity;
  return (
    <span className="tadeon-page-header__sigil" data-master-head-tab={activeTab} aria-hidden="true">
      <MasterSigil className="tadeon-page-header__master-sigil" />
      <Icon className="tadeon-page-header__active-icon" />
    </span>
  );
}

export function MasterPanelNavigation({
  showAssets = false,
  activeTab,
  onNavigate,
}: {
  showAssets?: boolean;
  activeTab: MasterTab;
  onNavigate: (tab: MasterTab) => void;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const current = MASTER_TAB_META.find((tab) => tab.value === activeTab) ?? MASTER_TAB_META[0];
  useEffect(() => {
    const measure = () => {
      const header = document.querySelector<HTMLElement>(
        window.innerWidth < 768 ? ".tadeon-mobile-header" : ".tadeon-desktop-toolbar",
      );
      slotRef.current?.style.setProperty(
        "--tadeon-master-fixed-top",
        `${Math.max(0, header?.getBoundingClientRect().bottom ?? 0) + 8}px`,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    document
      .querySelectorAll(".tadeon-mobile-header, .tadeon-desktop-toolbar")
      .forEach((header) => observer.observe(header));
    window.addEventListener("resize", measure, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  useEffect(() => {
    const rail = railRef.current;
    const trigger = rail?.querySelector<HTMLElement>(`[data-master-tab="${activeTab}"]`);
    if (!rail || !trigger) return;
    const bounds = rail.getBoundingClientRect(),
      target = trigger.getBoundingClientRect();
    // Move only the horizontal rail; never scroll the page or steal keyboard focus.
    if (target.left < bounds.left || target.right > bounds.right)
      rail.scrollLeft += target.left - bounds.left - (bounds.width - target.width) / 2;
  }, [activeTab]);
  return (
    <div ref={slotRef} className="tadeon-master-navigation-slot">
      <div className="tadeon-master-navigation">
        <div className="tadeon-master-navigation__scroller">
          <label className="tadeon-master-navigation__jump">
            <span>Ferramenta em foco</span>
            <select
              aria-label="Ir para uma ferramenta do mestre"
              value={activeTab}
              onChange={(event) => onNavigate(event.target.value as MasterTab)}
            >
              {groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {MASTER_TAB_META.filter(
                    (tab) =>
                      group.values.includes(tab.value) && (tab.feature !== "assets" || showAssets),
                  ).map((tab) => (
                    <option key={tab.value} value={tab.value}>
                      {tab.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <div ref={railRef} className="tadeon-master-navigation__rail">
            <TabsList aria-label="Ferramentas do mestre" className="tadeon-master-navigation__tabs">
              {groups.map((group) => (
                <div
                  className="tadeon-master-navigation__group"
                  key={group.label}
                  role="presentation"
                >
                  <span className="tadeon-master-navigation__label">{group.label}</span>
                  <div className="tadeon-master-navigation__items" role="presentation">
                    {MASTER_TAB_META.filter(
                      (tab) =>
                        group.values.includes(tab.value) &&
                        (tab.feature !== "assets" || showAssets),
                    ).map(({ value, label, icon: Icon }) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        data-master-tab={value}
                        title={`${group.label} · ${label}`}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {label}
                      </TabsTrigger>
                    ))}
                  </div>
                </div>
              ))}
            </TabsList>
          </div>
          <p className="tadeon-master-navigation__context">
            <current.icon className="h-4 w-4" aria-hidden="true" />
            <span>{current.label}</span>
            <span> · alterações reunidas no botão Salvar painel</span>
          </p>
        </div>
      </div>
    </div>
  );
}
