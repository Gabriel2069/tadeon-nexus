import { useEffect, useRef, useState } from "react";
import {
  BedDouble,
  Cog,
  Images,
  LayoutDashboard,
  LibraryBig,
  Pin,
  Radio,
  Scale,
  ScrollText,
  Search,
  Skull,
  Swords,
  Users,
  Waves,
} from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import "@/styles/workspace-polish.css";

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

const tabs: Array<{ value: MasterTab; label: string; icon: typeof LayoutDashboard; feature?: "assets" }> = [
  { value: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { value: "session", label: "Sessão Ativa", icon: Radio },
  { value: "scenes", label: "Cenas", icon: ScrollText },
  { value: "initiative", label: "Iniciativa", icon: Swords },
  { value: "npcs-v2", label: "NPCs", icon: Users },
  { value: "threats", label: "Ameaças", icon: Skull },
  { value: "investigation", label: "Investigação", icon: Search },
  { value: "interludes", label: "Interlúdios", icon: BedDouble },
  { value: "folds", label: "Dobras", icon: Waves },
  { value: "balance", label: "Balanço", icon: Scale },
  { value: "catalog", label: "Acervo", icon: LibraryBig },
  { value: "assets", label: "Arquivos", icon: Images, feature: "assets" },
  { value: "pinned", label: "Fichas", icon: Pin },
  { value: "notes", label: "Notas", icon: ScrollText },
  { value: "data", label: "Dados & Fórmulas", icon: Cog },
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

export function MasterPanelNavigation({ showAssets = false }: { showAssets?: boolean }) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [fixed, setFixed] = useState(false);
  const [fixedTop, setFixedTop] = useState(0);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const slot = slotRef.current;
      if (!slot) return;
      const top = shellHeaderBottom();
      const nextFixed = slot.getBoundingClientRect().top <= top;
      setFixedTop((current) => (current === top ? current : top));
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

  return (
    <div ref={slotRef} className="tadeon-master-navigation-slot" aria-label="Navegação fixa do Painel do Mestre">
      <div
        className="tadeon-master-navigation"
        data-fixed={fixed ? "true" : "false"}
        style={fixed ? { top: fixedTop } : undefined}
      >
        <div className="tadeon-master-navigation__scroller overflow-x-auto overscroll-x-contain">
          <TabsList className="h-auto min-w-max justify-start gap-1 bg-card/60 p-1 lg:min-w-0 lg:flex-wrap" aria-label="Áreas de condução do mestre">
            {groups.map((group) => {
              const groupTabs = tabs.filter((tab) => group.values.includes(tab.value) && (tab.feature !== "assets" || showAssets));
              return (
                <div className="tadeon-master-navigation__group" key={group.label} role="presentation" data-master-group={group.label.toLocaleLowerCase("pt-BR")}>
                  <span className="tadeon-master-navigation__label">{group.label}</span>
                  <div className="flex gap-1" role="presentation">
                    {groupTabs.map(({ value, label, icon: Icon }) => (
                      <TabsTrigger key={value} value={value} data-master-tab={value} title={`${group.label} · ${label}`} className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Icon className="h-3.5 w-3.5" />{label}
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
  );
}
