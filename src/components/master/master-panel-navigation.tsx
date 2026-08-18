import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
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
import "@/styles/workspace-polish.css";
import "@/styles/master-panel-navigation-fit-185.css";

export const MASTER_TAB_VALUES = [
  "dashboard",
  "session",
  "scenes",
  "initiative",
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
  { label: "Condução", values: ["dashboard", "session", "scenes", "initiative"] },
  { label: "Elenco", values: ["npcs-v2", "threats", "investigation"] },
  { label: "Ritmo", values: ["interludes", "folds", "balance"] },
  { label: "Arquivo", values: ["catalog", "assets", "pinned", "notes", "data"] },
];

function shellHeaderBottom() {
  const header =
    window.innerWidth < 768
      ? document.querySelector<HTMLElement>(".tadeon-mobile-header")
      : document.querySelector<HTMLElement>(".tadeon-desktop-toolbar");
  return Math.max(0, Math.round(header?.getBoundingClientRect().bottom ?? 0));
}

interface HeroPortalState {
  host: HTMLElement;
  tab: MasterTab;
  Icon: LucideIcon;
}

export function MasterPanelNavigation({ showAssets = false }: { showAssets?: boolean }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(false);
  const [heroPortal, setHeroPortal] = useState<HeroPortalState | null>(null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const slot = slotRef.current;
      if (!slot) return;
      const top = shellHeaderBottom();
      slot.style.setProperty("--tadeon-master-fixed-top", `${top}px`);
      const nextFixed = slot.getBoundingClientRect().top <= top;
      setFixed((current) => (current === nextFixed ? current : nextFixed));
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    let frame = 0;

    const syncIdentity = () => {
      frame = 0;
      const active = slot.querySelector<HTMLElement>("[data-master-tab][data-state='active']");
      const value = active?.dataset.masterTab as MasterTab | undefined;
      const meta = MASTER_TAB_META.find((item) => item.value === value) ?? MASTER_TAB_META[0];
      const host = document.querySelector<HTMLElement>(".tadeon-master-commandbar__glow");
      if (!host) return;
      setHeroPortal((current) =>
        current?.host === host && current.tab === meta.value
          ? current
          : { host, tab: meta.value, Icon: meta.icon },
      );
    };

    const scheduleIdentity = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncIdentity);
    };

    const observer = new MutationObserver(scheduleIdentity);
    observer.observe(slot, {
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    scheduleIdentity();

    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [showAssets]);

  return (
    <>
      <div
        ref={slotRef}
        className="tadeon-master-navigation-slot"
        aria-label="Navegação fixa do Painel do Mestre"
      >
        <div className="tadeon-master-navigation" data-fixed={fixed ? "true" : "false"}>
          <div className="tadeon-master-navigation__scroller">
            <div className="tadeon-master-navigation__rail overflow-x-auto overscroll-x-contain">
              <TabsList
                className="h-auto min-w-max justify-start gap-1 bg-card/60 p-1 lg:min-w-0 lg:flex-wrap"
                aria-label="Áreas de condução do mestre"
              >
                {groups.map((group) => {
                  const groupTabs = MASTER_TAB_META.filter(
                    (tab) =>
                      group.values.includes(tab.value) && (tab.feature !== "assets" || showAssets),
                  );
                  return (
                    <div
                      className="tadeon-master-navigation__group"
                      key={group.label}
                      role="presentation"
                      data-master-group={group.label.toLocaleLowerCase("pt-BR")}
                    >
                      <span className="tadeon-master-navigation__label">{group.label}</span>
                      <div className="flex gap-1" role="presentation">
                        {groupTabs.map(({ value, label, icon: Icon }) => (
                          <TabsTrigger
                            key={value}
                            value={value}
                            data-master-tab={value}
                            title={`${group.label} · ${label}`}
                            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </TabsTrigger>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </TabsList>
            </div>
          </div>
        </div>
      </div>
      {heroPortal &&
        createPortal(
          <span
            className="tadeon-master-commandbar__sigil-stack"
            data-master-head-tab={heroPortal.tab}
            aria-hidden="true"
          >
            <MasterSigil className="tadeon-master-commandbar__master-sigil" />
            <heroPortal.Icon className="tadeon-master-commandbar__active-icon" />
          </span>,
          heroPortal.host,
        )}
    </>
  );
}
