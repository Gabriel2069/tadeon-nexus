import {
  BedDouble,
  LibraryBig,
  Cog,
  LayoutDashboard,
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
  "pinned",
  "notes",
  "data",
] as const;

export type MasterTab = (typeof MASTER_TAB_VALUES)[number];

const tabs: Array<{
  value: MasterTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
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
  { value: "pinned", label: "Fichas", icon: Pin },
  { value: "notes", label: "Notas", icon: ScrollText },
  { value: "data", label: "Dados & Fórmulas", icon: Cog },
];

export function MasterPanelNavigation() {
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-1 md:-mx-6 md:px-6">
      <TabsList className="h-auto min-w-max justify-start gap-1 bg-card/60 p-1 lg:min-w-0 lg:flex-wrap">
        {tabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="gap-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}
